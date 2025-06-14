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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;
import java.util.Objects;
import java.util.ArrayList;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DocumentService {
  private final DocumentRepository documentRepository;
  private final WorkspaceRepository workspaceRepository;
  private final NotificationRepository notificationRepository;
  private final PermissionRepository permissionRepository;

  public List<DocumentResponse> getDocumentsByWorkspace(Long workspaceId) {
    log.debug("Getting documents for workspace: {}", workspaceId);
    return documentRepository.findByWorkspaceIdAndIsTrashedFalse(workspaceId)
        .stream()
        .map(doc -> {
            List<Permission> permissions = permissionRepository.findByDocument(doc);
            return DocumentResponse.from(doc, permissions);
        })
        .collect(Collectors.toList());
  }

  public DocumentResponse getDocument(Long id, User user) {
    Document document = documentRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + id));

    // 1. 소유자면 허용
    if (document.getUser().getId().equals(user.getId())) {
        List<Permission> permissions = permissionRepository.findByDocument(document);
        return DocumentResponse.from(document, permissions);
    }

    // 2. Permission에서 ACCEPTED 권한 확인
    boolean hasAcceptedPermission = permissionRepository.findByDocument(document).stream()
        .anyMatch(p -> p.getUser().getId().equals(user.getId())
                    && p.getStatus() == PermissionStatus.ACCEPTED);

    if (!hasAcceptedPermission) {
        throw new ResourceNotFoundException("No permission to view this document.");
    }

    List<Permission> permissions = permissionRepository.findByDocument(document);
    return DocumentResponse.from(document, permissions);
  }

  public List<DocumentResponse> getAllDocuments() {
    return documentRepository.findAll().stream()
        .map(doc -> {
            List<Permission> permissions = permissionRepository.findByDocument(doc);
            return DocumentResponse.from(doc, permissions);
        })
        .collect(Collectors.toList());
  }

  public List<DocumentResponse> getDocumentsWithNoWorkspace() {
    return documentRepository.findDocumentsWithNoWorkspace().stream()
        .map(doc -> {
            List<Permission> permissions = permissionRepository.findByDocument(doc);
            return DocumentResponse.from(doc, permissions);
        })
        .collect(Collectors.toList());
  }

  @Transactional
  public DocumentResponse createDocument(String title, String content, Long workspaceId, User user) {
    log.debug("Creating document in workspace: {} for user: {}", workspaceId, user.getId());
    Workspace workspace = workspaceRepository.findById(workspaceId)
        .orElseThrow(() -> new ResourceNotFoundException("Workspace not found with id: " + workspaceId));

    Document document = Document.builder()
        .title(title)
        .content(content)
        .workspace(workspace)
        .user(user)
        .build();

    return DocumentResponse.from(documentRepository.save(document));
  }

  @Transactional
  public DocumentResponse updateDocument(Long id, String title, String content) {
    log.debug("Updating document: {}", id);
    Document document = documentRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + id));

    document.update(title, content);
    return DocumentResponse.from(document);
  }

  @Transactional
  public void deleteDocument(Long id) {
    log.debug("Soft deleting document: {}", id);
    Document document = documentRepository.findById(id)
        .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + id));
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
            return DocumentResponse.from(doc, permissions);
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
        user.getId(), PermissionStatus.ACCEPTED, workspaceId
    );
    List<Document> sharedDocs = acceptedDocIds.isEmpty() ? List.of() :
      documentRepository.findAllById(acceptedDocIds)
        .stream()
        .filter(doc -> !doc.getUser().getId().equals(user.getId()))
        .collect(Collectors.toList());
    List<Document> allDocs = new ArrayList<>();
    allDocs.addAll(personalDocs);
    allDocs.addAll(sharedDocs);
    return allDocs.stream().map(doc -> {
        List<Permission> permissions = permissionRepository.findByDocument(doc);
        return DocumentResponse.from(doc, permissions);
    }).collect(Collectors.toList());
  }
}