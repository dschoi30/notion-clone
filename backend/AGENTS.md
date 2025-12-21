# Backend Module - AI Agent Rules

## Module Context

백엔드는 Spring Boot 3 기반의 RESTful API 서버입니다. 문서 관리, 사용자 인증, 워크스페이스 관리, 실시간 협업(WebSocket), 권한 관리 등의 기능을 제공합니다.

### Dependencies
- Spring Boot 3.3.0
- Spring Security (JWT 인증)
- Spring Data JPA
- Spring WebSocket (STOMP)
- PostgreSQL Driver
- JWT (jjwt 0.11.5)
- Lombok
- Logback (구조화된 로깅)

### Key Packages
- `com.example.notionclone.domain.*`: 도메인별 패키지 (document, user, workspace, permission, notification)
- `com.example.notionclone.config`: 설정 클래스 (Security, WebSocket, JWT)
- `com.example.notionclone.security`: 보안 관련 (JWT 필터, 권한 체크)
- `com.example.notionclone.exception`: 예외 처리

## Tech Stack & Constraints

### Framework
- **Spring Boot 3**: Java 17 기반
- **Spring Data JPA**: 데이터베이스 접근
- **Spring Security**: 인증 및 권한 관리
- **Spring WebSocket**: 실시간 협업

### Database
- **PostgreSQL**: 관계형 데이터베이스
- **JPA/Hibernate**: ORM
- **Flyway**: 데이터베이스 마이그레이션 (선택적)

### Authentication
- **JWT**: 토큰 기반 인증
- **Session Management**: 현재 세션 ID 추적
- **Password Encoding**: BCrypt 사용 (절대 평문 저장 금지)

## Implementation Patterns

### Controller Pattern
```java
@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
public class DocumentController {
    private final DocumentService documentService;
    
    @GetMapping("/{id}")
    public ResponseEntity<DocumentResponse> getDocument(
        @PathVariable Long id,
        @CurrentUser User user
    ) {
        DocumentResponse response = documentService.getDocument(id, user);
        return ResponseEntity.ok(response);
    }
}
```

### Service Pattern
```java
@Service
@RequiredArgsConstructor
@Transactional
public class DocumentService {
    private final DocumentRepository documentRepository;
    private final PermissionService permissionService;
    
    @Transactional(readOnly = true)
    public DocumentResponse getDocument(Long id, User user) {
        Document document = documentRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Document not found"));
        
        // 권한 체크
        permissionService.checkPermission(user, document, PermissionType.READ);
        
        return buildResponse(document);
    }
}
```

### Repository Pattern
```java
@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {
    // 자동 쿼리 생성 (Spring Data JPA)
    List<Document> findByWorkspaceIdAndIsTrashedFalse(Long workspaceId);
    
    // 커스텀 쿼리 (필요시)
    @Query("SELECT d FROM Document d WHERE d.parentId = :parentId ORDER BY d.sortOrder ASC")
    List<Document> findChildrenByParentId(@Param("parentId") Long parentId);
}
```

### Entity Pattern
```java
@Entity
@Table(name = "documents")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor
public class Document extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String title;
    
    // 관계 매핑
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workspace_id")
    private Workspace workspace;
}
```

### DTO Pattern
```java
// 요청 DTO
@Getter
@Setter
public class CreateDocumentRequest {
    @NotBlank
    private String title;
    
    private Long parentId;
}

// 응답 DTO
@Getter
@Builder
public class DocumentResponse {
    private Long id;
    private String title;
    private List<PermissionInfo> permissions;
}
```

### Exception Handling
```java
@ControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(ResourceNotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(new ErrorResponse(e.getMessage()));
    }
    
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(new ErrorResponse("접근 권한이 없습니다."));
    }
}
```

## Security Patterns

### JWT Authentication
```java
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtTokenProvider tokenProvider;
    private final CustomUserDetailsService userDetailsService;
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                   HttpServletResponse response, 
                                   FilterChain filterChain) {
        String token = extractToken(request);
        if (token != null && tokenProvider.validateToken(token)) {
            Authentication auth = getAuthentication(token);
            SecurityContextHolder.getContext().setAuthentication(auth);
        }
        filterChain.doFilter(request, response);
    }
}
```

### Permission Check
```java
// AOP 기반 권한 체크
@Aspect
@Component
@RequiredArgsConstructor
public class WorkspacePermissionAspect {
    private final PermissionService permissionService;
    
    @Around("@annotation(RequireWorkspacePermission)")
    public Object checkPermission(ProceedingJoinPoint joinPoint) {
        // 권한 체크 로직
        permissionService.checkPermission(user, document, requiredPermission);
        return joinPoint.proceed();
    }
}
```

## Testing Strategy

### Unit Tests
```bash
# Gradle 테스트 실행
./gradlew test

# 특정 테스트 클래스 실행
./gradlew test --tests DocumentServiceTest
```

### Integration Tests
```java
@SpringBootTest
@AutoConfigureMockMvc
class DocumentControllerTest {
    @Autowired
    private MockMvc mockMvc;
    
    @Test
    void testGetDocument() throws Exception {
        mockMvc.perform(get("/api/documents/1")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());
    }
}
```

## Local Golden Rules

### Do's
- 모든 엔티티는 BaseEntity 상속 (createdAt, updatedAt 등)
- Builder 패턴 사용 (Lombok @Builder)
- 서비스 레이어에 @Transactional 적용
- 읽기 전용 메서드는 @Transactional(readOnly = true)
- 권한 체크는 서비스 레이어에서 수행
- 예외는 명확한 메시지와 함께 처리
- 로깅은 구조화된 형식 (JSON) 사용
- DTO는 요청/응답 분리
- Repository는 인터페이스로 정의
- 엔티티는 JPA 어노테이션만 사용

### Don'ts
- 패스워드를 평문으로 저장하지 않음 (BCrypt 필수)
- JWT 토큰에 민감한 정보 포함하지 않음
- 네이티브 쿼리 남용 지양 (JPA 표준 방식 우선)
- 트랜잭션 경계를 컨트롤러에 두지 않음
- 엔티티를 직접 반환하지 않음 (DTO 사용)
- 하드코딩된 값 사용 지양 (상수 클래스 사용)
- 로그에 민감한 정보 출력하지 않음
- 예외를 삼키지 않음 (명시적 처리)

## File Naming Conventions

- Controller: `*Controller.java`
- Service: `*Service.java`
- Repository: `*Repository.java`
- Entity: `*.java` (도메인명, 예: `Document.java`)
- DTO: `*Request.java`, `*Response.java`, `*Dto.java`
- Config: `*Config.java`
- Exception: `*Exception.java`

## Common Patterns

### 권한 체크
```java
// PermissionService 사용
permissionService.checkPermission(user, document, PermissionType.WRITE);
```

### 로깅
```java
// SLF4J Logger 사용
private static final Logger log = LoggerFactory.getLogger(ClassName.class);

log.debug("Debug message: {}", value);
log.info("Info message");
log.warn("Warning message");
log.error("Error message", exception);
```

### 트랜잭션
```java
@Transactional
public void updateDocument(Long id, UpdateDocumentRequest request) {
    // 트랜잭션 내에서 실행
}

@Transactional(readOnly = true)
public DocumentResponse getDocument(Long id) {
    // 읽기 전용 트랜잭션
}
```

### 엔티티 관계
```java
// LAZY 로딩 사용 (기본값)
@ManyToOne(fetch = FetchType.LAZY)
private Workspace workspace;

// EAGER 로딩은 필요한 경우에만
@OneToMany(fetch = FetchType.EAGER)
private List<Document> children;
```

