package com.example.notionclone.domain.user.controller;

import com.example.notionclone.domain.user.dto.ChangePasswordRequest;
import com.example.notionclone.domain.user.dto.ProfileUpdateResponse;
import com.example.notionclone.domain.user.dto.UpdateProfileRequest;
import com.example.notionclone.domain.user.dto.UserProfileResponse;
import com.example.notionclone.domain.user.dto.UserResponse;
import com.example.notionclone.domain.user.service.UserService;
import com.example.notionclone.security.CurrentUser;
import com.example.notionclone.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    /**
     * 현재 사용자 기본 정보 조회 (인증 후 사용자 정보)
     */
    @GetMapping("/me")
    public ResponseEntity<UserResponse> getCurrentUser(@CurrentUser UserPrincipal userPrincipal) {
        log.debug("Get current user request for user: {}", userPrincipal.getId());
        UserResponse userResponse = userService.getCurrentUser(userPrincipal.getId());
        return ResponseEntity.ok(userResponse);
    }

    /**
     * 현재 사용자 프로필 조회
     */
    @GetMapping("/profile")
    public ResponseEntity<UserProfileResponse> getProfile(@CurrentUser UserPrincipal userPrincipal) {
        log.debug("Get profile request for user: {}", userPrincipal.getId());
        UserProfileResponse profile = userService.getProfile(userPrincipal.getId());
        return ResponseEntity.ok(profile);
    }

    /**
     * 현재 사용자 프로필 업데이트
     */
    @PutMapping("/profile")
    public ResponseEntity<ProfileUpdateResponse> updateProfile(
            @CurrentUser UserPrincipal userPrincipal,
            @RequestBody UpdateProfileRequest request) {
        log.debug("Update profile request for user: {} with data: {}", userPrincipal.getId(), request);
        
        try {
            UserProfileResponse updatedProfile = userService.updateProfile(userPrincipal.getId(), request);
            ProfileUpdateResponse response = new ProfileUpdateResponse(updatedProfile);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.error("Error updating profile for user: {}", userPrincipal.getId(), e);
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 현재 사용자 비밀번호 변경
     */
    @PutMapping("/change-password")
    public ResponseEntity<Void> changePassword(
            @CurrentUser UserPrincipal userPrincipal,
            @RequestBody ChangePasswordRequest request) {
        log.debug("Change password request for user: {}", userPrincipal.getId());
        
        try {
            userService.changePassword(userPrincipal.getId(), request);
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            log.error("Error changing password for user: {}", userPrincipal.getId(), e);
            return ResponseEntity.badRequest().build();
        }
    }
}
