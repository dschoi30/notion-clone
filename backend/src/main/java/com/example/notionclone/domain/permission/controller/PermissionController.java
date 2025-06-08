package com.example.notionclone.domain.permission.controller;

import com.example.notionclone.domain.permission.service.PermissionService;
import com.example.notionclone.domain.permission.dto.PermissionUpdateRequest;
import com.example.notionclone.domain.permission.entity.Permission;
import com.example.notionclone.domain.permission.dto.PermissionInfo;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/workspaces/{workspaceId}/documents/{documentId}/permissions")
@RequiredArgsConstructor
public class PermissionController {
    private final PermissionService permissionService;

    @PatchMapping("/{userId}")
    public ResponseEntity<PermissionInfo> updatePermission(
        @PathVariable Long workspaceId,
        @PathVariable Long documentId,
        @PathVariable Long userId,
        @RequestBody PermissionUpdateRequest request
    ) {
        Permission updated = permissionService.updatePermissionType(userId, documentId, request.getPermissionType());
        return ResponseEntity.ok(new PermissionInfo(updated));
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> removePermission(
        @PathVariable Long workspaceId,
        @PathVariable Long documentId,
        @PathVariable Long userId
    ) {
        permissionService.removePermission(userId, documentId);
        return ResponseEntity.noContent().build();
    }
} 