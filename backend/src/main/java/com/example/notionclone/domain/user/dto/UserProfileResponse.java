package com.example.notionclone.domain.user.dto;

import com.example.notionclone.domain.user.entity.User;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class UserProfileResponse {
    private Long id;
    private String name;
    private String email;
    private String profileImageUrl;

    public UserProfileResponse(User user) {
        this.id = user.getId();
        this.name = user.getName();
        this.email = user.getEmail();
        this.profileImageUrl = user.getProfileImageUrl();
    }

    public static UserProfileResponse from(User user) {
        return new UserProfileResponse(user);
    }
}
