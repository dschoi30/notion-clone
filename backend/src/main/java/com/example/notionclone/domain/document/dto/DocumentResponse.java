package com.example.notionclone.domain.document.dto;

import com.example.notionclone.domain.document.entity.Document;
import com.example.notionclone.domain.permission.dto.PermissionInfo;
import com.example.notionclone.domain.permission.entity.Permission;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Getter
@Builder
public class DocumentResponse {
    private Long id;
    private String title;
    private String content;
    private Long parentId;
    private String viewType;
    private Long userId;
    private Long workspaceId; // workspaceId 필드 추가
    private String createdBy;
    private String updatedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<PermissionInfo> permissions;
    private List<DocumentPropertyDto> properties;
    private boolean hasChildren;
    private Integer titleColumnWidth;
    private Integer sortOrder;
    @JsonProperty("isLocked")
    private boolean isLocked;

    public static DocumentResponse fromDocumentWithPermissionsAndChildren(Document document, List<Permission> permissions, boolean hasChildren) {
        return DocumentResponse.builder()
                .id(document.getId())
                .title(document.getTitle())
                .content(document.getContent())
                .parentId(document.getParent() != null ? document.getParent().getId() : null)
                .viewType(document.getViewType().name())
                .userId(document.getUser().getId())
                .workspaceId(document.getWorkspace() != null ? document.getWorkspace().getId() : null) // workspaceId 매핑 추가
                .createdBy(document.getCreatedBy())
                .updatedBy(document.getUpdatedBy())
                .createdAt(document.getCreatedAt())
                .updatedAt(document.getUpdatedAt())
                .permissions(permissions != null ? permissions.stream().map(PermissionInfo::from).collect(Collectors.toList()) : null)
                .properties(document.getProperties().stream().map(DocumentPropertyDto::from).collect(Collectors.toList()))
                .hasChildren(hasChildren)
                .titleColumnWidth(document.getTitleColumnWidth())
                .sortOrder(document.getSortOrder())
                .isLocked(document.isLocked())
                .build();
    }

    public static DocumentResponse fromDocumentWithPermissions(Document document, List<Permission> permissions) {
        return fromDocumentWithPermissionsAndChildren(document, permissions, false);
    }

    public static DocumentResponse fromDocument(Document document) {
        return fromDocumentWithPermissionsAndChildren(document, null, false);
    }

    public static DocumentResponse fromDocumentWithPermissionsAndChildren(
        Document document, List<Permission> permissions, boolean hasChildren, List<DocumentPropertyDto> properties
    ) {
        DocumentResponse response = fromDocumentWithPermissionsAndChildren(document, permissions, hasChildren);
        response.setProperties(properties);
        return response;
    }

    public void setProperties(List<DocumentPropertyDto> properties) {
        this.properties = properties;
    }

    // 최신 메타데이터 합성 적용을 위해 setter 추가
    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public void setUpdatedBy(String updatedBy) {
        this.updatedBy = updatedBy;
    }
} 