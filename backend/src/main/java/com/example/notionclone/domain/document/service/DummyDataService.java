package com.example.notionclone.domain.document.service;

import com.example.notionclone.domain.document.entity.Document;
import com.example.notionclone.domain.document.entity.DocumentProperty;
import com.example.notionclone.domain.document.entity.PropertyType;
import com.example.notionclone.domain.document.entity.ViewType;
import com.example.notionclone.domain.workspace.entity.Workspace;
import com.example.notionclone.domain.document.repository.DocumentRepository;
import com.example.notionclone.domain.document.repository.DocumentPropertyRepository;
import com.example.notionclone.domain.workspace.repository.WorkspaceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class DummyDataService {

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private DocumentPropertyRepository documentPropertyRepository;

    @Autowired
    private WorkspaceRepository workspaceRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private static final String[] SAMPLE_TITLES = {
        "프로젝트 계획서", "회의록", "기술 문서", "사용자 가이드", "API 문서",
        "데이터 분석 보고서", "마케팅 전략", "제품 요구사항", "테스트 케이스", "운영 매뉴얼",
        "고객 피드백", "성능 분석", "보안 정책", "재무 보고서", "인사 관리",
        "교육 자료", "프레젠테이션", "설계 문서", "코드 리뷰", "배포 가이드"
    };

    private static final String[] SAMPLE_TEXTS = {
        "이 문서는 중요한 정보를 포함하고 있습니다.",
        "프로젝트의 핵심 내용을 정리한 문서입니다.",
        "사용자 경험을 개선하기 위한 제안사항입니다.",
        "기술적 구현 방안에 대한 상세 설명입니다.",
        "비즈니스 요구사항을 충족하는 솔루션입니다."
    };

    // SAMPLE_TAGS는 현재 사용되지 않으므로 제거

    /**
     * 대량 더미 데이터 생성 (배치 인서트)
     */
    @Transactional
    public Map<String, Object> generateBulkData(int count, int propertyCount, String dataType, String workspaceId) {
        try {
            // 워크스페이스 확인/생성
            Workspace workspace = getOrCreateWorkspace(workspaceId);
            
            // 속성 생성
            List<DocumentProperty> properties = createProperties(workspace.getId().toString(), propertyCount);
            documentPropertyRepository.saveAll(properties);
            
            // 배치 인서트로 문서 생성
            List<Document> documents = createDocuments(workspace.getId().toString(), count, dataType);
            
            // 배치 인서트 실행
            long startTime = System.currentTimeMillis();
            documentRepository.saveAll(documents);
            long endTime = System.currentTimeMillis();
            
            return Map.of(
                "documentCount", documents.size(),
                "propertyCount", properties.size(),
                "workspaceId", workspace.getId(),
                "insertTime", endTime - startTime,
                "dataType", dataType
            );
        } catch (Exception e) {
            throw new RuntimeException("더미 데이터 생성 중 오류 발생: " + e.getMessage(), e);
        }
    }

    /**
     * 성능 테스트 실행
     */
    public Map<String, Object> runPerformanceTest(int testSize, String testType) {
        try {
            long startTime = System.currentTimeMillis();
            
            Map<String, Object> result = new HashMap<>();
            
            switch (testType) {
                case "scroll":
                    result = testScrollPerformance(testSize);
                    break;
                case "search":
                    result = testSearchPerformance(testSize);
                    break;
                case "sort":
                    result = testSortPerformance(testSize);
                    break;
                default:
                    result = testGeneralPerformance(testSize);
            }
            
            long endTime = System.currentTimeMillis();
            result.put("totalExecutionTime", endTime - startTime);
            result.put("testType", testType);
            result.put("testSize", testSize);
            
            return result;
        } catch (Exception e) {
            throw new RuntimeException("성능 테스트 실행 중 오류 발생: " + e.getMessage(), e);
        }
    }

    /**
     * 더미 데이터 삭제
     */
    @Transactional
    public void clearDummyData() {
        try {
            // 배치 삭제로 성능 최적화
            jdbcTemplate.update("DELETE FROM document_properties WHERE property_name LIKE 'Dummy%'");
            jdbcTemplate.update("DELETE FROM documents WHERE title LIKE 'Dummy%'");
        } catch (Exception e) {
            throw new RuntimeException("더미 데이터 삭제 중 오류 발생: " + e.getMessage(), e);
        }
    }

    /**
     * 데이터베이스 최적화
     */
    public void optimizeDatabase() {
        try {
            // 인덱스 생성
            jdbcTemplate.update("CREATE INDEX IF NOT EXISTS idx_documents_title ON documents(title)");
            jdbcTemplate.update("CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at)");
            jdbcTemplate.update("CREATE INDEX IF NOT EXISTS idx_documents_workspace_id ON documents(workspace_id)");
            
            // 통계 업데이트
            jdbcTemplate.update("ANALYZE TABLE documents");
            jdbcTemplate.update("ANALYZE TABLE document_properties");
        } catch (Exception e) {
            throw new RuntimeException("데이터베이스 최적화 중 오류 발생: " + e.getMessage(), e);
        }
    }

    private Workspace getOrCreateWorkspace(String workspaceId) {
        if (workspaceId != null) {
            return workspaceRepository.findById(Long.parseLong(workspaceId))
                .orElseThrow(() -> new RuntimeException("워크스페이스를 찾을 수 없습니다: " + workspaceId));
        }
        
        // 기본 워크스페이스 생성
        Workspace workspace = Workspace.builder()
            .name("테스트 워크스페이스")
            .build();
        return workspaceRepository.save(workspace);
    }

    private List<DocumentProperty> createProperties(String workspaceId, int count) {
        List<DocumentProperty> properties = new ArrayList<>();
        
        for (int i = 0; i < count; i++) {
            DocumentProperty property = DocumentProperty.builder()
                .name("Dummy Property " + (i + 1))
                .type(PropertyType.valueOf(getRandomPropertyType().toUpperCase()))
                .build();
            properties.add(property);
        }
        
        return properties;
    }

    private List<Document> createDocuments(String workspaceId, int count, String dataType) {
        List<Document> documents = new ArrayList<>();
        
        for (int i = 0; i < count; i++) {
            Document document = Document.builder()
                .title("Dummy Document " + (i + 1) + " - " + getRandomTitle())
                .content(generateContent(dataType))
                .viewType(ViewType.TABLE)
                .build();
            documents.add(document);
        }
        
        return documents;
    }

    private String getRandomTitle() {
        return SAMPLE_TITLES[ThreadLocalRandom.current().nextInt(SAMPLE_TITLES.length)];
    }

    private String generateContent(String dataType) {
        switch (dataType) {
            case "realistic":
                return generateRealisticContent();
            case "stress":
                return generateStressContent();
            case "random":
                return generateRandomContent();
            default:
                return generateRealisticContent();
        }
    }

    private String generateRealisticContent() {
        StringBuilder content = new StringBuilder();
        int paragraphCount = ThreadLocalRandom.current().nextInt(3, 8);
        
        for (int i = 0; i < paragraphCount; i++) {
            content.append(SAMPLE_TEXTS[ThreadLocalRandom.current().nextInt(SAMPLE_TEXTS.length)]);
            content.append(" ");
        }
        
        return content.toString();
    }

    private String generateStressContent() {
        StringBuilder content = new StringBuilder();
        int paragraphCount = ThreadLocalRandom.current().nextInt(10, 20);
        
        for (int i = 0; i < paragraphCount; i++) {
            content.append("스트레스 테스트용 긴 텍스트입니다. ".repeat(50));
            content.append("\n");
        }
        
        return content.toString();
    }

    private String generateRandomContent() {
        return "랜덤 콘텐츠 " + UUID.randomUUID().toString();
    }

    private String getRandomPropertyType() {
        String[] types = {"TEXT", "NUMBER", "DATE", "SELECT", "MULTI_SELECT", "CHECKBOX"};
        return types[ThreadLocalRandom.current().nextInt(types.length)];
    }

    private Map<String, Object> testScrollPerformance(int testSize) {
        long startTime = System.currentTimeMillis();
        
        // 스크롤 성능 테스트 시뮬레이션
        List<Document> documents = documentRepository.findAll();
        int actualSize = Math.min(testSize, documents.size());
        
        long endTime = System.currentTimeMillis();
        
        return Map.of(
            "scrollTestTime", endTime - startTime,
            "documentsProcessed", actualSize,
            "averageTimePerDocument", (endTime - startTime) / Math.max(actualSize, 1)
        );
    }

    private Map<String, Object> testSearchPerformance(int testSize) {
        long startTime = System.currentTimeMillis();
        
        // 검색 성능 테스트
        String searchTerm = "Dummy";
        List<Document> results = documentRepository.findByTitleContainingIgnoreCase(searchTerm);
        
        long endTime = System.currentTimeMillis();
        
        return Map.of(
            "searchTestTime", endTime - startTime,
            "searchResults", results.size(),
            "searchTerm", searchTerm
        );
    }

    private Map<String, Object> testSortPerformance(int testSize) {
        long startTime = System.currentTimeMillis();
        
        // 정렬 성능 테스트
        List<Document> documents = documentRepository.findAll();
        documents.sort(Comparator.comparing(Document::getTitle));
        
        long endTime = System.currentTimeMillis();
        
        return Map.of(
            "sortTestTime", endTime - startTime,
            "documentsSorted", documents.size()
        );
    }

    private Map<String, Object> testGeneralPerformance(int testSize) {
        long startTime = System.currentTimeMillis();
        
        // 일반 성능 테스트
        List<Document> documents = documentRepository.findAll();
        
        long endTime = System.currentTimeMillis();
        
        return Map.of(
            "generalTestTime", endTime - startTime,
            "documentsProcessed", documents.size()
        );
    }
}
