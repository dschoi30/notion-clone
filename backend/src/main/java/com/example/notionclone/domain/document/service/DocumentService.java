package com.example.notionclone.domain.document.service;

import com.example.notionclone.domain.document.dto.DocumentResponse;
import com.example.notionclone.domain.document.entity.Document;
import com.example.notionclone.domain.document.repository.DocumentRepository;
import com.example.notionclone.domain.user.entity.User;
import com.example.notionclone.domain.workspace.entity.Workspace;
import com.example.notionclone.domain.workspace.repository.WorkspaceRepository;
import com.example.notionclone.exception.ResourceNotFoundException;
import com.example.notionclone.domain.notification.entity.NotificationType;
import com.example.notionclone.domain.notification.repository.NotificationRepository;
import com.example.notionclone.domain.notification.entity.NotificationStatus;
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
import java.util.Objects;
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
import com.example.notionclone.domain.document.repository.DocumentPropertyRepository;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DocumentService {
  private final DocumentRepository documentRepository;
  private final WorkspaceRepository workspaceRepository;
  private final NotificationRepository notificationRepository;
  private final PermissionRepository permissionRepository;
  private final PermissionService permissionService;
  private final UserRepository userRepository;
  private final DocumentPropertyTagOptionRepository documentPropertyTagOptionRepository;
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
          return DocumentResponse.fromDocumentWithPermissionsAndChildren(doc, doc.getPermissions(), hasChildren);
        })
        .collect(Collectors.toList());
  }

  public DocumentResponse getDocument(Long id, User user) {
    Document document = documentRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + id));

    boolean hasPermission = permissionRepository.existsByUserAndDocumentAndStatus(user, document,
        PermissionStatus.ACCEPTED);
    if (document.getUser().getId().equals(user.getId()) || hasPermission) { // 유저가 소유한 문서이거나 공유받은 문서일 경우
      List<Permission> permissions = permissionRepository.findByDocument(document);
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
      return DocumentResponse.fromDocumentWithPermissionsAndChildren(document, permissions, hasChildren, propertyDtos);
    } else {
      throw new org.springframework.security.access.AccessDeniedException("No permission to access this document.");
    }
  }

  public List<DocumentResponse> getAllDocuments() {
    return documentRepository.findAll().stream()
        .map(doc -> {
          List<Permission> permissions = permissionRepository.findByDocument(doc);
          boolean hasChildren = documentRepository.existsByParentIdAndIsTrashedFalse(doc.getId());
          return DocumentResponse.fromDocumentWithPermissionsAndChildren(doc, permissions, hasChildren);
        })
        .collect(Collectors.toList());
  }

  public List<DocumentResponse> getDocumentsWithNoWorkspace() {
    return documentRepository.findDocumentsWithNoWorkspace().stream()
        .map(doc -> {
          List<Permission> permissions = permissionRepository.findByDocument(doc);
          boolean hasChildren = documentRepository.existsByParentIdAndIsTrashedFalse(doc.getId());
          return DocumentResponse.fromDocumentWithPermissionsAndChildren(doc, permissions, hasChildren);
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

    return DocumentResponse.fromDocumentWithPermissionsAndChildren(savedDocument, savedDocument.getPermissions(),
        hasChildren);
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

    boolean hasChildren = documentRepository.existsByParentIdAndIsTrashedFalse(document.getId());
    return DocumentResponse.fromDocumentWithPermissionsAndChildren(document, document.getPermissions(), hasChildren);
  }

  @Transactional
  public void deleteDocument(Long id, User user) {
    log.debug("Soft deleting document: {}", id);
    Document document = documentRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + id));

    boolean isOwner = document.getUser().getId().equals(user.getId());
    boolean hasWritePermission = permissionRepository.findByDocument(document).stream()
        .anyMatch(p -> p.getUser().getId().equals(user.getId())
            && p.getStatus() == PermissionStatus.ACCEPTED
            && (p.getPermissionType() == PermissionType.WRITE || p.getPermissionType() == PermissionType.OWNER));

    if (!isOwner && !hasWritePermission) {
      throw new org.springframework.security.access.AccessDeniedException("No permission to delete this document.");
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
          return DocumentResponse.fromDocumentWithPermissionsAndChildren(doc, permissions, hasChildren);
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
    // 1. Permission 먼저 삭제
    List<Permission> permissions = permissionRepository.findByDocument(doc);
    permissionRepository.deleteAll(permissions);
    // 2. 문서 삭제
    documentRepository.delete(doc);
  }

  @Transactional
  public void emptyTrash(Long workspaceId) {
    documentRepository.deleteAllTrashedByWorkspaceId(workspaceId);
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
      return DocumentResponse.fromDocumentWithPermissionsAndChildren(doc, permissions, hasChildren);
    }).collect(Collectors.toList());
  }

  @Transactional(readOnly = true)
  public List<DocumentResponse> getChildDocuments(Long parentId, User user) {
    List<Document> children = documentRepository.findByParentIdAndIsTrashedFalse(parentId);
    // 권한에 따라 필터링
    List<Document> accessibleChildren = children.stream().filter(doc -> {
      if (doc.getUser().getId().equals(user.getId())) { // 소유자
        return true;
      }
      // 공유받은 문서
      return permissionRepository.existsByUserAndDocumentAndStatus(user, doc, PermissionStatus.ACCEPTED);
    }).collect(Collectors.toList());

    return accessibleChildren.stream()
        .map(doc -> {
          List<Permission> permissions = permissionRepository.findByDocument(doc);
          boolean hasChildren = documentRepository.existsByParentIdAndIsTrashedFalse(doc.getId());
          return DocumentResponse.fromDocumentWithPermissionsAndChildren(doc, permissions, hasChildren);
        })
        .collect(Collectors.toList());
  }

  @Transactional
  public void updateTitleColumnWidth(Long documentId, Integer width) {
    Document document = documentRepository.findById(documentId)
        .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + documentId));
    document.setTitleColumnWidth(width);
    documentRepository.save(document);
  }
}