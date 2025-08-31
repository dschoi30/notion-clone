package com.example.notionclone.domain.permission.dto;

import com.example.notionclone.domain.permission.entity.Permission;
import com.example.notionclone.domain.permission.entity.PermissionType;
import com.example.notionclone.domain.permission.entity.PermissionStatus;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PermissionInfo {
    private Long userId;
    private String name;
    private String email;
    private String profileImageUrl;
    private PermissionType permissionType;
    private PermissionStatus status;

    public PermissionInfo(Permission permission) {
        this.userId = permission.getUser().getId();
        this.name = permission.getUser().getName();
        this.email = permission.getUser().getEmail();
        this.profileImageUrl = permission.getUser().getProfileImageUrl();
        this.permissionType = permission.getPermissionType();
        this.status = permission.getStatus();
    }

    public PermissionInfo(Long userId, String name, String email, String profileImageUrl, PermissionType permissionType, PermissionStatus status) {
        this.userId = userId;
        this.name = name;
        this.email = email;
        this.profileImageUrl = profileImageUrl;
        this.permissionType = permissionType;
        this.status = status;
    }

    public static PermissionInfo from(Permission permission) {
        return PermissionInfo.builder()
                .userId(permission.getUser().getId())
                .name(permission.getUser().getName())
                .email(permission.getUser().getEmail())
                .profileImageUrl(permission.getUser().getProfileImageUrl())
                .permissionType(permission.getPermissionType())
                .build();
    }
} 