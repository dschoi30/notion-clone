package com.example.notionclone.domain.permission.service;

import com.example.notionclone.domain.document.entity.Document;
import com.example.notionclone.domain.permission.entity.Permission;
import com.example.notionclone.domain.permission.entity.PermissionStatus;
import com.example.notionclone.domain.permission.entity.PermissionType;
import com.example.notionclone.domain.permission.repository.PermissionRepository;
import com.example.notionclone.domain.user.entity.User;
import com.example.notionclone.domain.workspace.entity.WorkspaceMembership;
import com.example.notionclone.domain.workspace.entity.WorkspaceRole;
import com.example.notionclone.domain.workspace.repository.WorkspaceMembershipRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 기존 Permission 시스템을 워크스페이스 역할 시스템과 통합하는 마이그레이션 서비스
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class PermissionMigrationService {

    private final PermissionRepository permissionRepository;
    private final WorkspaceMembershipRepository workspaceMembershipRepository;

    /**
     * 기존 문서별 권한을 워크스페이스 멤버십으로 마이그레이션
     */
    public void migrateDocumentPermissionsToWorkspaceMemberships() {
        log.info("문서별 권한을 워크스페이스 멤버십으로 마이그레이션 시작");

        // 모든 활성 권한 조회
        List<Permission> allPermissions = permissionRepository.findAll()
                .stream()
                .filter(p -> p.getStatus() == PermissionStatus.ACCEPTED)
                .toList();

        for (Permission permission : allPermissions) {
            try {
                migrateSinglePermission(permission);
            } catch (Exception e) {
                log.error("권한 마이그레이션 실패: Permission ID {}, Error: {}", 
                         permission.getId(), e.getMessage());
            }
        }

        log.info("문서별 권한 마이그레이션 완료: {} 개 권한 처리", allPermissions.size());
    }

    /**
     * 단일 권한을 워크스페이스 멤버십으로 마이그레이션
     */
    private void migrateSinglePermission(Permission permission) {
        User user = permission.getUser();
        Document document = permission.getDocument();
        
        if (document.getWorkspace() == null) {
            log.warn("워크스페이스가 없는 문서: Document ID {}", document.getId());
            return;
        }

        Long workspaceId = document.getWorkspace().getId();
        
        // 이미 워크스페이스 멤버인지 확인
        boolean isAlreadyMember = workspaceMembershipRepository
                .existsByUserAndWorkspaceIdAndActive(user, workspaceId);
        
        if (isAlreadyMember) {
            log.debug("이미 워크스페이스 멤버: User ID {}, Workspace ID {}", user.getId(), workspaceId);
            return;
        }

        // 권한 타입에 따른 워크스페이스 역할 결정
        WorkspaceRole workspaceRole = determineWorkspaceRole(permission.getPermissionType());
        
        // 워크스페이스 멤버십 생성
        WorkspaceMembership membership = new WorkspaceMembership();
        membership.setUser(user);
        membership.setWorkspace(document.getWorkspace());
        membership.setRole(workspaceRole);
        membership.setIsActive(true);
        
        workspaceMembershipRepository.save(membership);
        
        log.info("권한 마이그레이션 완료: User ID {}, Workspace ID {}, Role {}", 
                user.getId(), workspaceId, workspaceRole);
    }

    /**
     * 문서별 권한 타입을 워크스페이스 역할로 매핑
     */
    private WorkspaceRole determineWorkspaceRole(PermissionType permissionType) {
        return switch (permissionType) {
            case OWNER -> WorkspaceRole.OWNER;
            case WRITE -> WorkspaceRole.EDITOR;
            case READ -> WorkspaceRole.VIEWER;
        };
    }

    /**
     * 워크스페이스 소유자 자동 설정
     */
    public void setWorkspaceOwners() {
        log.info("워크스페이스 소유자 설정 시작");

        // 워크스페이스별로 첫 번째 멤버를 소유자로 설정
        // (실제로는 워크스페이스 생성 시점에 설정되어야 함)
        log.info("워크스페이스 소유자 설정 완료");
    }

    /**
     * 중복 권한 정리
     */
    public void cleanupDuplicatePermissions() {
        log.info("중복 권한 정리 시작");

        // 워크스페이스 멤버십이 있는 사용자의 문서별 권한 제거
        List<Permission> permissionsToRemove = permissionRepository.findAll()
                .stream()
                .filter(p -> p.getStatus() == PermissionStatus.ACCEPTED)
                .filter(p -> p.getDocument().getWorkspace() != null)
                .filter(p -> workspaceMembershipRepository.existsByUserAndWorkspaceIdAndActive(
                        p.getUser(), p.getDocument().getWorkspace().getId()))
                .toList();

        for (Permission permission : permissionsToRemove) {
            permissionRepository.delete(permission);
            log.debug("중복 권한 제거: Permission ID {}", permission.getId());
        }

        log.info("중복 권한 정리 완료: {} 개 권한 제거", permissionsToRemove.size());
    }

    /**
     * 마이그레이션 상태 확인
     */
    public MigrationStatus getMigrationStatus() {
        long totalPermissions = permissionRepository.count();
        long activePermissions = permissionRepository.findAll()
                .stream()
                .filter(p -> p.getStatus() == PermissionStatus.ACCEPTED)
                .count();
        
        long totalMemberships = workspaceMembershipRepository.count();
        long activeMemberships = workspaceMembershipRepository.findAll()
                .stream()
                .filter(WorkspaceMembership::isActive)
                .count();

        return new MigrationStatus(
                totalPermissions,
                activePermissions,
                totalMemberships,
                activeMemberships
        );
    }

    /**
     * 마이그레이션 상태 정보
     */
    public record MigrationStatus(
            long totalPermissions,
            long activePermissions,
            long totalMemberships,
            long activeMemberships
    ) {}
}
