package com.example.notionclone.domain.permission.dto;

import com.example.notionclone.domain.permission.entity.Permission;
import com.example.notionclone.domain.permission.entity.PermissionType;
import com.example.notionclone.domain.permission.entity.PermissionStatus;
import lombok.Getter;

@Getter
public class PermissionInfo {
    private Long userId;
    private PermissionType permissionType;
    private PermissionStatus status;

    public PermissionInfo(Permission permission) {
        this.userId = permission.getUser().getId();
        this.permissionType = permission.getPermissionType();
        this.status = permission.getStatus();
    }
} 