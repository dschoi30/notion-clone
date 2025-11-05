package com.example.notionclone.domain.workspace.entity;

import com.example.notionclone.domain.BaseEntity;
import com.example.notionclone.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 워크스페이스 권한 정보
 * 사용자와 워크스페이스 간의 권한 관계를 관리
 */
@Entity
@Table(name = "workspace_permissions", 
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "workspace_id"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WorkspacePermission extends BaseEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workspace_id", nullable = false)
    private Workspace workspace;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private WorkspaceRole role;

    @Column(name = "invited_by")
    private Long invitedBy; // 초대한 사용자 ID

    @Column(name = "joined_at")
    private LocalDateTime joinedAt;

    @Column(name = "is_active")
    private Boolean isActive;

    @Builder
    public WorkspacePermission(User user, Workspace workspace, WorkspaceRole role, Long invitedBy, Boolean isActive, LocalDateTime joinedAt) {
        this.user = user;
        this.workspace = workspace;
        this.role = role;
        this.invitedBy = invitedBy;
        this.isActive = isActive != null ? isActive : true;
        this.joinedAt = joinedAt != null ? joinedAt : LocalDateTime.now();
    }

    @PrePersist
    protected void onCreate() {
        if (joinedAt == null) {
            joinedAt = LocalDateTime.now();
        }
    }

    /**
     * 권한이 활성 상태인지 확인
     */
    public boolean isActive() {
        return Boolean.TRUE.equals(isActive);
    }

    /**
     * 특정 권한을 가지고 있는지 확인
     */
    public boolean hasPermission(WorkspacePermissionType permission) {
        return role.hasPermission(permission);
    }

    /**
     * 다른 권한보다 높은 권한을 가지고 있는지 확인
     */
    public boolean hasHigherPermissionThan(WorkspacePermission other) {
        return this.role.hasHigherPermissionThan(other.getRole());
    }

    /**
     * 권한을 활성화
     */
    public void activate() {
        this.isActive = true;
    }

    /**
     * 권한을 비활성화
     */
    public void deactivate() {
        this.isActive = false;
    }

    /**
     * 역할 변경
     */
    public void changeRole(WorkspaceRole newRole) {
        if (newRole == null) {
            throw new IllegalArgumentException("역할은 null일 수 없습니다.");
        }
        this.role = newRole;
    }

    /**
     * 초대자 업데이트
     */
    public void updateInvitedBy(Long invitedBy) {
        this.invitedBy = invitedBy;
    }
}

