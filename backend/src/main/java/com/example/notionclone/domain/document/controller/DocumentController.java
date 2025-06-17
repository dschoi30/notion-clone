package com.example.notionclone.domain.document.controller;

import com.example.notionclone.domain.document.dto.CreateDocumentRequest;
import com.example.notionclone.domain.document.dto.DocumentOrderRequest;
import com.example.notionclone.domain.document.dto.DocumentResponse;
import com.example.notionclone.domain.document.dto.UpdateDocumentRequest;
import com.example.notionclone.domain.document.entity.Document;
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

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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

    @GetMapping
    public ResponseEntity<List<DocumentResponse>> getDocumentsByWorkspace(
            @CurrentUser UserPrincipal userPrincipal,
            @PathVariable Long workspaceId) {
        log.debug("Get documents request for workspace: {} by user: {}", workspaceId, userPrincipal.getId());
        return ResponseEntity.ok(documentService.getDocumentsByWorkspace(workspaceId));
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
        User user = userRepository.findById(userPrincipal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userPrincipal.getId()));
        request.setWorkspaceId(workspaceId);
        return ResponseEntity.ok(documentService.createDocument(
                request.getTitle(),
                request.getContent(),
                workspaceId,
                user,
                request.getParentId(),
                request.getViewType()
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
                id,
                request.getTitle(),
                request.getContent(),
                request.getParentId(),
                request.getViewType()
        ));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDocument(
            @CurrentUser UserPrincipal userPrincipal,
            @PathVariable Long workspaceId,
            @PathVariable Long id) {
        log.debug("Delete document request for id: {} in workspace: {} by user: {}", id, workspaceId, userPrincipal.getId());
        documentService.deleteDocument(id);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/order")
    public ResponseEntity<Void> updateOrder(
            @CurrentUser UserPrincipal userPrincipal,
            @PathVariable Long workspaceId,
            @RequestBody DocumentOrderRequest request
    ) {
        documentService.updateDocumentOrder(workspaceId, request.getDocumentIds());
        return ResponseEntity.ok().build();
    }

    // --- Trash (휴지통) API ---
    @GetMapping("/trash")
    public ResponseEntity<List<DocumentResponse>> getTrashedDocuments(
            @CurrentUser UserPrincipal userPrincipal,
            @PathVariable Long workspaceId) {
        return ResponseEntity.ok(documentService.getTrashedDocuments(workspaceId));
    }

    @PatchMapping("/trash/{docId}/restore")
    public ResponseEntity<Void> restoreDocument(
            @CurrentUser UserPrincipal userPrincipal,
            @PathVariable Long workspaceId,
            @PathVariable Long docId) {
        documentService.restoreDocument(workspaceId, docId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/trash/{docId}/permanent")
    public ResponseEntity<Void> deleteDocumentPermanently(
            @CurrentUser UserPrincipal userPrincipal,
            @PathVariable Long workspaceId,
            @PathVariable Long docId) {
        documentService.deleteDocumentPermanently(workspaceId, docId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/trash")
    public ResponseEntity<Void> emptyTrash(
            @CurrentUser UserPrincipal userPrincipal,
            @PathVariable Long workspaceId) {
        documentService.emptyTrash(workspaceId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{documentId}/invite")
    public ResponseEntity<Void> inviteToDocument(
            @CurrentUser UserPrincipal userPrincipal,
            @PathVariable Long workspaceId,
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
            @CurrentUser UserPrincipal userPrincipal,
            @PathVariable Long workspaceId) {
        // parentId == null인 문서만 조회
        return ResponseEntity.ok(documentService.getChildDocuments(null));
    }

    @GetMapping("/parent/{parentId}")
    public ResponseEntity<List<DocumentResponse>> getChildDocuments(
            @CurrentUser UserPrincipal userPrincipal,
            @PathVariable Long workspaceId,
            @PathVariable Long parentId) {
        return ResponseEntity.ok(documentService.getChildDocuments(parentId));
    }
} 