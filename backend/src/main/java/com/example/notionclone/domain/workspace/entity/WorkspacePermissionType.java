package com.example.notionclone.domain.workspace.entity;

import lombok.Getter;

/**
 * 워크스페이스 내 세부 권한 타입 정의
 */
@Getter
public enum WorkspacePermissionType {
    // 워크스페이스 관리
    DELETE_WORKSPACE("워크스페이스 삭제"),
    MANAGE_WORKSPACE_SETTINGS("워크스페이스 설정 관리"),
    MANAGE_MEMBERS("멤버 관리"),
    INVITE_MEMBERS("멤버 초대"),
    
    // 문서 관리
    CREATE_DOCUMENT("문서 생성"),
    EDIT_DOCUMENT("문서 편집"),
    DELETE_DOCUMENT("문서 삭제"),
    VIEW_DOCUMENT("문서 보기"),
    SHARE_DOCUMENT("문서 공유"),
    
    // 제한된 접근
    VIEW_SHARED_DOCUMENT("공유된 문서만 보기");

    private final String description;

    WorkspacePermissionType(String description) {
        this.description = description;
    }

}