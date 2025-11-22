package com.example.notionclone.domain.user.entity;

import com.example.notionclone.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;


@Entity
@Table(name = "users", indexes = {
    @Index(name = "idx_users_email", columnList = "email"),
    @Index(name = "idx_users_current_session_id", columnList = "current_session_id")
})
@Getter
@Setter
public class User extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String name;

    @Column(name = "profile_image_url")
    private String profileImageUrl;

    @Column(name = "current_session_id")
    private String currentSessionId;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    /**
     * 역할 할당 전략:
     * - 신규 가입: UserRole.USER (기본값)
     * - 관리자 승격: 별도 관리 기능을 통해 변경
     * - 엔티티 기본값을 사용하여 중복 설정 방지
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private UserRole role = UserRole.USER;

    /**
     * 계정 활성화 상태
     * - true: 활성화된 계정 (기본값)
     * - false: 비활성화된 계정
     */
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
} 