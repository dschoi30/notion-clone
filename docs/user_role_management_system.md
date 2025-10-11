# 사용자 역할 관리 시스템 통합 문서

## 📋 개요

기존 Permission 시스템과 새로운 워크스페이스 역할 시스템을 통합하여 확장 가능하고 세밀한 권한 관리를 제공하는 시스템을 구축했습니다.

## 🏗️ 시스템 아키텍처

### 계층적 권한 구조

```
🏢 시스템 전역 역할 (UserRole)
├── SUPER_ADMIN: 시스템 전체 관리자 (최고 권한)
├── ADMIN: 일반 관리자 (워크스페이스 관리 가능)
└── USER: 기본 사용자 (기본 권한)

🏢 워크스페이스 역할 (WorkspaceRole)
├── OWNER: 워크스페이스 소유자 (모든 권한)
├── ADMIN: 워크스페이스 관리자 (사용자 관리, 설정 변경)
├── EDITOR: 편집자 (문서 생성/편집/삭제)
├── VIEWER: 뷰어 (읽기 전용)
└── GUEST: 게스트 (제한된 접근)

📄 문서별 세밀한 권한 (PermissionType)
├── OWNER: 문서 소유자 (모든 권한)
├── WRITE: 편집 권한 (편집 가능)
└── READ: 읽기 권한 (읽기만 가능)
```

## 🔧 구현된 컴포넌트

### 1. 확장된 사용자 역할 시스템

#### `UserRole.java`
- 시스템 전역 역할 정의
- 권한 레벨 시스템 (숫자 기반)
- 권한 비교 메서드 제공

#### `WorkspaceRole.java`
- 워크스페이스별 역할 정의
- 세밀한 권한 매핑
- 권한 검증 메서드

#### `WorkspacePermission.java`
- 워크스페이스 내 세부 권한 정의
- 문서 관리, 멤버 관리, 설정 관리 등

### 2. 워크스페이스 멤버십 관리

#### `WorkspaceMembership.java`
- 사용자와 워크스페이스 간의 역할 관계 관리
- 초대 정보, 활성 상태 관리
- 권한 검증 메서드 제공

#### `WorkspaceMembershipRepository.java`
- 워크스페이스 멤버십 조회 및 관리
- 복잡한 쿼리 지원 (역할별 조회, 소유자 조회 등)

### 3. 역할 기반 접근 제어

#### `RequireRole.java`
- 시스템 전역 역할 기반 접근 제어 어노테이션
- 메서드/클래스 레벨 권한 제어

#### `RequireWorkspaceRole.java`
- 워크스페이스 역할 기반 접근 제어 어노테이션
- 워크스페이스 ID 파라미터 자동 추출

#### `RoleBasedAccessControlAspect.java`
- AOP 기반 권한 검증
- 실시간 권한 확인 및 예외 처리

### 4. 통합 권한 검증 시스템

#### `UnifiedPermissionService.java`
- 워크스페이스 역할과 문서별 권한 통합 검증
- 권한 검증 우선순위 관리
- 문서 접근 레벨 정의

#### 권한 검증 우선순위
1. **문서 소유자** (최우선)
2. **문서별 직접 권한** (Permission 테이블)
3. **워크스페이스 역할** (WorkspaceMembership)
4. **부모 문서 권한 상속**

### 5. 마이그레이션 시스템

#### `PermissionMigrationService.java`
- 기존 Permission 시스템을 워크스페이스 역할 시스템으로 마이그레이션
- 중복 권한 정리
- 워크스페이스 소유자 자동 설정

#### `PermissionMigrationController.java`
- 마이그레이션 관리 API
- 마이그레이션 상태 확인
- 단계별 마이그레이션 실행

## 🚀 사용 예시

### 1. 역할 기반 접근 제어

```java
// 시스템 관리자만 접근 가능
@RequireRole(roles = {"SUPER_ADMIN", "ADMIN"})
public void deleteUser(Long userId) { ... }

// 워크스페이스 소유자만 접근 가능
@RequireWorkspaceRole(roles = {"OWNER"})
public void changeUserRole(Long workspaceId, Long userId, WorkspaceRole newRole) { ... }

// 특정 권한이 필요한 작업
@RequireWorkspaceRole(permissions = {"MANAGE_MEMBERS"})
public void inviteUser(Long workspaceId, Long userId) { ... }
```

### 2. 통합 권한 검증

```java
@Service
public class DocumentService {
    
    @Autowired
    private UnifiedPermissionService permissionService;
    
    public void updateDocument(Long documentId, User user) {
        Document document = documentRepository.findById(documentId);
        
        // 통합 권한 검증
        permissionService.checkDocumentAccess(user, document, DocumentAccessLevel.WRITE);
        
        // 문서 업데이트 로직
    }
}
```

### 3. 마이그레이션 실행

```bash
# 마이그레이션 상태 확인
GET /api/admin/permission-migration/status

# 전체 마이그레이션 실행
POST /api/admin/permission-migration/full-migration
```

## 📊 데이터베이스 스키마

### WorkspaceMembership 테이블
```sql
CREATE TABLE workspace_memberships (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    workspace_id BIGINT NOT NULL,
    role VARCHAR(20) NOT NULL,
    invited_by BIGINT,
    joined_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    UNIQUE KEY unique_user_workspace (user_id, workspace_id)
);
```

### 기존 Permission 테이블 (유지)
```sql
-- 기존 Permission 테이블은 그대로 유지
-- 워크스페이스 역할과 병행 사용
```

## 🔄 마이그레이션 전략

### 1단계: 기존 데이터 보존
- 기존 Permission 테이블은 그대로 유지
- 워크스페이스 멤버십과 병행 사용

### 2단계: 통합 권한 검증
- `UnifiedPermissionService`로 모든 권한 통합 검증
- 기존 `PermissionService`는 하위 호환성 유지

### 3단계: 점진적 마이그레이션
```java
// 마이그레이션 API 사용
POST /api/admin/permission-migration/full-migration
```

### 4단계: 데이터 정리
- 중복 권한 제거
- 워크스페이스 소유자 자동 설정

## 🎯 주요 장점

### 1. 확장성
- 계층적 권한 구조로 복잡한 요구사항 대응
- 새로운 역할과 권한 쉽게 추가 가능

### 2. 세밀한 제어
- 문서별 세밀한 권한과 워크스페이스 역할 병행
- 상황에 따른 최적의 권한 검증

### 3. 하위 호환성
- 기존 코드 수정 최소화
- 점진적 마이그레이션으로 안전한 전환

### 4. 성능 최적화
- AOP 기반 권한 검증으로 중복 코드 제거
- 효율적인 권한 조회 쿼리

## 🔧 설정 및 사용법

### 1. SecurityConfig 업데이트
```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {
    // 워크스페이스 멤버십 관련 경로 추가
    .requestMatchers("/api/workspaces/**/members/**").authenticated()
}
```

### 2. 의존성 주입
```java
@Service
@RequiredArgsConstructor
public class DocumentService {
    private final UnifiedPermissionService permissionService;
    private final WorkspaceRoleService workspaceRoleService;
}
```

### 3. 권한 검증 사용
```java
// 문서 접근 권한 검증
if (permissionService.hasDocumentAccess(user, document, DocumentAccessLevel.WRITE)) {
    // 편집 로직
}

// 워크스페이스 권한 검증
if (permissionService.hasWorkspacePermission(user, workspaceId, WorkspacePermission.CREATE_DOCUMENT)) {
    // 문서 생성 로직
}
```

## 📈 향후 개선 방안

### 1. 권한 캐싱
- Redis를 활용한 권한 정보 캐싱
- 성능 최적화

### 2. 동적 권한 관리
- 런타임 권한 변경 지원
- 실시간 권한 업데이트

### 3. 감사 로그
- 권한 변경 이력 추적
- 보안 감사 기능

### 4. API 권한 관리
- REST API 레벨 권한 제어
- 세밀한 엔드포인트 권한 관리

## 📝 결론

이 통합 권한 관리 시스템은 기존 Permission 시스템의 장점을 유지하면서도 워크스페이스 기반의 현대적인 권한 관리를 제공합니다. 확장성, 성능, 보안을 모두 고려한 설계로 Notion과 같은 협업 도구에서 필요한 복잡한 권한 요구사항을 충족할 수 있습니다.

---

**작성일**: 2025년 10월 4일
