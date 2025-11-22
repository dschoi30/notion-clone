package com.example.notionclone.domain.user.service;

import com.example.notionclone.domain.user.dto.ChangePasswordRequest;
import com.example.notionclone.domain.user.dto.UpdateProfileRequest;
import com.example.notionclone.domain.user.dto.UserProfileResponse;
import com.example.notionclone.domain.user.dto.UserResponse;
import com.example.notionclone.domain.user.entity.User;
import com.example.notionclone.domain.user.entity.UserRole;
import com.example.notionclone.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {
    
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * 현재 사용자 기본 정보 조회
     */
    public UserResponse getCurrentUser(Long userId) {
        log.debug("Getting current user for user: {}", userId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        return new UserResponse(user);
    }

    /**
     * 사용자 프로필 조회
     */
    public UserProfileResponse getProfile(Long userId) {
        log.debug("Getting profile for user: {}", userId);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        return UserProfileResponse.from(user);
    }

    /**
     * 사용자 프로필 업데이트
     */
    @Transactional
    public UserProfileResponse updateProfile(Long userId, UpdateProfileRequest request) {
        log.debug("Updating profile for user: {} with data: {}", userId, request);
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // 이메일 중복 확인 (자신의 이메일과 다른 경우에만)
        if (!user.getEmail().equals(request.getEmail()) && 
            userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email is already taken");
        }

        // 프로필 정보 업데이트
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setProfileImageUrl(request.getProfileImageUrl());

        user = userRepository.save(user);
        log.debug("Profile updated successfully for user: {}", userId);

        return UserProfileResponse.from(user);
    }

    /**
     * 비밀번호 변경
     */
    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest request) {
        log.debug("Changing password for user: {}", userId);
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // 현재 비밀번호 검증
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new RuntimeException("Current password is incorrect");
        }

        // 새 비밀번호 설정
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        
        log.debug("Password changed successfully for user: {}", userId);
    }

    /**
     * 전체 사용자 목록 조회 (페이지네이션 지원)
     * SUPER_ADMIN 전용
     */
    public Page<UserResponse> getAllUsers(Pageable pageable) {
        log.debug("Getting all users with pagination: page={}, size={}", pageable.getPageNumber(), pageable.getPageSize());
        Page<User> userPage = userRepository.findAll(pageable);
        return userPage.map(UserResponse::new);
    }

    /**
     * 사용자 역할 변경 (SUPER_ADMIN 전용)
     * @param userId 변경할 사용자 ID
     * @param newRole 새로운 역할
     * @param adminId 관리자 ID (권한 확인용)
     * @return 변경된 사용자 정보
     */
    @Transactional
    public UserResponse updateUserRole(Long userId, UserRole newRole, Long adminId) {
        log.info("Admin {} is updating role for user {} to {}", adminId, userId, newRole);
        
        // 관리자 권한 확인
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new SecurityException("관리자를 찾을 수 없습니다."));
        
        if (admin.getRole() != UserRole.SUPER_ADMIN) {
            throw new SecurityException("SUPER_ADMIN 권한이 필요합니다.");
        }

        // 대상 사용자 조회
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        // 자신의 역할은 변경할 수 없음
        if (userId.equals(adminId)) {
            throw new SecurityException("자신의 역할은 변경할 수 없습니다.");
        }

        // 역할 변경
        user.setRole(newRole);
        user = userRepository.save(user);
        
        log.info("Role updated successfully for user {} to {}", userId, newRole);
        return new UserResponse(user);
    }

    /**
     * 사용자 비밀번호 재설정 (SUPER_ADMIN 전용)
     * @param userId 비밀번호를 재설정할 사용자 ID
     * @param adminId 관리자 ID (권한 확인용)
     * @return 임시 비밀번호
     */
    @Transactional
    public String resetUserPassword(Long userId, Long adminId) {
        log.info("Admin {} is resetting password for user {}", adminId, userId);
        
        // 관리자 권한 확인
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new SecurityException("관리자를 찾을 수 없습니다."));
        
        if (admin.getRole() != UserRole.SUPER_ADMIN) {
            throw new SecurityException("SUPER_ADMIN 권한이 필요합니다.");
        }

        // 대상 사용자 조회
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        // 임시 비밀번호 생성 (8자리 랜덤 문자열)
        String temporaryPassword = generateTemporaryPassword();
        
        // 비밀번호 재설정
        user.setPassword(passwordEncoder.encode(temporaryPassword));
        userRepository.save(user);
        
        log.info("Password reset successfully for user {}", userId);
        return temporaryPassword;
    }

    /**
     * 사용자 계정 활성화/비활성화 (SUPER_ADMIN 전용)
     * @param userId 상태를 변경할 사용자 ID
     * @param isActive 활성화 여부
     * @param adminId 관리자 ID (권한 확인용)
     * @return 변경된 사용자 정보
     */
    @Transactional
    public UserResponse toggleUserStatus(Long userId, Boolean isActive, Long adminId) {
        log.info("Admin {} is toggling status for user {} to {}", adminId, userId, isActive);
        
        // 관리자 권한 확인
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new SecurityException("관리자를 찾을 수 없습니다."));
        
        if (admin.getRole() != UserRole.SUPER_ADMIN) {
            throw new SecurityException("SUPER_ADMIN 권한이 필요합니다.");
        }

        // 대상 사용자 조회
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        // 자신의 계정은 비활성화할 수 없음
        if (userId.equals(adminId) && !isActive) {
            throw new SecurityException("자신의 계정은 비활성화할 수 없습니다.");
        }

        // 계정 상태 변경 (BaseEntity의 isActive 필드 사용)
        user.setIsActive(isActive);
        user = userRepository.save(user);
        
        log.info("Status updated successfully for user {} to {}", userId, isActive);
        return new UserResponse(user);
    }

    /**
     * 사용자 계정 삭제 (SUPER_ADMIN 전용)
     * @param userId 삭제할 사용자 ID
     * @param adminId 관리자 ID (권한 확인용)
     */
    @Transactional
    public void deleteUser(Long userId, Long adminId) {
        log.info("Admin {} is deleting user {}", adminId, userId);
        
        // 관리자 권한 확인
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new SecurityException("관리자를 찾을 수 없습니다."));
        
        if (admin.getRole() != UserRole.SUPER_ADMIN) {
            throw new SecurityException("SUPER_ADMIN 권한이 필요합니다.");
        }

        // 대상 사용자 조회
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        // 자신의 계정은 삭제할 수 없음
        if (userId.equals(adminId)) {
            throw new SecurityException("자신의 계정은 삭제할 수 없습니다.");
        }

        // 계정 삭제 (실제로는 soft delete를 권장하지만, 여기서는 hard delete)
        userRepository.delete(user);
        
        log.info("User {} deleted successfully by admin {}", userId, adminId);
    }

    /**
     * 임시 비밀번호 생성 (8자리 랜덤 문자열)
     */
    private String generateTemporaryPassword() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        StringBuilder password = new StringBuilder();
        java.util.Random random = new java.util.Random();
        for (int i = 0; i < 8; i++) {
            password.append(chars.charAt(random.nextInt(chars.length())));
        }
        return password.toString();
    }
}
