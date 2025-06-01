package com.example.notionclone.domain.document.service;

import com.example.notionclone.domain.document.dto.DocumentResponse;
import com.example.notionclone.domain.document.entity.Document;
import com.example.notionclone.domain.document.repository.DocumentRepository;
import com.example.notionclone.domain.user.entity.User;
import com.example.notionclone.domain.workspace.entity.Workspace;
import com.example.notionclone.domain.workspace.repository.WorkspaceRepository;
import com.example.notionclone.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DocumentService {
  private final DocumentRepository documentRepository;
  private final WorkspaceRepository workspaceRepository;

  public List<DocumentResponse> getDocumentsByWorkspace(Long workspaceId) {
    log.debug("Getting documents for workspace: {}", workspaceId);
    return documentRepository.findByWorkspaceId(workspaceId)
        .stream()
        .map(DocumentResponse::from)
        .collect(Collectors.toList());
  }

  public DocumentResponse getDocument(Long id) {
    log.debug("Getting document: {}", id);
    return documentRepository.findById(id)
        .map(DocumentResponse::from)
        .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + id));
  }

  public List<DocumentResponse> getAllDocuments() {
    return documentRepository.findAll().stream()
        .map(DocumentResponse::from)
        .collect(Collectors.toList());
  }

  public List<DocumentResponse> getDocumentsWithNoWorkspace() {
    return documentRepository.findDocumentsWithNoWorkspace().stream()
        .map(DocumentResponse::from)
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
        .map(DocumentResponse::from)
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
    documentRepository.delete(doc);
  }

  @Transactional
  public void emptyTrash(Long workspaceId) {
    documentRepository.deleteAllTrashedByWorkspaceId(workspaceId);
  }
}