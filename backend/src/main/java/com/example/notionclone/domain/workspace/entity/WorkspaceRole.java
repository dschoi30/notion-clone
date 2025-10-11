package com.example.notionclone.domain.workspace.entity;

/**
 * 워크스페이스 내 사용자 역할
 * - OWNER: 워크스페이스 소유자 (모든 권한)
 * - ADMIN: 워크스페이스 관리자 (사용자 관리, 설정 변경)
 * - EDITOR: 편집자 (문서 생성/편집/삭제)
 * - VIEWER: 뷰어 (읽기 전용)
 * - GUEST: 게스트 (제한된 접근)
 */
public enum WorkspaceRole {
    OWNER("소유자", "워크스페이스의 모든 권한을 가짐", 5),
    ADMIN("관리자", "워크스페이스 관리 및 사용자 초대", 4),
    EDITOR("편집자", "문서 생성, 편집, 삭제 가능", 3),
    VIEWER("뷰어", "문서 읽기만 가능", 2),
    GUEST("게스트", "제한된 문서만 접근 가능", 1);

    private final String displayName;
    private final String description;
    private final int permissionLevel;

    WorkspaceRole(String displayName, String description, int permissionLevel) {
        this.displayName = displayName;
        this.description = description;
        this.permissionLevel = permissionLevel;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getDescription() {
        return description;
    }

    public int getPermissionLevel() {
        return permissionLevel;
    }

    /**
     * 다른 역할보다 높은 권한을 가지고 있는지 확인
     */
    public boolean hasHigherPermissionThan(WorkspaceRole other) {
        return this.permissionLevel > other.permissionLevel;
    }

    /**
     * 특정 권한을 가지고 있는지 확인
     */
    public boolean hasPermission(WorkspacePermission permission) {
        return switch (this) {
            case OWNER -> true; // 소유자는 모든 권한
            case ADMIN -> permission != WorkspacePermission.DELETE_WORKSPACE;
            case EDITOR -> permission == WorkspacePermission.CREATE_DOCUMENT ||
                           permission == WorkspacePermission.EDIT_DOCUMENT ||
                           permission == WorkspacePermission.DELETE_DOCUMENT ||
                           permission == WorkspacePermission.VIEW_DOCUMENT;
            case VIEWER -> permission == WorkspacePermission.VIEW_DOCUMENT;
            case GUEST -> permission == WorkspacePermission.VIEW_SHARED_DOCUMENT;
        };
    }
}

