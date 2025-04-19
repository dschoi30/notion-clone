package com.example.notionclone.domain.user.dto;

import com.example.notionclone.domain.user.entity.User;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class UserResponse {
    private Long id;
    private String email;
    private String name;

    public UserResponse(User user) {
        this.id = user.getId();
        this.email = user.getEmail();
        this.name = user.getName();
    }
} 