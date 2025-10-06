package com.example.notionclone.domain.user.controller;

import com.example.notionclone.domain.user.entity.User;
import com.example.notionclone.domain.user.dto.AuthResponse;
import com.example.notionclone.domain.user.dto.GoogleLoginRequest;
import com.example.notionclone.domain.user.dto.LoginRequest;
import com.example.notionclone.domain.user.dto.RegisterRequest;
import com.example.notionclone.domain.user.dto.UserResponse;
import com.example.notionclone.domain.user.repository.UserRepository;
import com.example.notionclone.domain.workspace.service.WorkspaceService;
import com.example.notionclone.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import java.util.Collections;
import java.util.UUID;
import java.time.LocalDateTime;

import org.springframework.beans.factory.annotation.Value;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final WorkspaceService workspaceService;
    
    @Value("${google.client.id}")
    private String googleClientId;

    /**
     * 사용자 세션을 업데이트하고 JWT 토큰을 생성하는 공통 메서드
     * 브라우저별로 독립적인 세션 관리 (여러 계정 동시 로그인 허용)
     */
    private String createTokenWithSession(User user) {
        // 새로운 세션 ID 생성 (브라우저별 독립 세션)
        String sessionId = UUID.randomUUID().toString();
        String previousSessionId = user.getCurrentSessionId();
        
        user.setCurrentSessionId(sessionId);
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);
        
        log.info("세션 생성 - 사용자: {}, 이전 세션: {}, 새 세션: {}", 
                user.getEmail(), previousSessionId, sessionId);
        
        String jwt = jwtTokenProvider.createToken(user.getEmail(), sessionId, user.getId());
        log.info("JWT 토큰 생성 완료 - 사용자: {}, 세션: {}", user.getEmail(), sessionId);
        
        return jwt;
    }

    
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(
                loginRequest.getEmail(),
                loginRequest.getPassword()
            )
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        
        User user = userRepository.findByEmail(loginRequest.getEmail())
            .orElseThrow(() -> new RuntimeException("User not found"));

        String jwt = createTokenWithSession(user);

        return ResponseEntity.ok(new AuthResponse(jwt, new UserResponse(user)));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest registerRequest) {
        log.info("Registering new user with email: {}", registerRequest.getEmail());
        
        try {
            if (userRepository.existsByEmail(registerRequest.getEmail())) {
                log.warn("Email {} is already taken", registerRequest.getEmail());
                return ResponseEntity.badRequest().body("Email is already taken");
            }

            User user = new User();
            user.setName(registerRequest.getName());
            user.setEmail(registerRequest.getEmail());
            user.setPassword(passwordEncoder.encode(registerRequest.getPassword()));

            user = userRepository.save(user);
            log.info("User registered successfully: {}", user.getEmail());

            // 신규 가입 시 기본 워크스페이스 생성
            try {
                String defaultWorkspaceName = user.getName() + "의 워크스페이스";
                workspaceService.createWorkspace(user, defaultWorkspaceName);
                log.info("Default workspace created for user: {}", user.getEmail());
            } catch (Exception e) {
                log.error("Failed to create default workspace for user: {}", user.getEmail(), e);
                // 워크스페이스 생성 실패해도 회원가입은 성공으로 처리
            }

            String jwt = createTokenWithSession(user);
            return ResponseEntity.ok(new AuthResponse(jwt, new UserResponse(user)));
        } catch (Exception e) {
            log.error("Error during registration", e);
            return ResponseEntity.badRequest().body("Registration failed: " + e.getMessage());
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        return ResponseEntity.ok(new UserResponse(user));
    }

    @PostMapping("/google")
    public ResponseEntity<?> googleLogin(@RequestBody GoogleLoginRequest request) {
        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
                .setAudience(Collections.singletonList(googleClientId))
                .build();

            GoogleIdToken idToken = verifier.verify(request.getCredential());
            if (idToken != null) {
                GoogleIdToken.Payload payload = idToken.getPayload();
                String email = payload.getEmail();
                String name = (String) payload.get("name");

                // 사용자가 존재하는지 확인하고, 없으면 새로 생성
                User user = userRepository.findByEmail(email)
                    .orElseGet(() -> {
                        User newUser = new User();
                        newUser.setEmail(email);
                        newUser.setName(name);
                        newUser.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
                        User savedUser = userRepository.save(newUser);
                        
                        // 신규 가입 시 기본 워크스페이스 생성
                        try {
                            String defaultWorkspaceName = savedUser.getName() + "의 워크스페이스";
                            workspaceService.createWorkspace(savedUser, defaultWorkspaceName);
                            log.info("Default workspace created for Google user: {}", savedUser.getEmail());
                        } catch (Exception e) {
                            log.error("Failed to create default workspace for Google user: {}", savedUser.getEmail(), e);
                            // 워크스페이스 생성 실패해도 회원가입은 성공으로 처리
                        }
                        
                        return savedUser;
                    });

                String jwt = createTokenWithSession(user);
                return ResponseEntity.ok(new AuthResponse(jwt, new UserResponse(user)));
            }
            return ResponseEntity.badRequest().body("Invalid ID token");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Google authentication failed");
        }
    }
} 