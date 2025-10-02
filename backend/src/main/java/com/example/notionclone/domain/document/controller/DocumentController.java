package com.example.notionclone.domain.document.controller;

import com.example.notionclone.domain.document.dto.CreateDocumentRequest;
import com.example.notionclone.domain.document.dto.DocumentOrderRequest;
import com.example.notionclone.domain.document.dto.DocumentResponse;
import com.example.notionclone.domain.document.dto.DocumentListResponse;
import com.example.notionclone.domain.document.dto.UpdateDocumentRequest;
import com.example.notionclone.domain.document.entity.Document;
import com.example.notionclone.domain.document.entity.DocumentProperty;
import com.example.notionclone.domain.document.repository.DocumentRepository;
import com.example.notionclone.domain.document.dto.InviteRequest;
import com.example.notionclone.domain.document.service.DocumentService;
import com.example.notionclone.domain.user.entity.User;
import com.example.notionclone.domain.user.repository.UserRepository;
import com.example.notionclone.exception.ResourceNotFoundException;
import com.example.notionclone.security.CurrentUser;
import com.example.notionclone.security.UserPrincipal;
import com.example.notionclone.domain.notification.service.NotificationService;
import com.example.notionclone.domain.notification.entity.NotificationType;
import com.example.notionclone.domain.permission.service.PermissionService;
import com.example.notionclone.domain.permission.entity.PermissionType;
import com.example.notionclone.domain.document.dto.DocumentPropertyDto;
import com.example.notionclone.domain.document.dto.DocumentPropertyValueDto;
import com.example.notionclone.domain.document.service.DocumentPropertyService;
import com.example.notionclone.domain.document.service.DocumentPropertyValueService;
import com.example.notionclone.domain.document.entity.DocumentPropertyTagOption;
import com.example.notionclone.domain.document.dto.AddPropertyRequest;
import com.example.notionclone.domain.document.dto.AddOrUpdateValueRequest;
import com.example.notionclone.domain.document.dto.AddOrUpdateValueResponse;
import com.example.notionclone.domain.document.dto.UpdatePropertyRequest;
import com.example.notionclone.domain.document.dto.WidthUpdateRequest;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/workspaces/{workspaceId}/documents")
@RequiredArgsConstructor
public class DocumentController {
    private final DocumentService documentService;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final PermissionService permissionService;
    private final DocumentRepository documentRepository;
    private final DocumentPropertyService documentPropertyService;
    private final DocumentPropertyValueService documentPropertyValueService;

    @GetMapping
    public ResponseEntity<List<DocumentResponse>> getDocumentsByWorkspace(
            @CurrentUser UserPrincipal userPrincipal,
            @PathVariable Long workspaceId) {
        log.debug("Get documents request for workspace: {} by user: {}", workspaceId, userPrincipal.getId());
        User user = userRepository.findById(userPrincipal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userPrincipal.getId()));
        return ResponseEntity.ok(documentService.getDocumentsByWorkspace(workspaceId, user));
    }

    /**
     * DocumentList 조회용 경량 API (페이지네이션 지원)
     * content, properties, permissions 등 불필요한 데이터를 제거하여 성능을 최적화합니다.
     * 페이지네이션 파라미터가 없으면 전체 목록을 반환합니다.
     */
    @GetMapping("/list")
    public ResponseEntity<?> getDocumentListByWorkspace(
            @CurrentUser UserPrincipal userPrincipal,
            @PathVariable Long workspaceId,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(defaultValue = "sortOrder,asc") String sort) {
        
        log.debug("Get document list request for workspace: {} by user: {}, page: {}, size: {}", 
                workspaceId, userPrincipal.getId(), page, size);
        
        User user = userRepository.findById(userPrincipal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userPrincipal.getId()));
        
        // 페이지네이션 파라미터가 있으면 페이지네이션 적용
        if (page != null && size != null) {
            Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "sortOrder"));
            Page<DocumentListResponse> documents = documentService.getDocumentsByWorkspacePaginated(workspaceId, user, pageable);
            return ResponseEntity.ok(documents);
        }
        
        // 페이지네이션 파라미터가 없으면 전체 목록 반환
        List<DocumentListResponse> documents = documentService.getDocumentListByWorkspace(workspaceId, user);
        return ResponseEntity.ok(documents);
    }

    /**
     * 필드 선택을 지원하는 DocumentList API
     * 필요한 필드만 선택하여 네트워크 트래픽을 최적화합니다.
     */
    @GetMapping(params = "fields")
    public ResponseEntity<List<DocumentListResponse>> getDocumentsByWorkspaceWithFields(
            @CurrentUser UserPrincipal userPrincipal,
            @PathVariable Long workspaceId,
            @RequestParam String fields) {
        
        log.debug("Get documents with fields request for workspace: {} by user: {}, fields: {}", 
                workspaceId, userPrincipal.getId(), fields);
        
        User user = userRepository.findById(userPrincipal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userPrincipal.getId()));
        
        Set<String> requestedFields = Set.of(fields.split(","));
        List<DocumentListResponse> documents = documentService.getDocumentsByWorkspaceWithFields(workspaceId, user, requestedFields);
        
        return ResponseEntity.ok(documents);
    }

    /**
     * 무한 스크롤을 지원하는 DocumentList API
     * 커서 기반 페이지네이션으로 성능을 최적화합니다.
     */
    @GetMapping("/infinite")
    public ResponseEntity<Page<DocumentListResponse>> getDocumentsInfinite(
            @CurrentUser UserPrincipal userPrincipal,
            @PathVariable Long workspaceId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String cursor) {
        
        log.debug("Get infinite documents request for workspace: {} by user: {}, page: {}, size: {}, cursor: {}", 
                workspaceId, userPrincipal.getId(), page, size, cursor);
        
        User user = userRepository.findById(userPrincipal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userPrincipal.getId()));
        
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "sortOrder"));
        Page<DocumentListResponse> documents = documentService.getDocumentsInfinite(workspaceId, user, pageable, cursor);
        
        return ResponseEntity.ok(documents);
    }

    @GetMapping("/{id}")
    public ResponseEntity<DocumentResponse> getDocument(
            @CurrentUser UserPrincipal userPrincipal,
            @PathVariable Long workspaceId,
            @PathVariable Long id) {
        log.debug("Get document request for id: {} in workspace: {} by user: {}", id, workspaceId, userPrincipal.getId());
        User user = userRepository.findById(userPrincipal.getId())
            .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userPrincipal.getId()));
        return ResponseEntity.ok(documentService.getDocument(id, user));
    }

    @GetMapping("/no-workspace")
    public ResponseEntity<List<DocumentResponse>> getDocumentsWithNoWorkspace() {
        return ResponseEntity.ok(documentService.getDocumentsWithNoWorkspace());
    }

    @PostMapping
    public ResponseEntity<DocumentResponse> createDocument(
            @CurrentUser UserPrincipal userPrincipal,
            @PathVariable Long workspaceId,
            @RequestBody CreateDocumentRequest request) {
        log.debug("Create document request in workspace: {} by user: {}", workspaceId, userPrincipal.getId());
        return ResponseEntity.ok(documentService.createDocument(
                workspaceId,
                request,
                userPrincipal.getEmail()
        ));
    }

    @PutMapping("/{id}")
    public ResponseEntity<DocumentResponse> updateDocument(
            @CurrentUser UserPrincipal userPrincipal,
            @PathVariable Long workspaceId,
            @PathVariable Long id,
            @RequestBody UpdateDocumentRequest request) {
        log.debug("Update document request for id: {} in workspace: {} by user: {}", id, workspaceId, userPrincipal.getId());
        return ResponseEntity.ok(documentService.updateDocument(
                workspaceId,
                id,
                request,
                userPrincipal.getEmail()
        ));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDocument(
            @CurrentUser UserPrincipal userPrincipal,
            @PathVariable Long workspaceId,
            @PathVariable Long id) {
        log.debug("Delete document request for id: {} in workspace: {} by user: {}", id, workspaceId, userPrincipal.getId());
        User user = userRepository.findById(userPrincipal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userPrincipal.getId()));
        documentService.deleteDocument(id, user);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/order")
    public ResponseEntity<Void> updateOrder(
            @PathVariable Long workspaceId,
            @RequestBody DocumentOrderRequest request
    ) {
        documentService.updateDocumentOrder(workspaceId, request.getDocumentIds());
        return ResponseEntity.ok().build();
    }

    // --- Trash (휴지통) API ---
    @GetMapping("/trash")
    public ResponseEntity<List<DocumentResponse>> getTrashedDocuments(
            @PathVariable Long workspaceId) {
        return ResponseEntity.ok(documentService.getTrashedDocuments(workspaceId));
    }

    @PatchMapping("/trash/{docId}/restore")
    public ResponseEntity<Void> restoreDocument(
            @PathVariable Long workspaceId,
            @PathVariable Long docId) {
        documentService.restoreDocument(workspaceId, docId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/trash/{docId}/permanent")
    public ResponseEntity<Void> deleteDocumentPermanently(
            @PathVariable Long workspaceId,
            @PathVariable Long docId) {
        documentService.deleteDocumentPermanently(workspaceId, docId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/trash")
    public ResponseEntity<Void> emptyTrash(
            @PathVariable Long workspaceId) {
        documentService.emptyTrash(workspaceId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{documentId}/invite")
    public ResponseEntity<Void> inviteToDocument(
            @CurrentUser UserPrincipal userPrincipal,
            @PathVariable Long documentId,
            @RequestBody InviteRequest request) {
        User inviter = userRepository.findById(userPrincipal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userPrincipal.getId()));
        User invitee = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + request.getEmail()));
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + documentId));

        // 1. Permission 생성
        permissionService.invite(invitee, document, PermissionType.READ);

        // 2. Notification 생성
        String message = String.format("%s님이 '%s' 문서에 초대했습니다.", inviter.getName(), document.getTitle());
        String payload = String.format("{\"documentId\":%d}", documentId);    
        notificationService.sendInviteNotification(invitee, NotificationType.INVITE, message, payload);

        return ResponseEntity.ok().build();
    }

    @GetMapping("/accessible")
    public ResponseEntity<List<DocumentResponse>> getAccessibleDocuments(
            @CurrentUser UserPrincipal userPrincipal,
            @PathVariable Long workspaceId) {
        User user = userRepository.findById(userPrincipal.getId())
            .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userPrincipal.getId()));
        return ResponseEntity.ok(documentService.getAccessibleDocuments(workspaceId, user));
    }

    @GetMapping("/parent")
    public ResponseEntity<List<DocumentResponse>> getRootDocuments(
            @CurrentUser UserPrincipal userPrincipal) {
        User user = userRepository.findById(userPrincipal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userPrincipal.getId()));
        // parentId == null인 문서만 조회
        return ResponseEntity.ok(documentService.getChildDocuments(null,user));
    }

    @GetMapping("/parent/{parentId}")
    public ResponseEntity<List<DocumentResponse>> getChildDocuments(
            @CurrentUser UserPrincipal userPrincipal,
            @PathVariable Long parentId) {
        User user = userRepository.findById(userPrincipal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userPrincipal.getId()));
        return ResponseEntity.ok(documentService.getChildDocuments(parentId, user));
    }

    @PatchMapping("/{parentId}/children/order")
    public ResponseEntity<Void> updateChildOrder(
            @CurrentUser UserPrincipal userPrincipal,
            @PathVariable Long workspaceId,
            @PathVariable Long parentId,
            @RequestBody List<Long> documentIds
    ) {
        // 권한 체크: parentId 문서를 기준으로 OWNER 또는 ACCEPTED 권한 필요
        Document parent = documentRepository.findById(parentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + parentId));
        User user = userRepository.findById(userPrincipal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userPrincipal.getId()));
        boolean isOwner = parent.getUser().getId().equals(user.getId());
        boolean hasAcceptedPermission = permissionService.hasAcceptedPermission(user, parent);
        if (!isOwner && !hasAcceptedPermission) {
            throw new org.springframework.security.access.AccessDeniedException("No permission to update children order for this document.");
        }
        documentService.updateChildOrder(parentId, documentIds, user.getId());
        return ResponseEntity.ok().build();
    }

    // 문서 속성 추가
    @PostMapping("/{documentId}/properties")
    public DocumentPropertyDto addProperty(
            @CurrentUser UserPrincipal userPrincipal,
            @PathVariable Long documentId,
            @RequestBody AddPropertyRequest request) {
        // 사용자 정보 조회
        User user = userRepository.findById(userPrincipal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userPrincipal.getId()));
        // 문서 정보 조회
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + documentId));
        // 권한 체크 (소유자 또는 ACCEPTED 권한)
        boolean isOwner = document.getUser().getId().equals(user.getId());
        boolean hasAcceptedPermission = permissionService.hasAcceptedPermission(user, document);
        if (!isOwner && !hasAcceptedPermission) {
            throw new org.springframework.security.access.AccessDeniedException("No permission to add property to this document.");
        }
        return DocumentPropertyDto.builder()
                .id(documentPropertyService.addProperty(documentId, request.getName(), request.getType(), request.getSortOrder()).getId())
                .name(request.getName())
                .type(request.getType())
                .sortOrder(request.getSortOrder())
                .build();
    }

    // 문서 속성 목록 조회
    @GetMapping("/{documentId}/properties")
    public List<DocumentPropertyDto> getProperties(@PathVariable Long documentId) {
        return documentPropertyService.getPropertiesByDocument(documentId);
    }

    // 문서 속성 삭제
    @DeleteMapping("/properties/{propertyId}")
    public void deleteProperty(@PathVariable Long propertyId) {
        documentPropertyService.deleteProperty(propertyId);
    }

    // 문서 속성 수정
    @PatchMapping("/properties/{propertyId}")
    public DocumentPropertyDto updateProperty(
            @CurrentUser UserPrincipal userPrincipal,
            @PathVariable Long propertyId,
            @RequestBody UpdatePropertyRequest request) {
        DocumentProperty updatedProperty = documentPropertyService.updateProperty(userPrincipal.getId(), propertyId, request.getName());
        return DocumentPropertyDto.from(updatedProperty);
    }

    // 속성 값 추가/수정
    @PostMapping("/{documentId}/properties/{propertyId}/value")
    public AddOrUpdateValueResponse addOrUpdateValue(@PathVariable Long documentId, @PathVariable Long propertyId, @RequestBody AddOrUpdateValueRequest request) {
        var value = documentPropertyValueService.addOrUpdateValue(documentId, propertyId, request.getValue());
        // 최신 메타 합성: 문서 vs 값 중 더 최신(updatedAt/by)
        var docOpt = documentRepository.findById(documentId);
        LocalDateTime latestAt = null;
        String latestBy = null;
        if (docOpt.isPresent()) {
            var doc = docOpt.get();
            latestAt = doc.getUpdatedAt();
            latestBy = doc.getUpdatedBy();
        }
        var latestValueOpt = documentPropertyValueService.findLatestValue(documentId);
        if (latestValueOpt.isPresent()) {
            var pv = latestValueOpt.get();
            var pvAt = pv.getUpdatedAt();
            if (pvAt != null && (latestAt == null || pvAt.isAfter(latestAt))) {
                latestAt = pvAt;
                latestBy = pv.getUpdatedBy();
            }
        }
        return AddOrUpdateValueResponse.builder()
                .id(value.getId())
                .documentId(documentId)
                .propertyId(propertyId)
                .value(value.getValue())
                .updatedAt(latestAt)
                .updatedBy(latestBy)
                .build();
    }

    // 문서의 모든 속성 값 조회
    @GetMapping("/{documentId}/property-values")
    public List<DocumentPropertyValueDto> getPropertyValuesByDocument(@PathVariable Long documentId) {
        return documentPropertyValueService.getValuesByDocument(documentId).stream()
                .map(v -> DocumentPropertyValueDto.builder()
                        .id(v.getId())
                        .documentId(v.getDocument().getId())
                        .propertyId(v.getProperty().getId())
                        .value(v.getValue())
                        .build())
                .collect(Collectors.toList());
    }

    // 속성별 값 조회
    @GetMapping("/properties/{propertyId}/values")
    public List<DocumentPropertyValueDto> getPropertyValuesByProperty(@PathVariable Long propertyId) {
        return documentPropertyValueService.getValuesByProperty(propertyId).stream()
                .map(v -> DocumentPropertyValueDto.builder()
                        .id(v.getId())
                        .documentId(v.getDocument().getId())
                        .propertyId(v.getProperty().getId())
                        .value(v.getValue())
                        .build())
                .collect(Collectors.toList());
    }

    // 자식 문서들의 모든 속성 값 조회
    @GetMapping("/{parentId}/children/property-values")
    public List<DocumentPropertyValueDto> getPropertyValuesByChildDocuments(@PathVariable Long parentId) {
        return documentPropertyValueService.getValuesByChildDocuments(parentId).stream()
                .map(v -> DocumentPropertyValueDto.builder()
                        .id(v.getId())
                        .documentId(v.getDocument().getId())
                        .propertyId(v.getProperty().getId())
                        .value(v.getValue())
                        .build())
                .collect(Collectors.toList());
    }

    // --- 컬럼 너비 변경 API ---
    @PatchMapping("/{documentId}/title-width")
    public ResponseEntity<Void> updateTitleColumnWidth(
            @PathVariable Long workspaceId,
            @PathVariable Long documentId,
            @RequestBody WidthUpdateRequest request) {
        documentService.updateTitleColumnWidth(documentId, request.getWidth());
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/properties/{propertyId}/width")
    public ResponseEntity<Void> updatePropertyWidth(
            @PathVariable Long workspaceId,
            @PathVariable Long propertyId,
            @RequestBody WidthUpdateRequest request) {
        documentPropertyService.updatePropertyWidth(propertyId, request.getWidth());
        return ResponseEntity.ok().build();
    }

    // --- Tag Option API ---
    @PostMapping("/properties/{propertyId}/tag-options")
    public DocumentPropertyDto.TagOptionDto addTagOption(@PathVariable Long propertyId, @RequestBody DocumentPropertyDto.TagOptionDto request) {
        DocumentPropertyTagOption option = documentPropertyService.addTagOption(propertyId, request.getLabel(), request.getColor(), request.getSortOrder());
        return DocumentPropertyDto.TagOptionDto.from(option);
    }

    @PatchMapping("/tag-options/{optionId}")
    public DocumentPropertyDto.TagOptionDto updateTagOption(@PathVariable Long optionId, @RequestBody DocumentPropertyDto.TagOptionDto request) {
        DocumentPropertyTagOption option = documentPropertyService.updateTagOption(optionId, request.getLabel(), request.getColor(), request.getSortOrder());
        return DocumentPropertyDto.TagOptionDto.from(option);
    }

    @DeleteMapping("/tag-options/{optionId}")
    public void deleteTagOption(@PathVariable Long optionId) {
        documentPropertyService.deleteTagOption(optionId);
    }

    @GetMapping("/properties/{propertyId}/tag-options")
    public List<DocumentPropertyDto.TagOptionDto> getTagOptionsByProperty(@PathVariable Long propertyId) {
        return documentPropertyService.getTagOptionsByProperty(propertyId).stream()
            .map(DocumentPropertyDto.TagOptionDto::from)
            .collect(Collectors.toList());
    }

    // 속성 순서 업데이트
    @PatchMapping("/{documentId}/properties/order")
    public ResponseEntity<Void> updatePropertyOrder(
            @CurrentUser UserPrincipal userPrincipal,
            @PathVariable Long workspaceId,
            @PathVariable Long documentId,
            @RequestBody List<Long> propertyIds) {
        
        // 사용자 정보 조회
        User user = userRepository.findById(userPrincipal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userPrincipal.getId()));
        
        // 문서 정보 조회
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + documentId));
        
        // 권한 체크 (소유자 또는 ACCEPTED 권한)
        boolean isOwner = document.getUser().getId().equals(user.getId());
        boolean hasAcceptedPermission = permissionService.hasAcceptedPermission(user, document);
        if (!isOwner && !hasAcceptedPermission) {
            throw new org.springframework.security.access.AccessDeniedException("No permission to update property order for this document.");
        }
        
        documentPropertyService.updatePropertyOrder(documentId, propertyIds);
        return ResponseEntity.ok().build();
    }

    // 현재 정렬 순서로 자식 문서들의 sortOrder 업데이트 (소유자만 가능)
    @PostMapping("/{documentId}/children/sort-by-current")
    public ResponseEntity<Void> updateChildSortOrderByCurrentSort(
            @CurrentUser UserPrincipal userPrincipal,
            @PathVariable Long workspaceId,
            @PathVariable Long documentId,
            @RequestBody List<Long> sortedDocumentIds) {
        
        documentService.updateChildSortOrderByCurrentSort(userPrincipal.getId(), documentId, sortedDocumentIds);
        return ResponseEntity.ok().build();
    }
} 