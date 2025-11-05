package com.example.notionclone.security.aspect;

import com.example.notionclone.domain.user.entity.User;
import com.example.notionclone.domain.user.entity.UserRole;
import com.example.notionclone.domain.workspace.entity.WorkspacePermission;
import com.example.notionclone.domain.workspace.entity.WorkspacePermissionType;
import com.example.notionclone.domain.workspace.entity.WorkspaceRole;
import com.example.notionclone.domain.workspace.repository.WorkspacePermissionRepository;
import com.example.notionclone.security.annotation.RequireRole;
import com.example.notionclone.security.annotation.RequireWorkspaceRole;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.core.annotation.Order;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Arrays;
import java.util.Optional;

/**
 * 역할 기반 접근 제어를 위한 AOP Aspect
 */
@Aspect
@Component
@Order(1)
@RequiredArgsConstructor
@Slf4j
public class RoleBasedAccessControlAspect {

    private final WorkspacePermissionRepository workspacePermissionRepository;

    /**
     * 시스템 전역 역할 기반 접근 제어
     */
    @Around("@annotation(requireRole)")
    public Object checkSystemRole(ProceedingJoinPoint joinPoint, RequireRole requireRole) throws Throwable {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new SecurityException("인증이 필요합니다.");
        }

        User user = (User) authentication.getPrincipal();
        UserRole userRole = user.getRole();

        // 역할 검증
        if (requireRole.roles().length > 0) {
            boolean hasRequiredRole = Arrays.stream(requireRole.roles())
                    .anyMatch(role -> userRole.name().equals(role));
            
            if (!hasRequiredRole) {
                throw new SecurityException("접근 권한이 없습니다. 필요한 역할: " + Arrays.toString(requireRole.roles()));
            }
        }

        return joinPoint.proceed();
    }

    /**
     * 워크스페이스 역할 기반 접근 제어
     */
    @Around("@annotation(requireWorkspaceRole)")
    public Object checkWorkspaceRole(ProceedingJoinPoint joinPoint, RequireWorkspaceRole requireWorkspaceRole) throws Throwable {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new SecurityException("인증이 필요합니다.");
        }

        User user = (User) authentication.getPrincipal();
        
        // 워크스페이스 ID 추출
        Long workspaceId = extractWorkspaceId(requireWorkspaceRole.workspaceIdParam());
        if (workspaceId == null) {
            throw new SecurityException("워크스페이스 ID를 찾을 수 없습니다.");
        }

        // 워크스페이스 권한 조회
        Optional<WorkspacePermission> permissionOpt = workspacePermissionRepository
                .findByUserAndWorkspaceId(user, workspaceId);
        
        if (permissionOpt.isEmpty() || !permissionOpt.get().isActive()) {
            throw new SecurityException("워크스페이스 멤버가 아닙니다.");
        }

        WorkspacePermission permission = permissionOpt.get();
        WorkspaceRole userRole = permission.getRole();

        // 역할 검증
        if (requireWorkspaceRole.roles().length > 0) {
            boolean hasRequiredRole = Arrays.stream(requireWorkspaceRole.roles())
                    .anyMatch(role -> userRole.name().equals(role));
            
            if (!hasRequiredRole) {
                throw new SecurityException("워크스페이스 접근 권한이 없습니다. 필요한 역할: " + Arrays.toString(requireWorkspaceRole.roles()));
            }
        }

        // 권한 검증
        if (requireWorkspaceRole.permissions().length > 0) {
            boolean hasRequiredPermission = Arrays.stream(requireWorkspaceRole.permissions())
                    .anyMatch(perm -> permission.hasPermission(WorkspacePermissionType.valueOf(perm)));
            
            if (!hasRequiredPermission) {
                throw new SecurityException("워크스페이스 권한이 없습니다. 필요한 권한: " + Arrays.toString(requireWorkspaceRole.permissions()));
            }
        }

        return joinPoint.proceed();
    }

    /**
     * 요청에서 워크스페이스 ID를 추출
     */
    private Long extractWorkspaceId(String paramName) {
        try {
            // HTTP 요청에서 파라미터 추출
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                HttpServletRequest request = attributes.getRequest();
                
                // Path Variable에서 추출
                String pathInfo = request.getPathInfo();
                if (pathInfo != null && pathInfo.contains("/workspaces/")) {
                    String[] pathParts = pathInfo.split("/");
                    for (int i = 0; i < pathParts.length - 1; i++) {
                        if ("workspaces".equals(pathParts[i])) {
                            return Long.parseLong(pathParts[i + 1]);
                        }
                    }
                }
                
                // Request Parameter에서 추출
                String workspaceIdParam = request.getParameter(paramName);
                if (workspaceIdParam != null) {
                    return Long.parseLong(workspaceIdParam);
                }
            }
        } catch (Exception e) {
            log.warn("워크스페이스 ID 추출 실패: {}", e.getMessage());
        }
        
        return null;
    }
}

