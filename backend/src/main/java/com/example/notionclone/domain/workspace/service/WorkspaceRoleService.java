package com.example.notionclone.domain.workspace.service;

import com.example.notionclone.domain.user.entity.User;
import com.example.notionclone.domain.workspace.entity.Workspace;
import com.example.notionclone.domain.workspace.entity.WorkspaceMembership;
import com.example.notionclone.domain.workspace.entity.WorkspaceRole;
import com.example.notionclone.domain.workspace.entity.WorkspacePermission;
import com.example.notionclone.domain.workspace.repository.WorkspaceMembershipRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * 워크스페이스 역할 관리 서비스
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class WorkspaceRoleService {

    private final WorkspaceMembershipRepository workspaceMembershipRepository;

    /**
     * 사용자를 워크스페이스에 초대
     */
    @Transactional
    public WorkspaceMembership inviteUser(Workspace workspace, User user, WorkspaceRole role, User invitedBy) {
        // 이미 멤버인지 확인
        Optional<WorkspaceMembership> existingMembership = workspaceMembershipRepository
                .findByUserAndWorkspaceId(user, workspace.getId());
        
        if (existingMembership.isPresent()) {
            WorkspaceMembership membership = existingMembership.get();
            if (membership.isActive()) {
                throw new IllegalStateException("이미 워크스페이스 멤버입니다.");
            } else {
                // 비활성 멤버십 재활성화
                membership.setActive(true);
                membership.setRole(role);
                membership.setInvitedBy(invitedBy.getId());
                return workspaceMembershipRepository.save(membership);
            }
        }

        // 새 멤버십 생성
        WorkspaceMembership membership = new WorkspaceMembership();
        membership.setUser(user);
        membership.setWorkspace(workspace);
        membership.setRole(role);
        membership.setInvitedBy(invitedBy.getId());
        membership.setActive(true);

        return workspaceMembershipRepository.save(membership);
    }

    /**
     * 사용자의 워크스페이스 역할 변경
     */
    @Transactional
    public WorkspaceMembership changeUserRole(Long workspaceId, Long userId, WorkspaceRole newRole, User changer) {
        // 변경 권한 확인
        validateRoleChangePermission(workspaceId, changer, newRole);

        WorkspaceMembership membership = workspaceMembershipRepository
                .findByUserAndWorkspaceId(new User() {{ setId(userId); }}, workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("워크스페이스 멤버를 찾을 수 없습니다."));

        membership.setRole(newRole);
        return workspaceMembershipRepository.save(membership);
    }

    /**
     * 사용자를 워크스페이스에서 제거
     */
    @Transactional
    public void removeUser(Long workspaceId, Long userId, User remover) {
        // 제거 권한 확인
        validateRemovePermission(workspaceId, remover, userId);

        WorkspaceMembership membership = workspaceMembershipRepository
                .findByUserAndWorkspaceId(new User() {{ setId(userId); }}, workspaceId)
                .orElseThrow(() -> new IllegalArgumentException("워크스페이스 멤버를 찾을 수 없습니다."));

        membership.setActive(false);
        workspaceMembershipRepository.save(membership);
    }

    /**
     * 사용자의 워크스페이스 권한 확인
     */
    public boolean hasPermission(User user, Long workspaceId, WorkspacePermission permission) {
        Optional<WorkspaceMembership> membership = workspaceMembershipRepository
                .findByUserAndWorkspaceId(user, workspaceId);
        
        return membership.isPresent() && 
               membership.get().isActive() && 
               membership.get().hasPermission(permission);
    }

    /**
     * 워크스페이스 멤버 목록 조회
     */
    public List<WorkspaceMembership> getWorkspaceMembers(Long workspaceId) {
        return workspaceMembershipRepository.findByWorkspaceIdAndActive(workspaceId);
    }

    /**
     * 사용자의 워크스페이스 목록 조회
     */
    public List<WorkspaceMembership> getUserWorkspaces(User user) {
        return workspaceMembershipRepository.findByUserAndActive(user);
    }

    /**
     * 역할 변경 권한 검증
     */
    private void validateRoleChangePermission(Long workspaceId, User changer, WorkspaceRole newRole) {
        Optional<WorkspaceMembership> changerMembership = workspaceMembershipRepository
                .findByUserAndWorkspaceId(changer, workspaceId);
        
        if (changerMembership.isEmpty() || !changerMembership.get().isActive()) {
            throw new SecurityException("워크스페이스 멤버가 아닙니다.");
        }

        WorkspaceRole changerRole = changerMembership.get().getRole();
        
        // OWNER만 다른 사용자의 역할을 변경할 수 있음
        if (changerRole != WorkspaceRole.OWNER) {
            throw new SecurityException("역할 변경 권한이 없습니다.");
        }

        // OWNER 역할은 다른 사용자에게 부여할 수 없음 (소유권 이전은 별도 처리)
        if (newRole == WorkspaceRole.OWNER) {
            throw new IllegalArgumentException("소유자 역할은 직접 변경할 수 없습니다.");
        }
    }

    /**
     * 사용자 제거 권한 검증
     */
    private void validateRemovePermission(Long workspaceId, User remover, Long targetUserId) {
        Optional<WorkspaceMembership> removerMembership = workspaceMembershipRepository
                .findByUserAndWorkspaceId(remover, workspaceId);
        
        if (removerMembership.isEmpty() || !removerMembership.get().isActive()) {
            throw new SecurityException("워크스페이스 멤버가 아닙니다.");
        }

        WorkspaceRole removerRole = removerMembership.get().getRole();
        
        // OWNER만 다른 사용자를 제거할 수 있음
        if (removerRole != WorkspaceRole.OWNER) {
            throw new SecurityException("사용자 제거 권한이 없습니다.");
        }

        // 자신을 제거할 수 없음
        if (remover.getId().equals(targetUserId)) {
            throw new IllegalArgumentException("자신을 워크스페이스에서 제거할 수 없습니다.");
        }
    }
}

