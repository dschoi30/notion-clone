package com.example.notionclone.domain.user.controller;

import com.example.notionclone.domain.user.User;
import com.example.notionclone.domain.user.dto.AuthResponse;
import com.example.notionclone.domain.user.dto.GoogleLoginRequest;
import com.example.notionclone.domain.user.dto.LoginRequest;
import com.example.notionclone.domain.user.dto.RegisterRequest;
import com.example.notionclone.domain.user.dto.UserResponse;
import com.example.notionclone.domain.user.repository.UserRepository;
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

import org.springframework.beans.factory.annotation.Value;

@Slf4j
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    
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
        String jwt = jwtTokenProvider.createToken(loginRequest.getEmail());
        
        User user = userRepository.findByEmail(loginRequest.getEmail())
            .orElseThrow(() -> new RuntimeException("User not found"));

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

            String jwt = jwtTokenProvider.createToken(user.getEmail());
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
                        return userRepository.save(newUser);
                    });

                // JWT 토큰 생성
                String jwt = jwtTokenProvider.createToken(email);
                return ResponseEntity.ok(new AuthResponse(jwt, new UserResponse(user)));
            }
            return ResponseEntity.badRequest().body("Invalid ID token");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Google authentication failed");
        }
    }
} 