package com.example.notionclone.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import com.example.notionclone.domain.user.repository.UserRepository;
import com.example.notionclone.domain.user.entity.User;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final UserDetailsService userDetailsService;
    private final UserRepository userRepository;
    
    private final List<String> excludedPaths = Arrays.asList(
        "/api/auth/register",
        "/api/auth/login",
        "/api/auth/google",
        "/api/auth/logout",
        "/api/auth/me",
        "/api/login",
        "/api/image-proxy"
    );

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String contextPath = request.getContextPath();
        String requestUri = request.getRequestURI();
        String path = requestUri.substring(contextPath.length());
        
        log.debug("Context Path: {}", contextPath);
        log.debug("Request URI: {}", requestUri);
        log.debug("Extracted Path: {}", path);
        
        // WebSocket handshake 경로는 JWT 인증 필터 제외
        if (path.startsWith("/ws/")) {
            log.debug("WebSocket handshake path, filter will be skipped.");
            return true;
        }

        boolean shouldExclude = excludedPaths.stream().anyMatch(path::equals);
        log.debug("Should exclude path: {}", shouldExclude);
        
        return shouldExclude;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            String jwt = getJwtFromRequest(request);
            log.debug("JWT Token: {}", jwt);

            if (jwt == null) {
                // JWT 토큰이 없는 경우 - 인증이 필요한 요청인지 확인
                log.debug("No JWT token found in request");
                // 토큰이 없어도 필터 체인을 계속 진행 (Spring Security가 인증 필요 여부 판단)
            } else if (jwtTokenProvider.validateToken(jwt)) {
                String email = jwtTokenProvider.getEmailFromToken(jwt);
                String sessionId = jwtTokenProvider.getSessionIdFromToken(jwt);
                log.debug("Email from token: {}", email);
                log.debug("Session ID from token: {}", sessionId);
                
                // DB에서 사용자 확인 및 세션 ID 검증
                User user = userRepository.findByEmail(email).orElse(null);
                log.debug("JWT 검증 - 사용자: {}, 토큰 세션: {}, DB 세션: {}", 
                        email, sessionId, user != null ? user.getCurrentSessionId() : "null");
                
                if (user == null) {
                    // 사용자가 존재하지 않는 경우 - 인증이 필요한 요청인지 확인
                    log.warn("사용자 검증 실패 - 사용자: {} 존재하지 않음", email);
                    // 사용자가 없어도 필터 체인을 계속 진행 (Spring Security가 인증 필요 여부 판단)
                } else if (sessionId == null || user.getCurrentSessionId() == null || !sessionId.equals(user.getCurrentSessionId())) {
                    // 사용자는 존재하지만 세션이 무효화된 경우 (다른 사용자가 로그인함)
                    // 또는 기존 사용자의 currentSessionId가 NULL인 경우 (하위 호환성)
                    log.warn("세션 무효화 - 사용자: {}, 토큰 세션: {}, DB 세션: {}", 
                            email, sessionId, user.getCurrentSessionId() != null ? user.getCurrentSessionId() : "NULL");
                    // 세션이 무효화되어도 필터 체인을 계속 진행 (Spring Security가 인증 필요 여부 판단)
                } else {
                    // 세션이 유효한 경우에만 인증 처리
                    UserDetails userDetails = userDetailsService.loadUserByUsername(email);
                    log.debug("UserDetails loaded: {}", userDetails);
                    
                    if (!(userDetails instanceof UserPrincipal)) {
                        log.error("UserDetails is not an instance of UserPrincipal: {}", userDetails.getClass());
                        throw new RuntimeException("UserDetails is not an instance of UserPrincipal");
                    }
                    
                    UserPrincipal userPrincipal = (UserPrincipal) userDetails;
                    log.debug("User ID: {}", userPrincipal.getId());
                    log.debug("User Email: {}", userPrincipal.getEmail());
                    log.debug("User Authorities: {}", userPrincipal.getAuthorities());
                    
                    UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                            userDetails, null, userDetails.getAuthorities());
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    SecurityContextHolder.getContext().setAuthentication(authentication);
                    log.debug("Authentication set in SecurityContext for user: {}", email);
                    log.debug("Current Authentication: {}", SecurityContextHolder.getContext().getAuthentication());
                }
            } else {
                // JWT 토큰이 유효하지 않은 경우 - 인증이 필요한 요청인지 확인
                log.debug("Invalid JWT token");
                // 유효하지 않은 토큰이어도 필터 체인을 계속 진행 (Spring Security가 인증 필요 여부 판단)
            }
        } catch (Exception e) {
            log.error("Could not set user authentication in security context", e);
        }

        // 모든 경우에 대해 한 번만 필터 체인을 계속 진행
        filterChain.doFilter(request, response);
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        log.debug("Authorization header: {}", bearerToken);
        
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
} 