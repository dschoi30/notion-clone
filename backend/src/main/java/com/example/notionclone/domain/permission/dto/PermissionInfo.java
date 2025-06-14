package com.example.notionclone.domain.permission.dto;

import com.example.notionclone.domain.permission.entity.Permission;
import com.example.notionclone.domain.permission.entity.PermissionType;
import com.example.notionclone.domain.permission.entity.PermissionStatus;
import lombok.Getter;

@Getter
public class PermissionInfo {
    private Long userId;
    private String name;
    private String email;
    private PermissionType permissionType;
    private PermissionStatus status;

    public PermissionInfo(Permission permission) {
        this.userId = permission.getUser().getId();
        this.name = permission.getUser().getName();
        this.email = permission.getUser().getEmail();
        this.permissionType = permission.getPermissionType();
        this.status = permission.getStatus();
    }

    public PermissionInfo(Long userId, String name, String email, PermissionType permissionType, PermissionStatus status) {
        this.userId = userId;
        this.name = name;
        this.email = email;
        this.permissionType = permissionType;
        this.status = status;
    }
} 