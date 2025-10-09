package com.example.notionclone.domain.user.service;

import com.example.notionclone.domain.user.entity.User;
import com.example.notionclone.domain.user.repository.UserRepository;
import com.example.notionclone.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * 인증 관련 비즈니스 로직을 처리하는 서비스
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {
    
    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;
    
    /**
     * 사용자 세션을 업데이트하고 JWT 토큰을 생성
     * 브라우저별로 독립적인 세션 관리 (여러 계정 동시 로그인 허용)
     * @Transactional을 사용하여 동시성 제어 및 race condition 방지
     * 
     * @param user 세션을 업데이트할 사용자
     * @return 생성된 JWT 토큰
     */
    @Transactional
    public String createTokenWithSession(User user) {
        // 새로운 세션 ID 생성 (브라우저별 독립 세션)
        String sessionId = UUID.randomUUID().toString();
        String previousSessionId = user.getCurrentSessionId();
        
        user.setCurrentSessionId(sessionId);
        user.setLastLoginAt(LocalDateTime.now());
        // saveAndFlush()를 사용하여 즉시 DB에 반영하여 동시성 제어
        userRepository.saveAndFlush(user);
        
        log.debug("세션 생성 - 사용자: {}, 이전 세션: {}, 새 세션: {}", 
                user.getEmail(), previousSessionId, sessionId);
        
        String jwt = jwtTokenProvider.createToken(user.getEmail(), sessionId);
        log.debug("JWT 토큰 생성 완료 - 사용자: {}, 세션: {}", user.getEmail(), sessionId);
        
        return jwt;
    }
}
