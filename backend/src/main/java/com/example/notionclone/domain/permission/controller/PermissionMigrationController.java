package com.example.notionclone.domain.permission.controller;

import com.example.notionclone.domain.permission.service.PermissionMigrationService;
import com.example.notionclone.domain.permission.service.PermissionMigrationService.MigrationStatus;
import com.example.notionclone.security.annotation.RequireRole;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 권한 시스템 마이그레이션 컨트롤러
 * 기존 Permission 시스템을 워크스페이스 역할 시스템과 통합
 */
@RestController
@RequestMapping("/api/admin/permission-migration")
@RequiredArgsConstructor
@Slf4j
public class PermissionMigrationController {

    private final PermissionMigrationService migrationService;

    /**
     * 마이그레이션 상태 확인
     */
    @GetMapping("/status")
    @RequireRole(roles = {"SUPER_ADMIN", "ADMIN"})
    public ResponseEntity<MigrationStatus> getMigrationStatus() {
        MigrationStatus status = migrationService.getMigrationStatus();
        return ResponseEntity.ok(status);
    }

    /**
     * 문서별 권한을 워크스페이스 멤버십으로 마이그레이션
     */
    @PostMapping("/migrate-to-workspace-memberships")
    @RequireRole(roles = {"SUPER_ADMIN"})
    public ResponseEntity<String> migrateToWorkspaceMemberships() {
        try {
            migrationService.migrateDocumentPermissionsToWorkspaceMemberships();
            return ResponseEntity.ok("문서별 권한을 워크스페이스 멤버십으로 마이그레이션 완료");
        } catch (Exception e) {
            log.error("마이그레이션 실패", e);
            return ResponseEntity.internalServerError()
                    .body("마이그레이션 실패: " + e.getMessage());
        }
    }

    /**
     * 워크스페이스 소유자 설정
     */
    @PostMapping("/set-workspace-owners")
    @RequireRole(roles = {"SUPER_ADMIN"})
    public ResponseEntity<String> setWorkspaceOwners() {
        try {
            migrationService.setWorkspaceOwners();
            return ResponseEntity.ok("워크스페이스 소유자 설정 완료");
        } catch (Exception e) {
            log.error("워크스페이스 소유자 설정 실패", e);
            return ResponseEntity.internalServerError()
                    .body("워크스페이스 소유자 설정 실패: " + e.getMessage());
        }
    }

    /**
     * 중복 권한 정리
     */
    @PostMapping("/cleanup-duplicates")
    @RequireRole(roles = {"SUPER_ADMIN"})
    public ResponseEntity<String> cleanupDuplicatePermissions() {
        try {
            migrationService.cleanupDuplicatePermissions();
            return ResponseEntity.ok("중복 권한 정리 완료");
        } catch (Exception e) {
            log.error("중복 권한 정리 실패", e);
            return ResponseEntity.internalServerError()
                    .body("중복 권한 정리 실패: " + e.getMessage());
        }
    }

    /**
     * 전체 마이그레이션 실행
     */
    @PostMapping("/full-migration")
    @RequireRole(roles = {"SUPER_ADMIN"})
    public ResponseEntity<String> executeFullMigration() {
        try {
            log.info("전체 권한 시스템 마이그레이션 시작");
            
            // 1. 문서별 권한을 워크스페이스 멤버십으로 마이그레이션
            migrationService.migrateDocumentPermissionsToWorkspaceMemberships();
            
            // 2. 워크스페이스 소유자 설정
            migrationService.setWorkspaceOwners();
            
            // 3. 중복 권한 정리
            migrationService.cleanupDuplicatePermissions();
            
            log.info("전체 권한 시스템 마이그레이션 완료");
            return ResponseEntity.ok("전체 마이그레이션 완료");
            
        } catch (Exception e) {
            log.error("전체 마이그레이션 실패", e);
            return ResponseEntity.internalServerError()
                    .body("전체 마이그레이션 실패: " + e.getMessage());
        }
    }
}
