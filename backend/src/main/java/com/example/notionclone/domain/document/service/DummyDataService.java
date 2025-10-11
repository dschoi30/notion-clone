package com.example.notionclone.domain.document.service;

import com.example.notionclone.domain.document.entity.Document;
import com.example.notionclone.domain.document.entity.DocumentProperty;
import com.example.notionclone.domain.document.entity.PropertyType;
import com.example.notionclone.domain.document.entity.ViewType;
import com.example.notionclone.domain.workspace.entity.Workspace;
import com.example.notionclone.domain.document.repository.DocumentRepository;
import com.example.notionclone.domain.document.repository.DocumentPropertyRepository;
import com.example.notionclone.domain.workspace.repository.WorkspaceRepository;
import com.example.notionclone.domain.user.entity.User;
import com.example.notionclone.domain.user.entity.UserRole;
import com.example.notionclone.domain.user.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
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
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

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
    public Map<String, Object> generateBulkData(int count, int propertyCount, String dataType, String workspaceId, Long parentId) {
        try {
            System.out.println("🔍 DummyDataService - 받은 workspaceId: " + workspaceId);
            // 워크스페이스 확인/생성
            Workspace workspace = getOrCreateWorkspace(workspaceId);
            System.out.println("🔍 DummyDataService - 사용할 워크스페이스 ID: " + workspace.getId());
            
            // 먼저 문서 생성 (parentId 지정 시 해당 경로 아래 생성)
            List<Document> documents = createDocuments(workspace.getId().toString(), count, dataType, parentId);
            
            // 배치 인서트로 문서 저장
            long startTime = System.currentTimeMillis();
            documentRepository.saveAll(documents);
            long endTime = System.currentTimeMillis();
            
            // 각 문서에 속성 추가
            List<DocumentProperty> allProperties = new ArrayList<>();
            for (Document document : documents) {
                List<DocumentProperty> properties = createPropertiesForDocument(document, propertyCount);
                allProperties.addAll(properties);
            }
            documentPropertyRepository.saveAll(allProperties);
            
            Map<String, Object> result = new HashMap<>();
            result.put("documentCount", documents.size());
            result.put("propertyCount", allProperties.size());
            result.put("workspaceId", workspace.getId());
            result.put("insertTime", endTime - startTime);
            result.put("dataType", dataType);
            return result;
        } catch (Exception e) {
            e.printStackTrace(); // 디버깅을 위한 스택 트레이스 출력
            throw new RuntimeException("더미 데이터 생성 중 오류 발생: " + e.getMessage(), e);
        }
    }

    /**
     * 성능 테스트 실행
     */
    public Map<String, Object> runPerformanceTest(int testSize, String testType, Long parentId) {
        try {
            long startTime = System.currentTimeMillis();
            
            Map<String, Object> result = new HashMap<>();
            
            switch (testType) {
                case "scroll":
                    result = testScrollPerformance(testSize, parentId);
                    break;
                case "search":
                    result = testSearchPerformance(testSize, parentId);
                    break;
                case "sort":
                    result = testSortPerformance(testSize, parentId);
                    break;
                default:
                    result = testGeneralPerformance(testSize, parentId);
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
        if (workspaceId != null && !workspaceId.trim().isEmpty()) {
            return workspaceRepository.findById(Long.parseLong(workspaceId))
                .orElseThrow(() -> new RuntimeException("워크스페이스를 찾을 수 없습니다: " + workspaceId));
        }
        
        // 현재 사용자의 첫 번째 워크스페이스를 사용하거나 기본 워크스페이스 생성
        User dummyUser = createDummyUser();
        
        // 더미 사용자의 워크스페이스를 찾아보기
        List<Workspace> userWorkspaces = workspaceRepository.findByUser(dummyUser);
        if (!userWorkspaces.isEmpty()) {
            return userWorkspaces.get(0); // 첫 번째 워크스페이스 사용
        }
        
        // 워크스페이스가 없으면 새로 생성
        Workspace workspace = Workspace.builder()
            .name("테스트 워크스페이스")
            .user(dummyUser)
            .build();
        return workspaceRepository.save(workspace);
    }

    private List<DocumentProperty> createPropertiesForDocument(Document document, int count) {
        List<DocumentProperty> properties = new ArrayList<>();
        
        for (int i = 0; i < count; i++) {
            DocumentProperty property = DocumentProperty.builder()
                .document(document)
                .name("Dummy Property " + (i + 1))
                .type(PropertyType.valueOf(getRandomPropertyType().toUpperCase()))
                .sortOrder(i + 1)
                .build();
            properties.add(property);
        }
        
        return properties;
    }

    private List<Document> createDocuments(String workspaceId, int count, String dataType, Long parentId) {
        List<Document> documents = new ArrayList<>();
        
        // 워크스페이스 조회
        Workspace workspace = workspaceRepository.findById(Long.parseLong(workspaceId))
            .orElseThrow(() -> new RuntimeException("워크스페이스를 찾을 수 없습니다: " + workspaceId));
        
        // 소유자는 현재 사용자 (없으면 더미)
        User owner = getCurrentUserOrDummy();
        Document parent = null;
        if (parentId != null) {
            parent = documentRepository.findById(parentId)
                .orElseThrow(() -> new RuntimeException("부모 문서를 찾을 수 없습니다: " + parentId));
        }
        
        for (int i = 0; i < count; i++) {
            Document document = Document.builder()
                .title("Dummy Document " + (i + 1) + " - " + getRandomTitle())
                .content(generateContent(dataType))
                .viewType(ViewType.PAGE)
                .workspace(workspace)
                .user(owner)
                .sortOrder(i + 1)
                .parent(parent)
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

    private User createDummyUser() {
        // 더미 사용자가 이미 존재하는지 확인
        String dummyEmail = "dummy@test.com";
        return userRepository.findByEmail(dummyEmail)
            .orElseGet(() -> {
                try {
                    User dummyUser = new User();
                    dummyUser.setEmail(dummyEmail);
                    dummyUser.setName("Dummy User");
                    dummyUser.setPassword("dummy"); // 테스트용 평문 저장
                    dummyUser.setRole(UserRole.USER);
                    return userRepository.save(dummyUser);
                } catch (Exception e) {
                    e.printStackTrace();
                    throw new RuntimeException("Failed to create dummy user: " + e.getMessage(), e);
                }
            });
    }

    private String generateRandomContent() {
        return "랜덤 콘텐츠 " + UUID.randomUUID().toString();
    }

    private String getRandomPropertyType() {
        String[] types = {"TEXT", "NUMBER", "DATE", "TAG"};
        return types[ThreadLocalRandom.current().nextInt(types.length)];
    }

    private User getCurrentUserOrDummy() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated()) {
                String email = null;
                Object principal = auth.getPrincipal();
                if (principal instanceof UserDetails) {
                    email = ((UserDetails) principal).getUsername();
                } else if (principal instanceof String) {
                    email = (String) principal;
                }
                if (email != null && !email.isBlank()) {
                    return userRepository.findByEmail(email).orElseGet(this::createDummyUser);
                }
            }
        } catch (Exception ignored) {}
        return createDummyUser();
    }

    private Map<String, Object> testScrollPerformance(int testSize, Long parentId) {
        long startTime = System.currentTimeMillis();
        
        // 스크롤 성능 테스트 시뮬레이션
        List<Document> documents = (parentId == null)
            ? documentRepository.findAll()
            : documentRepository.findByParentIdAndIsTrashedFalse(parentId);
        int actualSize = Math.min(testSize, documents.size());
        
        long endTime = System.currentTimeMillis();
        
        return Map.of(
            "scrollTestTime", endTime - startTime,
            "documentsProcessed", actualSize,
            "averageTimePerDocument", (endTime - startTime) / Math.max(actualSize, 1)
        );
    }

    private Map<String, Object> testSearchPerformance(int testSize, Long parentId) {
        long startTime = System.currentTimeMillis();
        
        // 검색 성능 테스트
        String searchTerm = "Dummy";
        List<Document> results = documentRepository.findByTitleContainingIgnoreCase(searchTerm);
        if (parentId != null) {
            results.removeIf(d -> d.getParent() == null || !parentId.equals(d.getParent().getId()));
        }
        
        long endTime = System.currentTimeMillis();
        
        return Map.of(
            "searchTestTime", endTime - startTime,
            "searchResults", results.size(),
            "searchTerm", searchTerm
        );
    }

    private Map<String, Object> testSortPerformance(int testSize, Long parentId) {
        long startTime = System.currentTimeMillis();
        
        // 정렬 성능 테스트
        List<Document> documents = (parentId == null)
            ? documentRepository.findAll()
            : documentRepository.findByParentIdAndIsTrashedFalse(parentId);
        documents.sort(Comparator.comparing(Document::getTitle));
        
        long endTime = System.currentTimeMillis();
        
        return Map.of(
            "sortTestTime", endTime - startTime,
            "documentsSorted", documents.size()
        );
    }

    private Map<String, Object> testGeneralPerformance(int testSize, Long parentId) {
        long startTime = System.currentTimeMillis();
        
        // 일반 성능 테스트
        List<Document> documents = (parentId == null)
            ? documentRepository.findAll()
            : documentRepository.findByParentIdAndIsTrashedFalse(parentId);
        
        long endTime = System.currentTimeMillis();
        
        return Map.of(
            "generalTestTime", endTime - startTime,
            "documentsProcessed", documents.size()
        );
    }
}
