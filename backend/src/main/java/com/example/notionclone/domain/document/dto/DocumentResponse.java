package com.example.notionclone.domain.document.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import com.example.notionclone.domain.document.entity.Document;
import com.example.notionclone.domain.permission.entity.Permission;
import com.example.notionclone.domain.permission.dto.PermissionInfo;

@Getter
@NoArgsConstructor
public class DocumentResponse {
    private Long id;
    private String title;
    private String content;
    private Long workspaceId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private boolean isTrashed;
    private Long userId;
    private List<PermissionInfo> permissions;
    private Long parentId;
    private String viewType;
    private boolean hasChildren;

    public static DocumentResponse fromDocumentWithPermissionsAndChildren(Document document, List<Permission> permissions, boolean hasChildren) {
        DocumentResponse response = new DocumentResponse();
        response.id = document.getId();
        response.title = document.getTitle();
        response.content = document.getContent();
        response.workspaceId = document.getWorkspace() != null ? document.getWorkspace().getId() : null;
        response.createdAt = document.getCreatedAt();
        response.updatedAt = document.getUpdatedAt();
        response.isTrashed = document.isTrashed();
        response.userId = document.getUser().getId();
        response.permissions = permissions != null ? permissions.stream().map(PermissionInfo::new).collect(Collectors.toList()) : null;
        response.parentId = document.getParent() != null ? document.getParent().getId() : null;
        response.viewType = document.getViewType() != null ? document.getViewType().name() : null;
        response.hasChildren = hasChildren;
        return response;
    }

    public static DocumentResponse fromDocumentWithPermissions(Document document, List<Permission> permissions) {
        return fromDocumentWithPermissionsAndChildren(document, permissions, false);
    }

    public static DocumentResponse fromDocument(Document document) {
        return fromDocumentWithPermissionsAndChildren(document, null, false);
    }
} 