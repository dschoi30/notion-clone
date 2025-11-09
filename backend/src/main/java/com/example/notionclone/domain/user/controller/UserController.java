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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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

    /**
     * 전체 사용자 목록 조회 (페이지네이션 지원)
     * SUPER_ADMIN 전용
     */
    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Page<UserResponse>> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) String sort) {
        log.debug("Get all users request: page={}, size={}, sort={}", page, size, sort);
        
        // 정렬 파라미터 처리
        Sort sortObj = Sort.by(Sort.Direction.ASC, "id"); // 기본값: id 오름차순
        if (sort != null && !sort.isEmpty()) {
            String[] sortParts = sort.split(",");
            if (sortParts.length == 2) {
                String field = sortParts[0].trim();
                String direction = sortParts[1].trim().toUpperCase();
                sortObj = Sort.by(
                    "DESC".equals(direction) ? Sort.Direction.DESC : Sort.Direction.ASC,
                    field
                );
            }
        }
        
        Pageable pageable = PageRequest.of(page, size, sortObj);
        Page<UserResponse> users = userService.getAllUsers(pageable);
        return ResponseEntity.ok(users);
    }
}
