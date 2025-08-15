package com.example.notionclone.domain.document.controller;

import com.example.notionclone.domain.document.dto.DocumentVersionDtos;
import com.example.notionclone.domain.document.service.DocumentVersionService;
import com.example.notionclone.security.CurrentUser;
import com.example.notionclone.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/workspaces/{workspaceId}/documents/{documentId}/versions")
@RequiredArgsConstructor
public class DocumentVersionController {
    private final DocumentVersionService versionService;

    @PostMapping
    public ResponseEntity<Long> create(
            @CurrentUser UserPrincipal userPrincipal,
            @PathVariable Long workspaceId,
            @PathVariable Long documentId,
            @RequestBody DocumentVersionDtos.CreateRequest request
    ) {
        if (userPrincipal == null) {
            return ResponseEntity.status(401).build();
        }
        Long id = versionService.createVersion(workspaceId, documentId, request, userPrincipal.getEmail());
        // 이미 존재하는 동일 스냅샷이면 204 No Content
        if (id == null) return ResponseEntity.noContent().build();
        return ResponseEntity.ok(id);
    }

    @GetMapping
    public ResponseEntity<Page<DocumentVersionDtos.ResponseItem>> list(
            @PathVariable Long workspaceId,
            @PathVariable Long documentId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(versionService.listVersions(documentId, page, size));
    }

    @GetMapping("/{versionId}")
    public ResponseEntity<DocumentVersionDtos.DetailResponse> detail(
            @PathVariable Long workspaceId,
            @PathVariable Long documentId,
            @PathVariable Long versionId
    ) {
        return ResponseEntity.ok(versionService.getVersion(versionId));
    }
}


