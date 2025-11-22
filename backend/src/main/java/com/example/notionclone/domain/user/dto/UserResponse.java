package com.example.notionclone.domain.user.dto;

import com.example.notionclone.domain.user.entity.User;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter @Setter
public class UserResponse {
    private Long id;
    private String email;
    private String name;
    private String profileImageUrl;
    private String role;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime lastLoginAt;
    private LocalDateTime updatedAt;

    public UserResponse(User user) {
        this.id = user.getId();
        this.email = user.getEmail();
        this.name = user.getName();
        this.profileImageUrl = user.getProfileImageUrl();
        this.role = user.getRole() != null ? user.getRole().name() : null;
        this.isActive = user.getIsActive() != null ? user.getIsActive() : true;
        this.createdAt = user.getCreatedAt();
        this.lastLoginAt = user.getLastLoginAt();
        this.updatedAt = user.getUpdatedAt();
    }
} 