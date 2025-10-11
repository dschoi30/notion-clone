package com.example.notionclone.domain.user.entity;

/**
 * 시스템 전역 사용자 역할
 * - SUPER_ADMIN: 시스템 전체 관리자 (최고 권한)
 * - ADMIN: 일반 관리자 (워크스페이스 관리 가능)
 * - USER: 일반 사용자 (기본 권한)
 */
public enum UserRole {
    SUPER_ADMIN("슈퍼 관리자", "시스템 전체 관리 권한"),
    ADMIN("관리자", "워크스페이스 관리 권한"),
    USER("사용자", "기본 사용자 권한");

    private final String displayName;
    private final String description;

    UserRole(String displayName, String description) {
        this.displayName = displayName;
        this.description = description;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getDescription() {
        return description;
    }

    /**
     * 역할의 권한 레벨을 반환 (숫자가 높을수록 더 많은 권한)
     */
    public int getPermissionLevel() {
        return switch (this) {
            case SUPER_ADMIN -> 3;
            case ADMIN -> 2;
            case USER -> 1;
        };
    }

    /**
     * 다른 역할보다 높은 권한을 가지고 있는지 확인
     */
    public boolean hasHigherPermissionThan(UserRole other) {
        return this.getPermissionLevel() > other.getPermissionLevel();
    }
}
