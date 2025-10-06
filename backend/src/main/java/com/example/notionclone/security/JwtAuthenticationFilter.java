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
import java.util.Enumeration;
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
                // JWT 토큰이 없는 경우 (이미 로그아웃된 상태)
                log.warn("No JWT token found in request - user already logged out");
                log.warn("Request URI: {}", request.getRequestURI());
                log.warn("Authorization header: {}", request.getHeader("Authorization"));
                
                // 헤더 정보 출력
                Enumeration<String> headerNames = request.getHeaderNames();
                while (headerNames.hasMoreElements()) {
                    String headerName = headerNames.nextElement();
                    log.warn("Header {}: {}", headerName, request.getHeader(headerName));
                }
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                return;
            } else if (jwtTokenProvider.validateToken(jwt)) {
                String email = jwtTokenProvider.getEmailFromToken(jwt);
                String sessionId = jwtTokenProvider.getSessionIdFromToken(jwt);
                log.debug("Email from token: {}", email);
                log.debug("Session ID from token: {}", sessionId);
                
                // DB에서 사용자 확인 및 세션 ID 검증
                User user = userRepository.findByEmail(email).orElse(null);
                log.info("JWT 검증 - 사용자: {}, 토큰 세션: {}, DB 세션: {}", 
                        email, sessionId, user != null ? user.getCurrentSessionId() : "null");
                
                if (user == null) {
                    // 사용자가 존재하지 않는 경우 401 반환
                    log.warn("사용자 검증 실패 - 사용자: {} 존재하지 않음", email);
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    return;
                } else if (sessionId == null || !sessionId.equals(user.getCurrentSessionId())) {
                    // 사용자는 존재하지만 세션이 무효화된 경우 (다른 사용자가 로그인함)
                    log.warn("세션 무효화 - 사용자: {}, 토큰 세션: {}, DB 세션: {}", 
                            email, sessionId, user.getCurrentSessionId());
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    return;
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
                // JWT 토큰이 유효하지 않은 경우
                log.debug("Invalid JWT token");
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                return;
            }
        } catch (Exception e) {
            log.error("Could not set user authentication in security context", e);
        }

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