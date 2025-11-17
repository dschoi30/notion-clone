package com.example.notionclone.domain.user.controller;

import com.example.notionclone.domain.user.dto.UserResponse;
import com.example.notionclone.domain.user.entity.UserRole;
import com.example.notionclone.domain.user.service.UserService;
import com.example.notionclone.security.CurrentUser;
import com.example.notionclone.security.annotation.RequireRole;
import com.example.notionclone.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 관리자 전용 사용자 관리 컨트롤러
 * SUPER_ADMIN만 접근 가능
 */
@Slf4j
@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@RequireRole(roles = {"SUPER_ADMIN"})
public class AdminController {

    private final UserService userService;

    /**
     * 사용자 역할 변경
     * SUPER_ADMIN만 다른 사용자의 역할을 변경할 수 있음
     */
    @PutMapping("/{userId}/role")
    public ResponseEntity<UserResponse> updateUserRole(
            @PathVariable Long userId,
            @RequestBody Map<String, String> request,
            @CurrentUser UserPrincipal currentUser) {
        
        log.info("Admin {} is updating role for user {} to role {}", 
                currentUser.getId(), userId, request.get("role"));
        
        String roleStr = request.get("role");
        if (roleStr == null) {
            return ResponseEntity.badRequest().build();
        }

        try {
            UserRole newRole = UserRole.valueOf(roleStr);
            UserResponse updatedUser = userService.updateUserRole(userId, newRole, currentUser.getId());
            return ResponseEntity.ok(updatedUser);
        } catch (IllegalArgumentException e) {
            log.error("Invalid role: {}", roleStr, e);
            return ResponseEntity.badRequest().build();
        } catch (SecurityException e) {
            log.error("Security error updating role for user {}: {}", userId, e.getMessage());
            return ResponseEntity.status(403).build();
        } catch (RuntimeException e) {
            log.error("Error updating role for user {}: {}", userId, e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 사용자 비밀번호 재설정
     * SUPER_ADMIN만 다른 사용자의 비밀번호를 재설정할 수 있음
     */
    @PostMapping("/{userId}/reset-password")
    public ResponseEntity<Map<String, String>> resetUserPassword(
            @PathVariable Long userId,
            @CurrentUser UserPrincipal currentUser) {
        
        log.info("Admin {} is resetting password for user {}", currentUser.getId(), userId);
        
        try {
            String temporaryPassword = userService.resetUserPassword(userId, currentUser.getId());
            return ResponseEntity.ok(Map.of("temporaryPassword", temporaryPassword));
        } catch (SecurityException e) {
            log.error("Security error resetting password for user {}: {}", userId, e.getMessage());
            return ResponseEntity.status(403).build();
        } catch (RuntimeException e) {
            log.error("Error resetting password for user {}: {}", userId, e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 사용자 계정 활성화/비활성화
     * SUPER_ADMIN만 다른 사용자의 계정 상태를 변경할 수 있음
     */
    @PutMapping("/{userId}/status")
    public ResponseEntity<UserResponse> toggleUserStatus(
            @PathVariable Long userId,
            @RequestBody Map<String, Boolean> request,
            @CurrentUser UserPrincipal currentUser) {
        
        log.info("Admin {} is toggling status for user {} to {}", 
                currentUser.getId(), userId, request.get("isActive"));
        
        Boolean isActive = request.get("isActive");
        if (isActive == null) {
            return ResponseEntity.badRequest().build();
        }

        try {
            UserResponse updatedUser = userService.toggleUserStatus(userId, isActive, currentUser.getId());
            return ResponseEntity.ok(updatedUser);
        } catch (SecurityException e) {
            log.error("Security error toggling status for user {}: {}", userId, e.getMessage());
            return ResponseEntity.status(403).build();
        } catch (RuntimeException e) {
            log.error("Error toggling status for user {}: {}", userId, e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * 사용자 계정 삭제
     * SUPER_ADMIN만 다른 사용자의 계정을 삭제할 수 있음
     */
    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> deleteUser(
            @PathVariable Long userId,
            @CurrentUser UserPrincipal currentUser) {
        
        log.info("Admin {} is deleting user {}", currentUser.getId(), userId);
        
        try {
            userService.deleteUser(userId, currentUser.getId());
            return ResponseEntity.noContent().build();
        } catch (SecurityException e) {
            log.error("Security error deleting user {}: {}", userId, e.getMessage());
            return ResponseEntity.status(403).build();
        } catch (RuntimeException e) {
            log.error("Error deleting user {}: {}", userId, e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
}

