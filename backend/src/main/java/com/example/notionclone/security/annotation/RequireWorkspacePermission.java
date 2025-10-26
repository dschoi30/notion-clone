package com.example.notionclone.security.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 워크스페이스 권한 기반 접근 제어 어노테이션
 * 특정 워크스페이스 권한이 필요한 메서드에 적용
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RequireWorkspacePermission {
    
    /**
     * 필요한 권한 목록
     */
    String[] permissions();
    
    /**
     * 권한 검증 실패 시 메시지
     */
    String message() default "워크스페이스 권한이 없습니다.";
}

