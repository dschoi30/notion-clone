package com.example.notionclone.domain.workspace.service;

import com.example.notionclone.domain.user.entity.User;
import com.example.notionclone.domain.workspace.entity.WorkspacePermission;
import com.example.notionclone.domain.workspace.entity.WorkspacePermissionType;
import com.example.notionclone.domain.workspace.repository.WorkspacePermissionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * 워크스페이스 권한 검증 서비스
 * 사용자의 워크스페이스 권한을 확인하고 관리
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class WorkspacePermissionService {
    
    private final WorkspacePermissionRepository workspacePermissionRepository;
    
    /**
     * 사용자가 특정 워크스페이스에서 권한을 가지고 있는지 확인
     */
    public boolean hasPermission(User user, Long workspaceId, WorkspacePermissionType permission) {
        Optional<WorkspacePermission> workspacePermission = workspacePermissionRepository
                .findByUserAndWorkspaceId(user, workspaceId);
        
        return workspacePermission.isPresent() && 
               workspacePermission.get().isActive() && 
               workspacePermission.get().hasPermission(permission);
    }
    
    /**
     * 사용자가 특정 워크스페이스에서 여러 권한 중 하나라도 가지고 있는지 확인
     */
    public boolean hasAnyPermission(User user, Long workspaceId, WorkspacePermissionType... permissions) {
        for (WorkspacePermissionType permission : permissions) {
            if (hasPermission(user, workspaceId, permission)) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * 사용자가 특정 워크스페이스에서 모든 권한을 가지고 있는지 확인
     */
    public boolean hasAllPermissions(User user, Long workspaceId, WorkspacePermissionType... permissions) {
        for (WorkspacePermissionType permission : permissions) {
            if (!hasPermission(user, workspaceId, permission)) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * 사용자의 워크스페이스 권한 정보 조회
     */
    public Optional<WorkspacePermission> getUserWorkspacePermission(User user, Long workspaceId) {
        return workspacePermissionRepository.findByUserAndWorkspaceId(user, workspaceId);
    }
    
    /**
     * 워크스페이스의 모든 활성 멤버 조회
     */
    public List<WorkspacePermission> getWorkspaceMembers(Long workspaceId) {
        return workspacePermissionRepository.findByWorkspaceIdAndIsActiveTrue(workspaceId);
    }
    
    /**
     * 사용자가 워크스페이스 소유자인지 확인
     */
    public boolean isWorkspaceOwner(User user, Long workspaceId) {
        return hasPermission(user, workspaceId, WorkspacePermissionType.DELETE_WORKSPACE);
    }
    
    /**
     * 사용자가 워크스페이스 관리자인지 확인 (소유자 또는 관리자)
     */
    public boolean isWorkspaceAdmin(User user, Long workspaceId) {
        return hasAnyPermission(user, workspaceId, 
            WorkspacePermissionType.DELETE_WORKSPACE,
            WorkspacePermissionType.MANAGE_WORKSPACE_SETTINGS,
            WorkspacePermissionType.MANAGE_MEMBERS
        );
    }
    
    /**
     * 사용자가 문서를 생성할 수 있는지 확인
     */
    public boolean canCreateDocument(User user, Long workspaceId) {
        return hasPermission(user, workspaceId, WorkspacePermissionType.CREATE_DOCUMENT);
    }
    
    /**
     * 사용자가 문서를 편집할 수 있는지 확인
     */
    public boolean canEditDocument(User user, Long workspaceId) {
        return hasPermission(user, workspaceId, WorkspacePermissionType.EDIT_DOCUMENT);
    }
    
    /**
     * 사용자가 문서를 삭제할 수 있는지 확인
     */
    public boolean canDeleteDocument(User user, Long workspaceId) {
        return hasPermission(user, workspaceId, WorkspacePermissionType.DELETE_DOCUMENT);
    }
    
    /**
     * 사용자가 문서를 공유할 수 있는지 확인
     */
    public boolean canShareDocument(User user, Long workspaceId) {
        return hasPermission(user, workspaceId, WorkspacePermissionType.SHARE_DOCUMENT);
    }
    
    /**
     * 사용자가 멤버를 관리할 수 있는지 확인
     */
    public boolean canManageMembers(User user, Long workspaceId) {
        return hasPermission(user, workspaceId, WorkspacePermissionType.MANAGE_MEMBERS);
    }
    
    /**
     * 사용자가 멤버를 초대할 수 있는지 확인
     */
    public boolean canInviteMembers(User user, Long workspaceId) {
        return hasPermission(user, workspaceId, WorkspacePermissionType.INVITE_MEMBERS);
    }
}
