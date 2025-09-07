package com.example.notionclone.domain.user.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class UpdateProfileRequest {
    private String name;
    private String email;
    private String profileImageUrl;
}
