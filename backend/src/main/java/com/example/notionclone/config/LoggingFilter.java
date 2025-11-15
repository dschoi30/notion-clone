package com.example.notionclone.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * 요청 추적을 위한 MDC 필터
 * 각 HTTP 요청에 고유한 추적 ID를 생성하고 MDC에 저장합니다.
 */
@Slf4j
@Component
@Order(1)
public class LoggingFilter extends OncePerRequestFilter {

    private static final String TRACE_ID_KEY = "traceId";
    private static final String REQUEST_ID_HEADER = "X-Request-Id";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            // 요청 ID 생성 또는 헤더에서 가져오기
            String traceId = request.getHeader(REQUEST_ID_HEADER);
            if (traceId == null || traceId.isEmpty()) {
                traceId = UUID.randomUUID().toString().replace("-", "").substring(0, 16);
            }

            // MDC에 추적 ID 저장
            MDC.put(TRACE_ID_KEY, traceId);
            
            // 응답 헤더에 추적 ID 추가
            response.setHeader(REQUEST_ID_HEADER, traceId);

            // 요청 정보를 MDC에 추가
            MDC.put("requestMethod", request.getMethod());
            MDC.put("requestUri", request.getRequestURI());
            MDC.put("remoteAddr", getRemoteAddr(request));

            // 사용자 정보가 있으면 추가
            if (request.getUserPrincipal() != null) {
                MDC.put("userId", request.getUserPrincipal().getName());
            }

            filterChain.doFilter(request, response);
        } finally {
            // 요청 완료 후 MDC 정리
            MDC.clear();
        }
    }

    /**
     * 클라이언트의 실제 IP 주소를 가져옵니다.
     * 프록시나 로드 밸런서를 통한 요청도 처리합니다.
     */
    private String getRemoteAddr(HttpServletRequest request) {
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
}

