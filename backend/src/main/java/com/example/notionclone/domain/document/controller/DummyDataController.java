package com.example.notionclone.domain.document.controller;

import com.example.notionclone.domain.document.repository.DocumentRepository;
import com.example.notionclone.domain.document.repository.DocumentPropertyRepository;
import com.example.notionclone.domain.document.service.DummyDataService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/dummy")
@CrossOrigin(origins = "*")
public class DummyDataController {

    @Autowired
    private DummyDataService dummyDataService;

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private DocumentPropertyRepository documentPropertyRepository;


    /**
     * 대량 더미 데이터 생성 (관리자만)
     */
    @PostMapping("/generate-bulk")
    // @PreAuthorize("hasRole('ADMIN')") // 테스트용으로 임시 비활성화
    public ResponseEntity<Map<String, Object>> generateBulkData(
            @RequestParam(defaultValue = "10000") int count,
            @RequestParam(defaultValue = "5") int propertyCount,
            @RequestParam(defaultValue = "realistic") String dataType,
            @RequestParam(required = false) String workspaceId,
            @RequestParam(required = false) Long parentId
    ) {
        try {
            long startTime = System.currentTimeMillis();
            
            // 배치 인서트로 대량 데이터 생성
            Map<String, Object> result = dummyDataService.generateBulkData(
                count, propertyCount, dataType, workspaceId, parentId
            );
            
            long endTime = System.currentTimeMillis();
            result.put("executionTime", endTime - startTime);
            result.put("success", true);
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage() != null ? e.getMessage() : ("Unknown error: " + e.getClass().getSimpleName())
            ));
        }
    }

    /**
     * 성능 테스트 실행 (관리자만)
     */
    @PostMapping("/performance-test")
    // @PreAuthorize("hasRole('ADMIN')") // 테스트용으로 임시 비활성화
    public ResponseEntity<Map<String, Object>> runPerformanceTest(
            @RequestParam(defaultValue = "1000") int testSize,
            @RequestParam(defaultValue = "scroll") String testType,
            @RequestParam(required = false) Long parentId
    ) {
        try {
            Map<String, Object> result = dummyDataService.runPerformanceTest(testSize, testType, parentId);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage() != null ? e.getMessage() : ("Unknown error: " + e.getClass().getSimpleName())
            ));
        }
    }

    /**
     * 더미 데이터 상태 확인
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getDummyDataStatus() {
        try {
            long documentCount = documentRepository.count();
            long propertyCount = documentPropertyRepository.count();
            
            return ResponseEntity.ok(Map.of(
                "documentCount", documentCount,
                "propertyCount", propertyCount,
                "success", true
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage() != null ? e.getMessage() : ("Unknown error: " + e.getClass().getSimpleName())
            ));
        }
    }

    /**
     * 더미 데이터 삭제 (관리자만)
     */
    @DeleteMapping("/clear")
    // @PreAuthorize("hasRole('ADMIN')") // 테스트용으로 임시 비활성화
    public ResponseEntity<Map<String, Object>> clearDummyData() {
        try {
            long startTime = System.currentTimeMillis();
            
            // 더미 데이터 삭제 (배치 삭제)
            dummyDataService.clearDummyData();
            
            long endTime = System.currentTimeMillis();
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "executionTime", endTime - startTime,
                "message", "더미 데이터가 삭제되었습니다."
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage() != null ? e.getMessage() : ("Unknown error: " + e.getClass().getSimpleName())
            ));
        }
    }

    /**
     * 데이터베이스 최적화 (관리자만)
     */
    @PostMapping("/optimize")
    // @PreAuthorize("hasRole('ADMIN')") // 테스트용으로 임시 비활성화
    public ResponseEntity<Map<String, Object>> optimizeDatabase() {
        try {
            dummyDataService.optimizeDatabase();
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "데이터베이스가 최적화되었습니다."
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage() != null ? e.getMessage() : ("Unknown error: " + e.getClass().getSimpleName())
            ));
        }
    }
}
