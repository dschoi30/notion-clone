package com.example.notionclone.domain.document.controller;

import com.example.notionclone.domain.document.dto.CreateDocumentRequest;
import com.example.notionclone.domain.document.dto.DocumentResponse;
import com.example.notionclone.domain.document.dto.UpdateDocumentRequest;
import com.example.notionclone.domain.document.service.DocumentService;
import com.example.notionclone.domain.user.entity.User;
import com.example.notionclone.domain.user.repository.UserRepository;
import com.example.notionclone.exception.ResourceNotFoundException;
import com.example.notionclone.security.CurrentUser;
import com.example.notionclone.security.UserPrincipal;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/workspaces/{workspaceId}/documents")
@RequiredArgsConstructor
public class DocumentController {
    private final DocumentService documentService;
    private final UserRepository userRepository;

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
        return ResponseEntity.ok(documentService.getDocument(id));
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
                user
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
                request.getContent()
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

    @PutMapping("/{id}/move")
    public ResponseEntity<DocumentResponse> moveDocument(
            @PathVariable Long id,
            @RequestParam(required = false) Long workspaceId) {
        return ResponseEntity.ok(documentService.moveDocument(id, workspaceId));
    }
} 