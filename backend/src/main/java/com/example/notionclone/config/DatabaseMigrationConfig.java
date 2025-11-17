package com.example.notionclone.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * 데이터베이스 스키마 마이그레이션을 처리하는 컴포넌트
 * 애플리케이션 시작 시 필요한 컬럼이 없으면 자동으로 추가
 */
@Slf4j
@Component
@RequiredArgsConstructor
@Order(1) // 다른 초기화 컴포넌트보다 먼저 실행
public class DatabaseMigrationConfig {

    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void migrateDatabase() {
        try {
            log.info("데이터베이스 마이그레이션 시작");

            // users 테이블에 is_active 컬럼 추가 (없는 경우에만)
            addColumnIfNotExists("users", "is_active", "BOOLEAN NOT NULL DEFAULT true");

            log.info("데이터베이스 마이그레이션 완료");
        } catch (Exception e) {
            log.error("데이터베이스 마이그레이션 중 오류 발생: " + e.getMessage(), e);
            // 마이그레이션 실패해도 애플리케이션은 계속 실행되도록 함
        }
    }

    /**
     * 컬럼이 존재하지 않으면 추가
     */
    private void addColumnIfNotExists(String tableName, String columnName, String columnDefinition) {
        try {
            // PostgreSQL에서 컬럼 존재 여부 확인
            String checkColumnSql = String.format(
                "SELECT COUNT(*) FROM information_schema.columns " +
                "WHERE table_name = '%s' AND column_name = '%s'",
                tableName, columnName
            );

            Integer count = jdbcTemplate.queryForObject(checkColumnSql, Integer.class);
            
            if (count == null || count == 0) {
                // 컬럼이 없으면 추가
                String alterTableSql = String.format(
                    "ALTER TABLE %s ADD COLUMN %s %s",
                    tableName, columnName, columnDefinition
                );
                jdbcTemplate.update(alterTableSql);
                log.info("컬럼 추가 완료: {}.{}", tableName, columnName);
            } else {
                log.debug("컬럼이 이미 존재함: {}.{}", tableName, columnName);
            }
        } catch (Exception e) {
            // 컬럼이 이미 존재하거나 다른 이유로 실패한 경우
            log.warn("컬럼 추가 실패 (이미 존재할 수 있음): {}.{} - {}", 
                tableName, columnName, e.getMessage());
        }
    }
}

