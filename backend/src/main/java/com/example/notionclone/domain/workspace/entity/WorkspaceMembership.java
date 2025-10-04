package com.example.notionclone.domain.workspace.entity;

import com.example.notionclone.domain.BaseEntity;
import com.example.notionclone.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * 워크스페이스 멤버십 정보
 * 사용자와 워크스페이스 간의 역할 관계를 관리
 */
@Entity
@Table(name = "workspace_memberships", 
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "workspace_id"}))
@Getter
@Setter
public class WorkspaceMembership extends BaseEntity {
    
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
    private Boolean isActive = true;

    @PrePersist
    protected void onCreate() {
        super.onCreate();
        if (joinedAt == null) {
            joinedAt = LocalDateTime.now();
        }
    }

    /**
     * 멤버십이 활성 상태인지 확인
     */
    public boolean isActive() {
        return Boolean.TRUE.equals(isActive);
    }

    /**
     * 특정 권한을 가지고 있는지 확인
     */
    public boolean hasPermission(WorkspacePermission permission) {
        return role.hasPermission(permission);
    }

    /**
     * 다른 멤버십보다 높은 권한을 가지고 있는지 확인
     */
    public boolean hasHigherPermissionThan(WorkspaceMembership other) {
        return this.role.hasHigherPermissionThan(other.getRole());
    }
}

