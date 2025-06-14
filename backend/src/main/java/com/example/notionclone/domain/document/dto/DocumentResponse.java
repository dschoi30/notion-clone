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

    /**
     * @deprecated permissions 없이 생성하는 from은 내부용으로만 사용하세요.
     */
    @Deprecated
    public static DocumentResponse from(Document document) {
        DocumentResponse response = new DocumentResponse();
        response.id = document.getId();
        response.title = document.getTitle();
        response.content = document.getContent();
        response.workspaceId = document.getWorkspace() != null ? document.getWorkspace().getId() : null;
        response.createdAt = document.getCreatedAt();
        response.updatedAt = document.getUpdatedAt();
        response.isTrashed = document.isTrashed();
        response.userId = document.getUser().getId();
        response.permissions = null;
        return response;
    }

    public static DocumentResponse from(Document document, List<Permission> permissions) {
        DocumentResponse response = new DocumentResponse();
        response.id = document.getId();
        response.title = document.getTitle();
        response.content = document.getContent();
        response.workspaceId = document.getWorkspace() != null ? document.getWorkspace().getId() : null;
        response.createdAt = document.getCreatedAt();
        response.updatedAt = document.getUpdatedAt();
        response.isTrashed = document.isTrashed();
        response.userId = document.getUser().getId();
        boolean ownerExists = permissions.stream().anyMatch(p -> p.getUser().getId().equals(document.getUser().getId()));
        List<PermissionInfo> permissionInfos = permissions.stream().map(PermissionInfo::new).collect(Collectors.toList());
        if (!ownerExists) {
            PermissionInfo ownerInfo = new PermissionInfo(
                document.getUser().getId(),
                document.getUser().getName(),
                document.getUser().getEmail(),
                com.example.notionclone.domain.permission.entity.PermissionType.OWNER,
                null
            );
            permissionInfos.add(0, ownerInfo);
        }
        response.permissions = permissionInfos;
        return response;
    }
} 