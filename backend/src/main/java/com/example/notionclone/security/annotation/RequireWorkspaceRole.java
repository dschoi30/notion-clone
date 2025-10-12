package com.example.notionclone.security.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 워크스페이스 내 역할 기반 접근 제어를 적용하는 어노테이션
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface RequireWorkspaceRole {
    /**
     * 필요한 워크스페이스 역할들 (OR 조건)
     */
    String[] roles() default {};
    
    /**
     * 필요한 워크스페이스 권한들 (OR 조건)
     */
    String[] permissions() default {};
    
    /**
     * 워크스페이스 ID 파라미터명 (기본값: "workspaceId")
     */
    String workspaceIdParam() default "workspaceId";
    
    /**
     * 모든 조건을 만족해야 하는지 여부 (AND 조건)
     */
    boolean requireAll() default false;
}

