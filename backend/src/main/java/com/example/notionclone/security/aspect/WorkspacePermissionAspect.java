package com.example.notionclone.security.aspect;

import com.example.notionclone.domain.user.entity.User;
import com.example.notionclone.domain.workspace.entity.WorkspacePermissionType;
import com.example.notionclone.domain.workspace.service.WorkspacePermissionService;
import com.example.notionclone.security.annotation.RequireWorkspacePermission;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.util.Arrays;

/**
 * 워크스페이스 권한 기반 접근 제어 AOP
 */
@Aspect
@Component
@RequiredArgsConstructor
@Slf4j
public class WorkspacePermissionAspect {
    
    private final WorkspacePermissionService workspacePermissionService;
    
    @Around("@annotation(com.example.notionclone.security.annotation.RequireWorkspacePermission)")
    public Object checkWorkspacePermission(ProceedingJoinPoint joinPoint) throws Throwable {
        // 현재 인증된 사용자 정보 가져오기
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new SecurityException("인증이 필요합니다.");
        }
        
        User user = (User) authentication.getPrincipal();
        if (user == null) {
            throw new SecurityException("사용자 정보를 찾을 수 없습니다.");
        }
        
        // 어노테이션 정보 가져오기
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();
        RequireWorkspacePermission annotation = method.getAnnotation(RequireWorkspacePermission.class);
        
        // 워크스페이스 ID 추출 (메서드 파라미터에서)
        Long workspaceId = extractWorkspaceId(joinPoint);
        if (workspaceId == null) {
            throw new SecurityException("워크스페이스 ID를 찾을 수 없습니다.");
        }
        
        // 권한 검증
        String[] requiredPermissions = annotation.permissions();
        boolean hasPermission = workspacePermissionService.hasAnyPermission(
            user, 
            workspaceId, 
            Arrays.stream(requiredPermissions)
                .map(WorkspacePermissionType::valueOf)
                .toArray(WorkspacePermissionType[]::new)
        );
        
        if (!hasPermission) {
            String message = annotation.message();
            log.warn("권한 검증 실패 - 사용자: {}, 워크스페이스: {}, 필요한 권한: {}", 
                user.getId(), workspaceId, Arrays.toString(requiredPermissions));
            throw new SecurityException(message);
        }
        
        log.debug("권한 검증 성공 - 사용자: {}, 워크스페이스: {}", user.getId(), workspaceId);
        return joinPoint.proceed();
    }
    
    /**
     * 메서드 파라미터에서 워크스페이스 ID 추출
     */
    private Long extractWorkspaceId(ProceedingJoinPoint joinPoint) {
        Object[] args = joinPoint.getArgs();
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        String[] paramNames = signature.getParameterNames();
        
        // workspaceId 파라미터 찾기
        for (int i = 0; i < paramNames.length; i++) {
            if ("workspaceId".equals(paramNames[i]) && args[i] instanceof Long) {
                return (Long) args[i];
            }
        }
        
        // workspace 파라미터에서 ID 추출
        for (int i = 0; i < paramNames.length; i++) {
            if ("workspace".equals(paramNames[i]) && args[i] != null) {
                try {
                    Object workspace = args[i];
                    Method getIdMethod = workspace.getClass().getMethod("getId");
                    return (Long) getIdMethod.invoke(workspace);
                } catch (Exception e) {
                    log.warn("워크스페이스 ID 추출 실패", e);
                }
            }
        }
        
        return null;
    }
}

