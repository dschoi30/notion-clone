package com.example.notionclone.domain.user.service;

import com.example.notionclone.domain.user.dto.ChangePasswordRequest;
import com.example.notionclone.domain.user.dto.UpdateProfileRequest;
import com.example.notionclone.domain.user.dto.UserProfileResponse;
import com.example.notionclone.domain.user.entity.User;
import com.example.notionclone.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
}
