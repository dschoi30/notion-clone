package com.example.notionclone.config;

import com.example.notionclone.domain.user.entity.User;
import com.example.notionclone.domain.user.repository.UserRepository;
import com.example.notionclone.security.JwtTokenProvider;
import com.example.notionclone.security.UserPrincipal;
import com.example.notionclone.domain.user.service.CustomUserDetailsService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Rate Limiting 필터
 * 
 * 이미지 업로드 엔드포인트(/api/image-upload)에 대해 rate limiting을 적용합니다.
 * 인증된 사용자만 요청 가능하며, 사용자 ID 기반 rate limiting을 적용합니다.
 * 
 * 인증되지 않은 사용자: 401 Unauthorized 응답 반환
 * 제한 초과 시: 429 Too Many Requests 응답 반환
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class RateLimitingFilter extends OncePerRequestFilter {

    private final RateLimitingConfig rateLimitingConfig;
    private final JwtTokenProvider jwtTokenProvider;
    private final CustomUserDetailsService userDetailsService;
    private final UserRepository userRepository;

    private static final String UPLOAD_ENDPOINT = "/api/image-upload";
    private static final String RATE_LIMIT_HEADER = "X-RateLimit-Limit";
    private static final String RATE_LIMIT_REMAINING = "X-RateLimit-Remaining";
    private static final String RATE_LIMIT_RESET = "X-RateLimit-Reset";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        // 이미지 업로드 엔드포인트에만 적용
        if (!request.getRequestURI().equals(UPLOAD_ENDPOINT) || !request.getMethod().equals("POST")) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            // 인증 체크: SecurityContext에서 UserPrincipal 가져오기
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserPrincipal userPrincipal = null;
            
            // SecurityContext에 UserPrincipal이 있는지 확인
            if (authentication != null && authentication.isAuthenticated() 
                    && authentication.getPrincipal() instanceof UserPrincipal) {
                userPrincipal = (UserPrincipal) authentication.getPrincipal();
                log.debug("UserPrincipal found in SecurityContext: {}", userPrincipal.getId());
            } else {
                // SecurityContext에 UserPrincipal이 없으면 JWT 토큰에서 직접 가져오기
                log.debug("UserPrincipal not found in SecurityContext, trying to get from JWT token");
                String jwt = getJwtFromRequest(request);
                
                if (jwt != null && jwtTokenProvider.validateToken(jwt)) {
                    String email = jwtTokenProvider.getEmailFromToken(jwt);
                    String sessionId = jwtTokenProvider.getSessionIdFromToken(jwt);
                    log.debug("JWT token validated, email: {}, sessionId: {}", email, sessionId);
                    
                    // DB에서 사용자 확인 및 세션 ID 검증
                    User user = userRepository.findByEmail(email).orElse(null);
                    
                    if (user != null && (sessionId == null || user.getCurrentSessionId() == null || sessionId.equals(user.getCurrentSessionId()))) {
                        // 세션이 유효한 경우 인증 설정
                        UserDetails userDetails = userDetailsService.loadUserByUsername(email);
                        
                        if (userDetails instanceof UserPrincipal) {
                            userPrincipal = (UserPrincipal) userDetails;
                            
                            // SecurityContext에 인증 설정
                            UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                                    userDetails, null, userDetails.getAuthorities());
                            authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                            SecurityContextHolder.getContext().setAuthentication(authToken);
                            
                            log.debug("Authentication set in SecurityContext from JWT token for user: {}", userPrincipal.getId());
                        }
                    } else {
                        log.warn("User not found or session invalid for email: {}", email);
                    }
                } else {
                    log.warn("JWT token is null or invalid");
                }
            }
            
            // 여전히 userPrincipal이 null이면 인증 실패
            if (userPrincipal == null) {
                response.setStatus(HttpStatus.UNAUTHORIZED.value());
                response.setContentType("application/json");
                response.getWriter().write("{\"error\":\"인증이 필요합니다.\"}");
                log.warn("Unauthenticated request to /api/image-upload from IP: {}", getClientIpAddress(request));
                return;
            }
            
            // 인증된 사용자: 사용자 ID 기반 rate limiting
            String rateLimitKey = "user:" + userPrincipal.getId();
            
            // 버킷 가져오기
            io.github.bucket4j.Bucket bucket = rateLimitingConfig.resolveBucket(rateLimitKey);
            
            // 토큰 소비 시도
            if (bucket.tryConsume(1)) {
                // 성공: 요청 허용
                long remainingTokens = bucket.getAvailableTokens();
                long resetTime = System.currentTimeMillis() + (60 * 1000); // 1분 후 리셋
                
                // Rate limit 정보를 응답 헤더에 추가
                response.setHeader(RATE_LIMIT_HEADER, String.valueOf(rateLimitingConfig.getMaxRequests()));
                response.setHeader(RATE_LIMIT_REMAINING, String.valueOf(remainingTokens));
                response.setHeader(RATE_LIMIT_RESET, String.valueOf(resetTime));
                
                log.debug("Rate limit check passed for user: {}, remaining: {}", userPrincipal.getId(), remainingTokens);
                filterChain.doFilter(request, response);
            } else {
                // 실패: Rate limit 초과
                long resetTime = System.currentTimeMillis() + (60 * 1000);
                
                response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                response.setContentType("application/json");
                response.setHeader(RATE_LIMIT_HEADER, String.valueOf(rateLimitingConfig.getMaxRequests()));
                response.setHeader(RATE_LIMIT_REMAINING, "0");
                response.setHeader(RATE_LIMIT_RESET, String.valueOf(resetTime));
                response.setHeader("Retry-After", "60");
                
                String errorMessage = String.format(
                    "{\"error\":\"요청 한도를 초과했습니다. 1분당 최대 %d개의 업로드만 허용됩니다.\"}",
                    rateLimitingConfig.getMaxRequests()
                );
                response.getWriter().write(errorMessage);
                
                log.warn("Rate limit exceeded for user: {}", userPrincipal.getId());
            }
        } catch (Exception e) {
            log.error("Error in rate limiting filter", e);
            // Rate limiting 오류가 발생해도 요청은 계속 진행 (fail-open)
            filterChain.doFilter(request, response);
        }
    }


    /**
     * 클라이언트의 실제 IP 주소를 가져옵니다.
     * 프록시나 로드 밸런서를 통한 요청도 처리합니다.
     * 
     * @param request HTTP 요청
     * @return 클라이언트 IP 주소
     */
    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            // X-Forwarded-For는 여러 IP를 포함할 수 있으므로 첫 번째 IP를 사용
            return xForwardedFor.split(",")[0].trim();
        }
        
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }
        
        return request.getRemoteAddr();
    }

    /**
     * HTTP 요청에서 JWT 토큰을 추출합니다.
     * 
     * @param request HTTP 요청
     * @return JWT 토큰 또는 null
     */
    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}

