package com.example.notionclone.domain.document.controller;

import com.example.notionclone.domain.document.dto.CreateDocumentRequest;
import com.example.notionclone.domain.document.dto.UpdateDocumentRequest;
import com.example.notionclone.domain.document.dto.DocumentDto;
import com.example.notionclone.domain.document.service.DocumentService;
import com.example.notionclone.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/documents")
@RequiredArgsConstructor
public class DocumentController {
    private final DocumentService documentService;

    @GetMapping
    public ResponseEntity<List<DocumentDto>> getRootDocuments(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        return ResponseEntity.ok(documentService.getRootDocuments(userPrincipal.getId()));
    }

    @GetMapping("/{documentId}/children")
    public ResponseEntity<List<DocumentDto>> getChildDocuments(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long documentId) {
        return ResponseEntity.ok(documentService.getChildDocuments(userPrincipal.getId(), documentId));
    }

    @GetMapping("/{documentId}")
    public ResponseEntity<DocumentDto> getDocument(
            @PathVariable Long documentId) {
        return ResponseEntity.ok(documentService.getDocument(documentId));
    }

    @PostMapping
    public ResponseEntity<DocumentDto> createDocument(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestBody CreateDocumentRequest request) {
        return ResponseEntity.ok(documentService.createDocument(userPrincipal.getId(), request));
    }

    @PutMapping("/{documentId}")
    public ResponseEntity<DocumentDto> updateDocument(
            @PathVariable Long documentId,
            @RequestBody UpdateDocumentRequest request) {
        return ResponseEntity.ok(documentService.updateDocument(documentId, request));
    }

    @DeleteMapping("/{documentId}")
    public ResponseEntity<Void> deleteDocument(@PathVariable Long documentId) {
        documentService.deleteDocument(documentId);
        return ResponseEntity.ok().build();
    }
} 