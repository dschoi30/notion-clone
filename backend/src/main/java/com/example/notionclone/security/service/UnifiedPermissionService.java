package com.example.notionclone.security.service;

import com.example.notionclone.domain.document.entity.Document;
import com.example.notionclone.domain.permission.entity.Permission;
import com.example.notionclone.domain.permission.entity.PermissionStatus;
import com.example.notionclone.domain.permission.entity.PermissionType;
import com.example.notionclone.domain.permission.repository.PermissionRepository;
import com.example.notionclone.domain.user.entity.User;
import com.example.notionclone.domain.workspace.entity.WorkspacePermission;
import com.example.notionclone.domain.workspace.entity.WorkspacePermissionType;
import com.example.notionclone.domain.workspace.entity.WorkspaceRole;
import com.example.notionclone.domain.workspace.repository.WorkspacePermissionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * 통합 권한 검증 서비스
 * 워크스페이스 역할과 문서별 권한을 통합하여 관리
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class UnifiedPermissionService {

    private final WorkspacePermissionRepository workspacePermissionRepository;
    private final PermissionRepository permissionRepository;

    /**
     * 문서 접근 권한 검증 (통합)
     * 우선순위: 문서 소유자 > 문서별 권한 > 워크스페이스 역할 > 부모 문서 권한
     */
    public boolean hasDocumentAccess(User user, Document document, DocumentAccessLevel requiredLevel) {
        // 1. 문서 소유자인지 확인
        if (document.getUser().getId().equals(user.getId())) {
            return true; // 소유자는 모든 권한
        }

        // 2. 문서별 직접 권한 확인
        Optional<Permission> directPermission = permissionRepository.findByUserAndDocument(user, document);
        if (directPermission.isPresent() && directPermission.get().getStatus() == PermissionStatus.ACCEPTED) {
            PermissionType permissionType = directPermission.get().getPermissionType();
            return hasRequiredPermission(permissionType, requiredLevel);
        }

        // 3. 워크스페이스 역할 기반 권한 확인
        if (document.getWorkspace() != null) {
            Optional<WorkspacePermission> permission = workspacePermissionRepository
                    .findByUserAndWorkspaceId(user, document.getWorkspace().getId());
            
            if (permission.isPresent() && permission.get().isActive()) {
                WorkspaceRole role = permission.get().getRole();
                if (hasWorkspaceRolePermission(role, requiredLevel)) {
                    return true;
                }
            }
        }

        // 4. 부모 문서 권한 상속 확인
        if (document.getParent() != null) {
            return hasDocumentAccess(user, document.getParent(), requiredLevel);
        }

        return false;
    }

    /**
     * 워크스페이스 권한 검증
     */
    public boolean hasWorkspacePermission(User user, Long workspaceId, WorkspacePermissionType permission) {
        Optional<WorkspacePermission> workspacePermission = workspacePermissionRepository
                .findByUserAndWorkspaceId(user, workspaceId);
        
        return workspacePermission.isPresent() && 
               workspacePermission.get().isActive() && 
               workspacePermission.get().hasPermission(permission);
    }

    /**
     * 문서 생성 권한 검증
     */
    public boolean canCreateDocument(User user, Long workspaceId) {
        return hasWorkspacePermission(user, workspaceId, WorkspacePermissionType.CREATE_DOCUMENT);
    }

    /**
     * 문서 편집 권한 검증
     */
    public boolean canEditDocument(User user, Document document) {
        return hasDocumentAccess(user, document, DocumentAccessLevel.WRITE);
    }

    /**
     * 문서 삭제 권한 검증
     */
    public boolean canDeleteDocument(User user, Document document) {
        // 소유자이거나 워크스페이스 관리자
        if (document.getUser().getId().equals(user.getId())) {
            return true;
        }
        
        if (document.getWorkspace() != null) {
            return hasWorkspacePermission(user, document.getWorkspace().getId(), WorkspacePermissionType.DELETE_DOCUMENT);
        }
        
        return false;
    }

    /**
     * 문서 공유 권한 검증
     */
    public boolean canShareDocument(User user, Document document) {
        return hasDocumentAccess(user, document, DocumentAccessLevel.WRITE) ||
               hasWorkspacePermission(user, document.getWorkspace().getId(), WorkspacePermissionType.SHARE_DOCUMENT);
    }

    /**
     * 권한 검증 및 예외 발생
     */
    public void checkDocumentAccess(User user, Document document, DocumentAccessLevel requiredLevel) {
        if (!hasDocumentAccess(user, document, requiredLevel)) {
            throw new SecurityException("문서에 접근할 권한이 없습니다.");
        }
    }

    /**
     * 워크스페이스 권한 검증 및 예외 발생
     */
    public void checkWorkspacePermission(User user, Long workspaceId, WorkspacePermissionType permission) {
        if (!hasWorkspacePermission(user, workspaceId, permission)) {
            throw new SecurityException("워크스페이스 권한이 없습니다.");
        }
    }

    /**
     * 문서별 권한이 필요한 권한 레벨을 만족하는지 확인
     */
    private boolean hasRequiredPermission(PermissionType permissionType, DocumentAccessLevel requiredLevel) {
        return switch (permissionType) {
            case OWNER -> true; // 소유자는 모든 권한
            case WRITE -> requiredLevel != DocumentAccessLevel.ADMIN;
            case READ -> requiredLevel == DocumentAccessLevel.READ;
        };
    }

    /**
     * 워크스페이스 역할이 필요한 권한 레벨을 만족하는지 확인
     */
    private boolean hasWorkspaceRolePermission(WorkspaceRole role, DocumentAccessLevel requiredLevel) {
        return switch (role) {
            case OWNER -> true; // 소유자는 모든 권한
            case ADMIN -> requiredLevel != DocumentAccessLevel.ADMIN;
            case EDITOR -> requiredLevel == DocumentAccessLevel.READ || requiredLevel == DocumentAccessLevel.WRITE;
            case VIEWER -> requiredLevel == DocumentAccessLevel.READ;
            case GUEST -> false; // 게스트는 제한된 접근만
        };
    }

    /**
     * 문서 접근 레벨 정의
     */
    public enum DocumentAccessLevel {
        READ,      // 읽기
        WRITE,     // 편집
        ADMIN      // 관리 (삭제, 공유 등)
    }
}

