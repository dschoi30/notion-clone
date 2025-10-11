package com.example.notionclone.domain.user.controller;

import com.example.notionclone.domain.user.entity.User;
import com.example.notionclone.domain.user.entity.UserRole;
import com.example.notionclone.domain.user.dto.AuthResponse;
import com.example.notionclone.domain.user.dto.GoogleLoginRequest;
import com.example.notionclone.domain.user.dto.LoginRequest;
import com.example.notionclone.domain.user.dto.RegisterRequest;
import com.example.notionclone.domain.user.dto.UserResponse;
import com.example.notionclone.domain.user.repository.UserRepository;
import com.example.notionclone.domain.user.service.AuthService;
import com.example.notionclone.domain.workspace.service.WorkspaceService;
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

import org.springframework.beans.factory.annotation.Value;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthService authService;
    private final WorkspaceService workspaceService;
    
    @Value("${google.client.id}")
    private String googleClientId;


    
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
        String jwt = authService.createTokenWithSession(user);

        return ResponseEntity.ok(new AuthResponse(jwt, new UserResponse(user)));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest registerRequest) {
        log.debug("Registering new user with email: {}", registerRequest.getEmail());
        
        try {
            if (userRepository.existsByEmail(registerRequest.getEmail())) {
                log.warn("Email {} is already taken", registerRequest.getEmail());
                return ResponseEntity.badRequest().body("Email is already taken");
            }

            User user = new User();
            user.setName(registerRequest.getName());
            user.setEmail(registerRequest.getEmail());
            user.setPassword(passwordEncoder.encode(registerRequest.getPassword()));
            // 신규 가입 사용자는 기본 USER 역할 부여
            user.setRole(UserRole.USER);

            user = userRepository.save(user);
            log.info("User registered successfully: {}", user.getEmail());

            // 신규 가입 시 기본 워크스페이스 생성
            try {
                String defaultWorkspaceName = user.getName() + "의 워크스페이스";
                workspaceService.createWorkspace(user, defaultWorkspaceName);
                log.debug("Default workspace created for user: {}", user.getEmail());
            } catch (Exception e) {
                log.error("Failed to create default workspace for user: {}", user.getEmail(), e);
                // 워크스페이스 생성 실패해도 회원가입은 성공으로 처리
            }

            String jwt = authService.createTokenWithSession(user);
            return ResponseEntity.ok(new AuthResponse(jwt, new UserResponse(user)));
        } catch (Exception e) {
            log.error("Error during registration", e);
            return ResponseEntity.badRequest().body("Registration failed: " + e.getMessage());
        }
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
                        // 구글 로그인 신규 사용자는 기본 USER 역할 부여
                        newUser.setRole(UserRole.USER);
                        User savedUser = userRepository.save(newUser);
                        
                        // 신규 가입 시 기본 워크스페이스 생성
                        try {
                            String defaultWorkspaceName = savedUser.getName() + "의 워크스페이스";
                            workspaceService.createWorkspace(savedUser, defaultWorkspaceName);
                            log.debug("Default workspace created for Google user: {}", savedUser.getEmail());
                        } catch (Exception e) {
                            log.error("Failed to create default workspace for Google user: {}", savedUser.getEmail(), e);
                            // 워크스페이스 생성 실패해도 회원가입은 성공으로 처리
                        }
                        
                        return savedUser;
                    });

                String jwt = authService.createTokenWithSession(user);
                return ResponseEntity.ok(new AuthResponse(jwt, new UserResponse(user)));
            }
            return ResponseEntity.badRequest().body("Invalid ID token");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Google authentication failed");
        }
    }
} 