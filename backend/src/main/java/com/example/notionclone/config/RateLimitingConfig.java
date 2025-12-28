package com.example.notionclone.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate Limiting 설정
 * 
 * 이미지 업로드 엔드포인트에 대한 rate limiting을 제공합니다.
 * - 인증된 사용자: 사용자 ID 기반
 * - 인증되지 않은 사용자: IP 주소 기반
 */
@Configuration
public class RateLimitingConfig {

    @Value("${rate-limit.upload.max-requests:10}")
    private int maxRequests;

    @Value("${rate-limit.upload.window-minutes:1}")
    private int windowMinutes;

    /**
     * Rate limiting을 위한 버킷 저장소
     * 키: 사용자 ID 또는 IP 주소
     */
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    /**
     * Rate limiting 버킷을 생성합니다.
     * 
     * @param key 사용자 ID 또는 IP 주소
     * @return Bucket 인스턴스
     */
    public Bucket resolveBucket(String key) {
        return buckets.computeIfAbsent(key, k -> createBucket());
    }

    /**
     * Rate limiting 버킷을 생성합니다.
     * 
     * @return 새 Bucket 인스턴스
     */
    private Bucket createBucket() {
        Refill refill = Refill.intervally(maxRequests, Duration.ofMinutes(windowMinutes));
        Bandwidth limit = Bandwidth.classic(maxRequests, refill);
        return Bucket.builder()
                .addLimit(limit)
                .build();
    }

    /**
     * 버킷을 제거합니다 (메모리 관리용).
     * 
     * @param key 사용자 ID 또는 IP 주소
     */
    public void removeBucket(String key) {
        buckets.remove(key);
    }

    /**
     * 모든 버킷을 제거합니다 (테스트용).
     */
    public void clearAllBuckets() {
        buckets.clear();
    }

    /**
     * 최대 요청 수를 반환합니다.
     * 
     * @return 최대 요청 수
     */
    public int getMaxRequests() {
        return maxRequests;
    }
}

