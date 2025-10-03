package com.example.notionclone.domain.document.service;

import com.example.notionclone.domain.document.dto.DocumentResponse;
import com.example.notionclone.domain.document.dto.DocumentListResponse;
import com.example.notionclone.domain.document.entity.Document;
import com.example.notionclone.domain.document.repository.DocumentRepository;
import com.example.notionclone.domain.user.entity.User;
import com.example.notionclone.domain.workspace.entity.Workspace;
import com.example.notionclone.domain.workspace.repository.WorkspaceRepository;
import com.example.notionclone.exception.ResourceNotFoundException;
import com.example.notionclone.domain.permission.repository.PermissionRepository;
import com.example.notionclone.domain.permission.entity.Permission;
import com.example.notionclone.domain.permission.entity.PermissionStatus;
import com.example.notionclone.domain.permission.entity.PermissionType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.List;
import java.util.stream.Collectors;
import java.util.ArrayList;
import com.example.notionclone.domain.document.entity.ViewType;
import java.util.Optional;
import com.example.notionclone.domain.document.dto.CreateDocumentRequest;
import com.example.notionclone.domain.document.dto.UpdateDocumentRequest;
import com.example.notionclone.domain.permission.service.PermissionService;
import com.example.notionclone.domain.user.repository.UserRepository;
import java.util.stream.Stream;
import com.example.notionclone.domain.document.entity.DocumentProperty;
import com.example.notionclone.domain.document.dto.DocumentPropertyDto;
import com.example.notionclone.domain.document.entity.DocumentPropertyTagOption;
import com.example.notionclone.domain.document.repository.DocumentPropertyTagOptionRepository;
import com.example.notionclone.domain.document.repository.DocumentVersionRepository;
import com.example.notionclone.domain.document.repository.DocumentPropertyRepository;
import com.example.notionclone.domain.document.repository.DocumentPropertyValueRepository;
import java.time.LocalDateTime;
import java.util.Deque;
import java.util.ArrayDeque;
import java.util.Set;
import java.util.HashSet;
import java.util.Map;
import java.util.HashMap;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DocumentService {
  private final DocumentRepository documentRepository;
  private final WorkspaceRepository workspaceRepository;
  private final PermissionRepository permissionRepository;
  private final PermissionService permissionService;
  private final UserRepository userRepository;
  private final DocumentPropertyTagOptionRepository documentPropertyTagOptionRepository;
  private final DocumentVersionRepository documentVersionRepository;
  private final DocumentPropertyValueRepository documentPropertyValueRepository;
  @Autowired
  private DocumentPropertyRepository documentPropertyRepository;

  public List<DocumentResponse> getDocumentsByWorkspace(Long workspaceId, User user) {
    // 1. 사용자가 소유한 문서 조회
    List<Document> ownedDocuments = documentRepository.findByWorkspaceIdAndUserIdAndIsTrashedFalse(workspaceId,
        user.getId());

    // 2. 사용자가 공유받은 문서 ID 조회
    List<Long> sharedDocumentIds = permissionRepository.findAcceptedDocumentIdsByUserAndWorkspace(user.getId(),
        PermissionStatus.ACCEPTED, workspaceId);

    // 3. 공유받은 문서 정보 조회 및 휴지통 상태 필터링
    List<Document> sharedDocuments = documentRepository.findAllById(sharedDocumentIds).stream()
        .filter(doc -> !doc.isTrashed())
        .collect(Collectors.toList());

    // 4. 두 목록을 합치고 중복 제거
    List<Document> allDocuments = Stream.concat(ownedDocuments.stream(), sharedDocuments.stream())
        .distinct()
        .collect(Collectors.toList());

    return allDocuments.stream()
        .map(doc -> {
          boolean hasChildren = documentRepository.existsByParentIdAndIsTrashedFalse(doc.getId());
          DocumentResponse resp = DocumentResponse.fromDocumentWithPermissionsAndChildren(doc, doc.getPermissions(), hasChildren);
          return applyLatestMeta(resp, doc);
        })
        .collect(Collectors.toList());
  }

  /**
   * DocumentList 조회용 경량 메서드
   * content, properties, permissions 등 불필요한 데이터를 제거하여 성능을 최적화합니다.
   * N+1 문제를 해결하기 위해 배치 쿼리를 사용합니다.
   * 
   * @param workspaceId 워크스페이스 ID
   * @param user 사용자
   * @return DocumentListResponse 목록
   */
  public List<DocumentListResponse> getDocumentListByWorkspace(Long workspaceId, User user) {
    // 1. 사용자가 소유한 문서 조회
    List<Document> ownedDocuments = documentRepository.findByWorkspaceIdAndUserIdAndIsTrashedFalse(workspaceId,
        user.getId());

    // 2. 사용자가 공유받은 문서 ID 조회 (소유자가 소유한 문서 제외)
    List<Long> allPermissionDocumentIds = permissionRepository.findAcceptedDocumentIdsByUserAndWorkspace(user.getId(),
        PermissionStatus.ACCEPTED, workspaceId);
    
    // 소유자가 소유한 문서 ID 목록
    List<Long> ownedDocumentIds = ownedDocuments.stream().map(Document::getId).collect(Collectors.toList());
    
    // 공유받은 문서 ID = 모든 권한 문서 ID - 소유한 문서 ID
    List<Long> sharedDocumentIds = allPermissionDocumentIds.stream()
        .filter(docId -> !ownedDocumentIds.contains(docId))
        .collect(Collectors.toList());
    
    log.info("모든 권한 문서 ID 목록: {}", allPermissionDocumentIds);
    log.info("소유한 문서 ID 목록: {}", ownedDocumentIds);
    log.info("공유받은 문서 ID 목록: {}", sharedDocumentIds);
    // 3. 공유받은 문서 정보 조회 및 휴지통 상태 필터링
    List<Document> sharedDocuments = documentRepository.findAllById(sharedDocumentIds).stream()
        .filter(doc -> !doc.isTrashed())
        .collect(Collectors.toList());

    // 4. 두 목록을 합치고 중복 제거
    List<Document> allDocuments = Stream.concat(ownedDocuments.stream(), sharedDocuments.stream())
        .distinct()
        .collect(Collectors.toList());

    // 5. N+1 문제 해결: 한 번의 쿼리로 모든 hasChildren 정보 조회
    List<Long> documentIds = allDocuments.stream().map(Document::getId).collect(Collectors.toList());
    Map<Long, Boolean> hasChildrenMap = getHasChildrenMap(documentIds);

    // 6. 공유 문서 ID 집합 생성
    // 공유받은 문서는 자동으로 공유 문서
    Set<Long> sharedDocumentIdSet = new HashSet<>(sharedDocumentIds);
    
    // 소유한 문서 중에서 다른 사용자와 공유된 문서 찾기 (N+1 문제 해결을 위해 배치 쿼리 사용)
    if (!ownedDocuments.isEmpty()) {
      List<Long> sharedOwnedDocumentIds = findSharedOwnedDocuments(ownedDocumentIds, user.getId());
      sharedDocumentIdSet.addAll(sharedOwnedDocumentIds);
    }
    
    log.info("공유 문서 ID 목록: {}", sharedDocumentIdSet);
    log.info("전체 문서 ID 목록: {}", allDocuments.stream().map(Document::getId).collect(Collectors.toList()));
    
    return allDocuments.stream()
        .map(doc -> {
          boolean hasChildren = hasChildrenMap.getOrDefault(doc.getId(), false);
          boolean isShared = sharedDocumentIdSet.contains(doc.getId());
          log.info("문서 {} (제목: {}) - isShared: {}, 소유자: {}", doc.getId(), doc.getTitle(), isShared, doc.getUser().getId());
          return DocumentListResponse.fromDocument(doc, hasChildren, isShared);
        })
        .collect(Collectors.toList());
  }

  /**
   * 배치 쿼리를 사용하여 hasChildren 정보를 조회합니다.
   * 
   * @param documentIds 문서 ID 목록
   * @return 문서 ID와 hasChildren 여부의 매핑
   */
  private Map<Long, Boolean> getHasChildrenMap(List<Long> documentIds) {
    if (documentIds.isEmpty()) {
      return new HashMap<>();
    }
    
    List<Object[]> results = documentRepository.findHasChildrenByDocumentIds(documentIds);
    return results.stream()
        .collect(Collectors.toMap(
            result -> (Long) result[0],
            result -> (Boolean) result[1]
        ));
  }

  /**
   * 소유한 문서 중에서 다른 사용자와 공유된 문서 ID 목록을 조회합니다.
   * N+1 문제를 해결하기 위해 배치 쿼리를 사용합니다.
   * 
   * @param ownedDocumentIds 소유한 문서 ID 목록
   * @param ownerId 소유자 ID
   * @return 공유된 소유 문서 ID 목록
   */
  private List<Long> findSharedOwnedDocuments(List<Long> ownedDocumentIds, Long ownerId) {    
    // 소유자를 제외한 다른 사용자 권한이 있는 문서 ID 조회
    List<Long> sharedDocumentIds = permissionRepository.findDocumentIdsWithOtherUserPermissions(ownedDocumentIds, ownerId);
    return sharedDocumentIds;
  }


  public DocumentResponse getDocument(Long id, User user) {
    Document document = documentRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + id));

    boolean hasPermission = permissionRepository.existsByUserAndDocumentAndStatus(user, document,
        PermissionStatus.ACCEPTED);
    // 부모 문서 권한(혹은 소유권)으로 자식 문서 접근 허용
    boolean hasParentPermission = false;
    Document parent = document.getParent();
    if (!hasPermission && parent != null) {
      if (parent.getUser().getId().equals(user.getId())) {
        hasParentPermission = true;
      } else {
        hasParentPermission = permissionRepository.existsByUserAndDocumentAndStatus(user, parent, PermissionStatus.ACCEPTED);
      }
    }
    if (document.getUser().getId().equals(user.getId()) || hasPermission || hasParentPermission) { // 유저가 소유/직접권한/부모권한
      return buildResponseWithMergedPermissions(document);
    } else {
      throw new org.springframework.security.access.AccessDeniedException("No permission to access this document.");
    }
  }

  public List<DocumentResponse> getAllDocuments() {
    return documentRepository.findAll().stream()
        .map(doc -> {
          List<Permission> permissions = permissionRepository.findByDocument(doc);
          boolean hasChildren = documentRepository.existsByParentIdAndIsTrashedFalse(doc.getId());
          DocumentResponse resp = DocumentResponse.fromDocumentWithPermissionsAndChildren(doc, permissions, hasChildren);
          return applyLatestMeta(resp, doc);
        })
        .collect(Collectors.toList());
  }

  public List<DocumentResponse> getDocumentsWithNoWorkspace() {
    return documentRepository.findDocumentsWithNoWorkspace().stream()
        .map(doc -> {
          List<Permission> permissions = permissionRepository.findByDocument(doc);
          boolean hasChildren = documentRepository.existsByParentIdAndIsTrashedFalse(doc.getId());
          DocumentResponse resp = DocumentResponse.fromDocumentWithPermissionsAndChildren(doc, permissions, hasChildren);
          return applyLatestMeta(resp, doc);
        })
        .collect(Collectors.toList());
  }

  @Transactional
  public DocumentResponse createDocument(Long workspaceId, CreateDocumentRequest request, String creatorEmail) {
    User creator = userRepository.findByEmail(creatorEmail)
        .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + creatorEmail));
    permissionService.checkPermission(workspaceId, null, creator.getId(), PermissionType.WRITE);

    Workspace workspace = workspaceRepository.findById(workspaceId)
        .orElseThrow(() -> new ResourceNotFoundException("Workspace not found with id: " + workspaceId));

    Document parent = null;
    if (request.getParentId() != null) {
      parent = documentRepository.findById(request.getParentId())
          .orElseThrow(
              () -> new ResourceNotFoundException("Parent document not found with id: " + request.getParentId()));
    }

    Document document = Document.builder()
        .title(request.getTitle())
        .content(request.getContent())
        .workspace(workspace)
        .user(creator)
        .parent(parent)
        .viewType(request.getViewType() != null ? ViewType.valueOf(request.getViewType()) : ViewType.PAGE)
        .build();

    Document savedDocument = documentRepository.save(document);
    boolean hasChildren = documentRepository.existsByParentIdAndIsTrashedFalse(savedDocument.getId());

    // 생성자에게 자동으로 OWNER 권한 부여
    Permission ownerPermission = Permission.builder()
        .document(savedDocument)
        .user(creator)
        .permissionType(PermissionType.OWNER)
        .status(PermissionStatus.ACCEPTED)
        .build();
    permissionRepository.save(ownerPermission);

    DocumentResponse resp = DocumentResponse.fromDocumentWithPermissionsAndChildren(savedDocument, savedDocument.getPermissions(), hasChildren);
    return applyLatestMeta(resp, savedDocument);
  }

  @Transactional
  public DocumentResponse updateDocument(Long workspaceId, Long documentId, UpdateDocumentRequest request,
      String updaterEmail) {
    User updater = userRepository.findByEmail(updaterEmail)
        .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + updaterEmail));
    permissionService.checkPermission(workspaceId, documentId, updater.getId(), PermissionType.WRITE);

    Document document = documentRepository.findById(documentId)
        .orElseThrow(() -> new ResourceNotFoundException("문서를 찾을 수 없습니다."));

    document.update(
        Optional.ofNullable(request.getTitle()).orElse(""),
        Optional.ofNullable(request.getContent()).orElse(""));

    if (request.getViewType() != null) {
      document.setViewType(ViewType.valueOf(request.getViewType()));
    }

    return buildResponseWithMergedPermissions(document);
  }

  private DocumentResponse buildResponseWithMergedPermissions(Document document) {
    List<Permission> permissions = permissionRepository.findByDocument(document);
    Document parent = document.getParent();
    if (parent != null) {
      List<Permission> parentPerms = permissionRepository.findByDocument(parent).stream()
          .filter(p -> p.getStatus() == PermissionStatus.ACCEPTED)
          .collect(Collectors.toList());
      for (Permission pp : parentPerms) {
        boolean exists = permissions.stream()
            .anyMatch(cp -> cp.getUser().getId().equals(pp.getUser().getId()));
        if (!exists) {
          permissions.add(Permission.builder()
              .user(pp.getUser())
              .document(document)
              .permissionType(pp.getPermissionType())
              .status(PermissionStatus.ACCEPTED)
              .build());
        }
      }
    }
    boolean hasChildren = documentRepository.existsByParentIdAndIsTrashedFalse(document.getId());
    boolean hasParent = document.getParent() != null;

    List<DocumentProperty> properties = documentPropertyRepository
        .findByDocument(hasParent ? document.getParent() : document);
    List<DocumentPropertyDto> propertyDtos = properties.stream()
        .map(property -> {
          DocumentPropertyDto dto = DocumentPropertyDto.from(property);
          if ("TAG".equals(property.getType().name())) {
            List<DocumentPropertyTagOption> tagOptions = documentPropertyTagOptionRepository
                .findByPropertyId(property.getId());
            List<DocumentPropertyDto.TagOptionDto> tagOptionDtos = tagOptions.stream()
                .map(tagOption -> new DocumentPropertyDto.TagOptionDto(tagOption)).collect(Collectors.toList());
            dto.setTagOptions(tagOptionDtos);
          }
          return dto;
        })
        .collect(Collectors.toList());
    DocumentResponse resp = DocumentResponse.fromDocumentWithPermissionsAndChildren(document, permissions, hasChildren, propertyDtos);
    return applyLatestMeta(resp, document);
  }

  @Transactional
  public void deleteDocument(Long id, User user) {
    log.debug("Soft deleting document: {}", id);
    Document document = documentRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + id));

    boolean isOwner = document.getUser().getId().equals(user.getId());
    boolean hasWritePermissionOnDoc = permissionRepository.findByDocument(document).stream()
        .anyMatch(p -> p.getUser().getId().equals(user.getId())
            && p.getStatus() == PermissionStatus.ACCEPTED
            && (p.getPermissionType() == PermissionType.WRITE || p.getPermissionType() == PermissionType.OWNER));
    // 부모 문서 권한도 인정 (부모 소유자 또는 WRITE 권한 보유 시 자식 삭제 허용)
    Document parent = document.getParent();
    boolean isParentOwner = parent != null && parent.getUser().getId().equals(user.getId());
    boolean hasWritePermissionOnParent = parent != null && permissionRepository.findByDocument(parent).stream()
        .anyMatch(p -> p.getUser().getId().equals(user.getId())
            && p.getStatus() == PermissionStatus.ACCEPTED
            && (p.getPermissionType() == PermissionType.WRITE || p.getPermissionType() == PermissionType.OWNER));

    if (!isOwner && !hasWritePermissionOnDoc && !isParentOwner && !hasWritePermissionOnParent) {
      throw new org.springframework.security.access.AccessDeniedException("No permission to delete this document.");
    }

    // TABLE 문서는 자식 문서까지 일괄 휴지통 처리
    if (document.getViewType() == ViewType.TABLE) {
      List<Document> descendants = collectDescendants(document);
      for (Document child : descendants) {
        child.setTrashed(true);
        documentRepository.save(child);
      }
    }
    document.setTrashed(true);
    documentRepository.save(document);
  }

  @Transactional
  public void updateDocumentOrder(Long workspaceId, List<Long> documentIds) {
    for (int i = 0; i < documentIds.size(); i++) {
      Long docId = documentIds.get(i);
      documentRepository.updateSortOrder(workspaceId, docId, i);
    }
  }

  @Transactional(readOnly = true)
  public List<DocumentResponse> getTrashedDocuments(Long workspaceId) {
    return documentRepository.findByWorkspaceIdAndIsTrashedTrue(workspaceId)
        .stream()
        .map(doc -> {
          List<Permission> permissions = permissionRepository.findByDocument(doc);
          boolean hasChildren = documentRepository.existsByParentIdAndIsTrashedFalse(doc.getId());
          DocumentResponse resp = DocumentResponse.fromDocumentWithPermissionsAndChildren(doc, permissions, hasChildren);
          return applyLatestMeta(resp, doc);
        })
        .collect(Collectors.toList());
  }

  @Transactional
  public void restoreDocument(Long workspaceId, Long docId) {
    Document doc = documentRepository.findById(docId)
        .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + docId));
    if (doc.getWorkspace() == null || !doc.getWorkspace().getId().equals(workspaceId)) {
      throw new ResourceNotFoundException("Document not found in workspace: " + workspaceId);
    }
    doc.setTrashed(false);
    documentRepository.save(doc);
  }

  @Transactional
  public void deleteDocumentPermanently(Long workspaceId, Long docId) {
    Document doc = documentRepository.findById(docId)
        .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + docId));
    if (doc.getWorkspace() == null || !doc.getWorkspace().getId().equals(workspaceId)) {
      throw new ResourceNotFoundException("Document not found in workspace: " + workspaceId);
    }
    // TABLE 문서는 자식부터 하드 삭제
    if (doc.getViewType() == ViewType.TABLE) {
      List<Document> descendants = collectDescendants(doc);
      for (int i = descendants.size() - 1; i >= 0; i--) {
        hardDeleteSingleDocument(descendants.get(i));
      }
    }
    hardDeleteSingleDocument(doc);
  }

  @Transactional
  public void emptyTrash(Long workspaceId) {
    // 휴지통 문서 전체를 안전 순서(자식 -> 부모)로 삭제
    List<Document> trashedDocs = documentRepository.findByWorkspaceIdAndIsTrashedTrue(workspaceId);
    if (trashedDocs.isEmpty()) return;

    // 우선 모든 값은 일괄 삭제 (FK 제약 방지)
    List<Long> trashedIds = trashedDocs.stream().map(Document::getId).toList();
    documentPropertyValueRepository.deleteByDocumentIdIn(trashedIds);

    // 트리 루트(부모가 휴지통이 아닌 노드)를 기준으로 각 서브트리를 자식부터 삭제
    Set<Long> remaining = new HashSet<>(trashedIds);
    Map<Long, Document> byId = new HashMap<>();
    for (Document d : trashedDocs) byId.put(d.getId(), d);

    for (Document d : trashedDocs) {
      Long parentId = d.getParent() == null ? null : d.getParent().getId();
      boolean parentIsAlsoTrashed = parentId != null && remaining.contains(parentId);
      if (parentIsAlsoTrashed) continue; // 상위에서 함께 처리됨

      // d를 루트로 하는 서브트리 수집 후 자식부터 삭제
      List<Document> subtree = collectDescendants(d);
      for (int i = subtree.size() - 1; i >= 0; i--) {
        Document child = subtree.get(i);
        if (remaining.contains(child.getId())) {
          documentVersionRepository.deleteByDocument(child);
          List<Permission> perms = permissionRepository.findByDocument(child);
          permissionRepository.deleteAll(perms);
          documentRepository.delete(child);
          remaining.remove(child.getId());
        }
      }
      if (remaining.contains(d.getId())) {
        documentVersionRepository.deleteByDocument(d);
        List<Permission> perms = permissionRepository.findByDocument(d);
        permissionRepository.deleteAll(perms);
        documentRepository.delete(d);
        remaining.remove(d.getId());
      }
    }
  }

  private List<Document> collectDescendants(Document root) {
    List<Document> result = new ArrayList<>();
    Deque<Document> stack = new ArrayDeque<>(documentRepository.findByParentId(root.getId()));
    while (!stack.isEmpty()) {
      Document cur = stack.pop();
      result.add(cur);
      List<Document> children = documentRepository.findByParentId(cur.getId());
      for (Document c : children) {
        stack.push(c);
      }
    }
    return result;
  }

  private void hardDeleteSingleDocument(Document d) {
    // 1. 값/버전 삭제 (FK 제약 방지)
    documentPropertyValueRepository.deleteByDocumentId(d.getId());
    documentVersionRepository.deleteByDocument(d);
    // 2. 권한 삭제
    List<Permission> permissions = permissionRepository.findByDocument(d);
    permissionRepository.deleteAll(permissions);
    // 3. 문서 삭제 (properties/values/tagOptions는 cascade + orphanRemoval)
    documentRepository.delete(d);
  }

  public List<DocumentResponse> getAccessibleDocuments(Long workspaceId, User user) {
    // 1. 내가 소유한 문서(개인)
    List<Document> personalDocs = documentRepository.findByWorkspaceIdAndUserId(workspaceId, user.getId());
    // 2. 초대받아 ACCEPTED된 공유 문서
    List<Long> acceptedDocIds = permissionRepository.findAcceptedDocumentIdsByUserAndWorkspace(
        user.getId(), PermissionStatus.ACCEPTED, workspaceId);
    List<Document> sharedDocs = acceptedDocIds.isEmpty() ? List.of()
        : documentRepository.findAllById(acceptedDocIds)
            .stream()
            .filter(doc -> !doc.getUser().getId().equals(user.getId()))
            .toList();
    List<Document> allDocs = new ArrayList<>();
    allDocs.addAll(personalDocs);
    allDocs.addAll(sharedDocs);
    return allDocs.stream().map(doc -> {
      List<Permission> permissions = permissionRepository.findByDocument(doc);
      boolean hasChildren = documentRepository.existsByParentIdAndIsTrashedFalse(doc.getId());
      DocumentResponse resp = DocumentResponse.fromDocumentWithPermissionsAndChildren(doc, permissions, hasChildren);
      return applyLatestMeta(resp, doc);
    }).collect(Collectors.toList());
  }

  @Transactional(readOnly = true)
  public List<DocumentResponse> getChildDocuments(Long parentId, User user) {
    List<Document> children = documentRepository.findByParentIdAndIsTrashedFalseOrderBySortOrderAscIdAsc(parentId);
    // 권한에 따라 필터링
    List<Document> accessibleChildren = children.stream().filter(doc -> {
      if (doc.getUser().getId().equals(user.getId())) { // 소유자
        return true;
      }
      // 공유받은 문서
      boolean hasDirectPermission = permissionRepository.existsByUserAndDocumentAndStatus(user, doc, PermissionStatus.ACCEPTED);
      if (hasDirectPermission) {
        return true;
      }
      // 부모 문서 권한으로 자식 문서 접근 허용
      Document parent = doc.getParent();
      if (parent != null) {
        if (parent.getUser().getId().equals(user.getId())) { // 부모 문서 소유자
          return true;
        }
        return permissionRepository.existsByUserAndDocumentAndStatus(user, parent, PermissionStatus.ACCEPTED);
      }
      return false;
    }).collect(Collectors.toList());

    return accessibleChildren.stream()
        .map(doc -> {
          List<Permission> permissions = permissionRepository.findByDocument(doc);
          boolean hasChildren = documentRepository.existsByParentIdAndIsTrashedFalse(doc.getId());
          DocumentResponse resp = DocumentResponse.fromDocumentWithPermissionsAndChildren(doc, permissions, hasChildren);
          return applyLatestMeta(resp, doc);
        })
        .collect(Collectors.toList());
  }

  @Transactional
  public void updateChildOrder(Long parentId, List<Long> documentIds, Long userId) {
    // 권한 검증은 컨트롤러에서 parentId 기준으로 수행되므로 여기서는 정렬만 처리
    for (int i = 0; i < documentIds.size(); i++) {
      Long docId = documentIds.get(i);
      documentRepository.updateChildSortOrder(parentId, docId, i);
    }
  }

  @Transactional
  public void updateTitleColumnWidth(Long documentId, Integer width) {
    Document document = documentRepository.findById(documentId)
        .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + documentId));
    document.setTitleColumnWidth(width);
    documentRepository.save(document);
  }

  // 문서/속성값 최신 수정 메타데이터(At/By) 합성
  private DocumentResponse applyLatestMeta(DocumentResponse response, Document document) {
    try {
      LocalDateTime docUpdatedAt = document.getUpdatedAt();
      String docUpdatedBy = document.getUpdatedBy();
      var latestOpt = documentPropertyValueRepository.findTopByDocumentIdOrderByUpdatedAtDesc(document.getId());
      if (latestOpt.isPresent()) {
        var pv = latestOpt.get();
        LocalDateTime pvUpdatedAt = pv.getUpdatedAt();
        if (pvUpdatedAt != null && (docUpdatedAt == null || pvUpdatedAt.isAfter(docUpdatedAt))) {
          response.setUpdatedAt(pvUpdatedAt);
          response.setUpdatedBy(pv.getUpdatedBy());
          return response;
        }
      }
      // 기본: 문서 메타 유지
      response.setUpdatedAt(docUpdatedAt);
      response.setUpdatedBy(docUpdatedBy);
      return response;
    } catch (Exception e) {
      // 방어적으로 실패 시 원본 응답 반환
      return response;
    }
  }

  /**
   * 현재 정렬 순서로 자식 문서들의 sortOrder를 업데이트합니다 (소유자만 가능)
   */
  @Transactional
  public void updateChildSortOrderByCurrentSort(Long userId, Long documentId, List<Long> sortedDocumentIds) {
    Document parentDocument = documentRepository.findById(documentId)
        .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + documentId));
    
    // 소유자 확인
    if (!parentDocument.getUser().getId().equals(userId)) {
      throw new IllegalArgumentException("Only document owner can update child sort order");
    }
    
    // 기존 updateDocumentOrder 메서드 활용
    updateDocumentOrder(parentDocument.getWorkspace().getId(), sortedDocumentIds);
    
    log.info("Child sort order updated for document {} by user {} with {} children", 
        documentId, userId, sortedDocumentIds.size());
  }
}