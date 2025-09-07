package com.example.notionclone.domain.user.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ProfileUpdateResponse {
    private UserProfileResponse user;
}
