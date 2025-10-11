package com.example.notionclone.security.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 메서드나 클래스에 역할 기반 접근 제어를 적용하는 어노테이션
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface RequireRole {
    /**
     * 필요한 역할들 (OR 조건)
     */
    String[] roles() default {};
    
    /**
     * 필요한 권한들 (OR 조건)
     */
    String[] permissions() default {};
    
    /**
     * 모든 조건을 만족해야 하는지 여부 (AND 조건)
     */
    boolean requireAll() default false;
}

