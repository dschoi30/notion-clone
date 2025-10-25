package com.example.notionclone.domain.document.service;

import com.example.notionclone.domain.document.entity.Document;
import com.example.notionclone.domain.document.entity.DocumentProperty;
import com.example.notionclone.domain.document.entity.DocumentPropertyValue;
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

import lombok.extern.slf4j.Slf4j;
@Service
@Slf4j
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
            log.info("🔍 DummyDataService - 받은 workspaceId: " + workspaceId);
            // 워크스페이스 확인/생성
            Workspace workspace = getOrCreateWorkspace(workspaceId);
            log.info("🔍 DummyDataService - 사용할 워크스페이스 ID: " + workspace.getId());

            // 부모 문서에 속성 추가 (parentId가 있는 경우)
            List<DocumentProperty> parentProperties = new ArrayList<>();
            if (parentId != null) {
                // 부모 문서 조회
                Document parentDocument = documentRepository.findById(parentId)
                        .orElseThrow(() -> new RuntimeException("부모 문서를 찾을 수 없습니다: " + parentId));
                
                // 부모 문서에 새로운 속성 추가
                List<DocumentProperty> newParentProperties = createPropertiesForParentDocument(parentDocument, propertyCount);
                documentPropertyRepository.saveAll(newParentProperties);
                
                // 부모 문서의 모든 속성 조회 (기존 + 새로 추가된 속성)
                parentProperties = getParentDocumentProperties(parentId);
                
                // 부모 문서의 새로 추가된 속성에 더미 값 생성
                createDummyValuesForProperties(newParentProperties, parentDocument);
                
                log.info("🔍 부모 문서에 추가된 속성 개수: " + newParentProperties.size());
                log.info("🔍 부모 문서 전체 속성 개수: " + parentProperties.size());
            } else {
                // 루트 경로인 경우: 문서에 직접 속성 생성할 속성 정의 생성
                parentProperties = createRootProperties(propertyCount);
                log.info("🔍 루트 경로 - 생성할 속성 개수: " + parentProperties.size());
            }

            // 먼저 문서 생성 (parentId 지정 시 해당 경로 아래 생성)
            List<Document> documents = createDocuments(workspace.getId().toString(), count, dataType, parentId);

            // 배치 인서트로 문서 저장
            long startTime = System.currentTimeMillis();
            documentRepository.saveAll(documents);
            long endTime = System.currentTimeMillis();

            // 각 문서에 속성 추가 (부모 속성 상속)
            List<DocumentProperty> allProperties = new ArrayList<>();
            for (Document document : documents) {
                List<DocumentProperty> properties = createInheritedPropertiesForDocument(document, parentProperties);
                allProperties.addAll(properties);
            }
            documentPropertyRepository.saveAll(allProperties);
            
            // 자식 문서의 속성에 더미 값 생성
            createDummyValuesForChildDocuments(documents, parentProperties);

            Map<String, Object> result = new HashMap<>();
            result.put("documentCount", documents.size());
            result.put("propertyCount", allProperties.size());
            result.put("workspaceId", workspace.getId());
            result.put("insertTime", endTime - startTime);
            result.put("dataType", dataType);
            result.put("inheritedProperties", parentProperties.size());
            result.put("parentPropertiesAdded", parentId != null ? propertyCount : 0);
            return result;
        } catch (Exception e) {
            e.printStackTrace(); // 디버깅을 위한 스택 트레이스 출력
            throw new RuntimeException("더미 데이터 생성 중 오류 발생: " + e.getMessage(), e);
        }
    }


    /**
     * 더미 데이터 삭제
     */
    @Transactional
    public void clearDummyData() {
        try {
            log.info("더미 데이터 삭제 시작");
            
            // 외래키 제약조건을 고려한 삭제 순서
            // 1. document_property_values에서 document_id로 직접 참조하는 값들 삭제
            int deletedValuesByDocument = jdbcTemplate.update("DELETE FROM document_property_values WHERE document_id IN (SELECT id FROM documents WHERE title LIKE 'Dummy%')");
            log.info("문서 ID로 삭제된 속성 값 개수: " + deletedValuesByDocument);
            
            // 2. document_property_values에서 property_id로 참조하는 값들 삭제
            int deletedValuesByProperty = jdbcTemplate.update("DELETE FROM document_property_values WHERE property_id IN (SELECT id FROM document_properties WHERE name LIKE 'Dummy%')");
            log.info("속성 ID로 삭제된 속성 값 개수: " + deletedValuesByProperty);
            
            // 3. document_versions에서 document_id로 참조하는 버전들 삭제
            int deletedVersions = jdbcTemplate.update("DELETE FROM document_versions WHERE document_id IN (SELECT id FROM documents WHERE title LIKE 'Dummy%')");
            log.info("삭제된 문서 버전 개수: " + deletedVersions);
            
            // 4. document_properties에서 document_id로 직접 참조하는 속성들 삭제
            int deletedPropertiesByDocument = jdbcTemplate.update("DELETE FROM document_properties WHERE document_id IN (SELECT id FROM documents WHERE title LIKE 'Dummy%')");
            log.info("문서 ID로 삭제된 속성 개수: " + deletedPropertiesByDocument);
            
            // 5. document_properties에서 name LIKE 'Dummy%'인 속성들 삭제
            int deletedPropertiesByName = jdbcTemplate.update("DELETE FROM document_properties WHERE name LIKE 'Dummy%'");
            log.info("이름으로 삭제된 속성 개수: " + deletedPropertiesByName);
            
            // 6. 문서 삭제 (가장 상위)
            int deletedDocuments = jdbcTemplate.update("DELETE FROM documents WHERE title LIKE 'Dummy%'");
            log.info("삭제된 문서 개수: " + deletedDocuments);
            
            log.info("더미 데이터 삭제 완료");
        } catch (Exception e) {
            log.error("더미 데이터 삭제 중 오류 발생: " + e.getMessage(), e);
            throw new RuntimeException("더미 데이터 삭제 중 오류 발생: " + e.getMessage(), e);
        }
    }

    /**
     * 데이터베이스 최적화
     */
    public void optimizeDatabase() {
        try {
            log.info("데이터베이스 최적화 시작");
            
            // 인덱스 생성 (PostgreSQL용)
            try {
                jdbcTemplate.update("CREATE INDEX IF NOT EXISTS idx_documents_title ON documents(title)");
                log.info("인덱스 생성 완료: idx_documents_title");
            } catch (Exception e) {
                log.warn("인덱스 생성 실패 (이미 존재할 수 있음): idx_documents_title - " + e.getMessage());
            }
            
            try {
                jdbcTemplate.update("CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at)");
                log.info("인덱스 생성 완료: idx_documents_created_at");
            } catch (Exception e) {
                log.warn("인덱스 생성 실패 (이미 존재할 수 있음): idx_documents_created_at - " + e.getMessage());
            }
            
            try {
                jdbcTemplate.update("CREATE INDEX IF NOT EXISTS idx_documents_workspace_id ON documents(workspace_id)");
                log.info("인덱스 생성 완료: idx_documents_workspace_id");
            } catch (Exception e) {
                log.warn("인덱스 생성 실패 (이미 존재할 수 있음): idx_documents_workspace_id - " + e.getMessage());
            }
            
            try {
                jdbcTemplate.update("CREATE INDEX IF NOT EXISTS idx_documents_parent_id ON documents(parent_id)");
                log.info("인덱스 생성 완료: idx_documents_parent_id");
            } catch (Exception e) {
                log.warn("인덱스 생성 실패 (이미 존재할 수 있음): idx_documents_parent_id - " + e.getMessage());
            }
            
            try {
                jdbcTemplate.update("CREATE INDEX IF NOT EXISTS idx_documents_is_trashed ON documents(is_trashed)");
                log.info("인덱스 생성 완료: idx_documents_is_trashed");
            } catch (Exception e) {
                log.warn("인덱스 생성 실패 (이미 존재할 수 있음): idx_documents_is_trashed - " + e.getMessage());
            }

            // PostgreSQL 통계 업데이트
            try {
                jdbcTemplate.update("ANALYZE documents");
                log.info("통계 업데이트 완료: documents");
            } catch (Exception e) {
                log.warn("통계 업데이트 실패: documents - " + e.getMessage());
            }
            
            try {
                jdbcTemplate.update("ANALYZE document_properties");
                log.info("통계 업데이트 완료: document_properties");
            } catch (Exception e) {
                log.warn("통계 업데이트 실패: document_properties - " + e.getMessage());
            }
            
            try {
                jdbcTemplate.update("ANALYZE document_property_values");
                log.info("통계 업데이트 완료: document_property_values");
            } catch (Exception e) {
                log.warn("통계 업데이트 실패: document_property_values - " + e.getMessage());
            }
            
            log.info("데이터베이스 최적화 완료");
        } catch (Exception e) {
            log.error("데이터베이스 최적화 중 오류 발생: " + e.getMessage(), e);
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

    /**
     * 부모 문서의 속성을 조회
     */
    private List<DocumentProperty> getParentDocumentProperties(Long parentId) {
        try {
            Document parentDocument = documentRepository.findById(parentId)
                    .orElseThrow(() -> new RuntimeException("부모 문서를 찾을 수 없습니다: " + parentId));
            
            return documentPropertyRepository.findByDocumentOrderBySortOrder(parentDocument);
        } catch (Exception e) {
            System.err.println("부모 문서 속성 조회 실패: " + e.getMessage());
            return new ArrayList<>();
        }
    }

    /**
     * 부모 문서에 새로운 속성 생성
     */
    private List<DocumentProperty> createPropertiesForParentDocument(Document parentDocument, int propertyCount) {
        List<DocumentProperty> properties = new ArrayList<>();
        
        // 부모 문서의 기존 속성 개수 확인
        List<DocumentProperty> existingProperties = getParentDocumentProperties(parentDocument.getId());
        int startSortOrder = existingProperties.size() + 1;
        
        for (int i = 0; i < propertyCount; i++) {
            String propertyName = "Dummy Property " + (i + 1);
            PropertyType propertyType = PropertyType.valueOf(getRandomPropertyType().toUpperCase());
            
            DocumentProperty property = DocumentProperty.builder()
                    .document(parentDocument)
                    .name(propertyName)
                    .type(propertyType)
                    .sortOrder(startSortOrder + i)
                    .build();
            properties.add(property);
        }
        
        return properties;
    }

    /**
     * 자식 문서에 부모 속성 상속
     */
    private List<DocumentProperty> createInheritedPropertiesForDocument(Document document, List<DocumentProperty> parentProperties) {
        List<DocumentProperty> properties = new ArrayList<>();
        int sortOrder = 1;

        // 부모 문서의 모든 속성을 상속 (복사)
        for (DocumentProperty parentProperty : parentProperties) {
            DocumentProperty inheritedProperty = DocumentProperty.builder()
                    .document(document)
                    .name(parentProperty.getName())
                    .type(parentProperty.getType())
                    .sortOrder(sortOrder++)
                    .build();
            properties.add(inheritedProperty);
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

    /**
     * 속성 타입에 따른 더미 값 생성
     */
    private String generateDummyValue(PropertyType propertyType) {
        switch (propertyType) {
            case TEXT:
                return generateRandomText();
            case NUMBER:
                return String.valueOf(ThreadLocalRandom.current().nextInt(1, 1000));
            case DATE:
                return generateRandomDate();
            case TAG:
                return generateRandomTag();
            default:
                return "Dummy Value";
        }
    }

    /**
     * 랜덤 텍스트 생성
     */
    private String generateRandomText() {
        String[] adjectives = {"Amazing", "Beautiful", "Creative", "Dynamic", "Excellent", "Fantastic", "Great", "Innovative", "Outstanding", "Perfect"};
        String[] nouns = {"Project", "Task", "Idea", "Solution", "Concept", "Design", "Plan", "Strategy", "Approach", "Method"};
        
        String adjective = adjectives[ThreadLocalRandom.current().nextInt(adjectives.length)];
        String noun = nouns[ThreadLocalRandom.current().nextInt(nouns.length)];
        
        return adjective + " " + noun + " " + ThreadLocalRandom.current().nextInt(1, 100);
    }

    /**
     * 랜덤 날짜 생성 (YYYY-MM-DD 형식)
     */
    private String generateRandomDate() {
        int year = ThreadLocalRandom.current().nextInt(2020, 2025);
        int month = ThreadLocalRandom.current().nextInt(1, 13);
        int day = ThreadLocalRandom.current().nextInt(1, 29); // 간단하게 28일까지만
        
        return String.format("%d-%02d-%02d", year, month, day);
    }

    /**
     * 랜덤 태그 생성
     */
    private String generateRandomTag() {
        String[] tags = {"Important", "Urgent", "Review", "Draft", "Complete", "In Progress", "Blocked", "High Priority", "Low Priority", "Medium Priority"};
        return tags[ThreadLocalRandom.current().nextInt(tags.length)];
    }

    /**
     * 속성들에 더미 값 생성 (부모 문서용)
     */
    private void createDummyValuesForProperties(List<DocumentProperty> properties, Document document) {
        for (DocumentProperty property : properties) {
            String dummyValue = generateDummyValue(property.getType());
            DocumentPropertyValue propertyValue = DocumentPropertyValue.builder()
                    .document(document)
                    .property(property)
                    .value(dummyValue)
                    .build();
            property.getValues().add(propertyValue);
        }
    }

    /**
     * 자식 문서들의 속성에 더미 값 생성
     */
    private void createDummyValuesForChildDocuments(List<Document> documents, List<DocumentProperty> parentProperties) {
        for (Document document : documents) {
            // 각 문서의 속성 조회
            List<DocumentProperty> documentProperties = documentPropertyRepository.findByDocumentId(document.getId());
            
            for (DocumentProperty property : documentProperties) {
                String dummyValue = generateDummyValue(property.getType());
                DocumentPropertyValue propertyValue = DocumentPropertyValue.builder()
                        .document(document)
                        .property(property)
                        .value(dummyValue)
                        .build();
                property.getValues().add(propertyValue);
            }
        }
    }

    /**
     * 루트 경로용 속성 정의 생성 (실제 저장은 하지 않음)
     */
    private List<DocumentProperty> createRootProperties(int propertyCount) {
        List<DocumentProperty> properties = new ArrayList<>();
        
        for (int i = 0; i < propertyCount; i++) {
            String propertyName = "Dummy Property " + (i + 1);
            PropertyType propertyType = PropertyType.valueOf(getRandomPropertyType().toUpperCase());
            
            DocumentProperty property = DocumentProperty.builder()
                    .name(propertyName)
                    .type(propertyType)
                    .sortOrder(i + 1)
                    .build();
            properties.add(property);
        }
        
        return properties;
    }

}