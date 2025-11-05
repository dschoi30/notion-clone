# 권한 시스템 데이터 마이그레이션 계획

## 현재 상태 분석

### 기존 시스템
- **permissions 테이블**: 문서별 개별 권한 관리 (Permission 엔티티)
  - `permission_type`: OWNER, WRITE, READ
  - `status`: PENDING, ACCEPTED, REJECTED
  - 각 사용자-문서 조합별로 권한 레코드 존재

- **workspace_permissions 테이블**: 이미 존재하며 사용 중
  - `role`: OWNER, ADMIN, EDITOR, VIEWER, GUEST
  - 각 사용자-워크스페이스 조합별로 권한 레코드 존재

### 새로운 시스템
- **WorkspacePermissionType enum**: 세부 권한 타입 정의
  - DELETE_WORKSPACE, MANAGE_WORKSPACE_SETTINGS, MANAGE_MEMBERS, INVITE_MEMBERS
  - CREATE_DOCUMENT, EDIT_DOCUMENT, DELETE_DOCUMENT, VIEW_DOCUMENT, SHARE_DOCUMENT
  - VIEW_SHARED_DOCUMENT

- **WorkspaceRole enum**: 역할별 권한 매핑 (기존과 동일)
  - 각 역할은 WorkspacePermissionType의 조합으로 권한 정의

## 마이그레이션 전략

### 1단계: 현재 상태 확인 및 백업
**목적**: 데이터 손실 방지 및 롤백 준비

**작업**:
- 현재 DB 상태 백업
- 기존 permissions 테이블 데이터 확인
- workspace_permissions 테이블 데이터 확인
- 마이그레이션 상태 확인 API 엔드포인트 추가

**구현 파일**:
- `PermissionMigrationController.java`: GET `/api/migration/status` 엔드포인트 추가

### 2단계: 데이터 정합성 검증
**목적**: 마이그레이션 전 데이터 무결성 확인

**작업**:
- 고아 레코드 확인 (workspace가 없는 document의 permission)
- 중복 권한 확인
- 비활성 사용자/워크스페이스 확인
- 검증 결과 리포트 생성

**구현 파일**:
- `PermissionMigrationService.java`: `validateDataIntegrity()` 메서드 추가

### 3단계: 점진적 마이그레이션
**목적**: 안전한 데이터 이전

**작업 순서**:

#### 3-1. 워크스페이스 소유자 설정
```java
// 각 워크스페이스의 생성자를 OWNER로 설정
// workspace.user → WorkspacePermission(role=OWNER)
```

#### 3-2. 문서별 권한 → 워크스페이스 권한 변환
```java
// 기존 PermissionMigrationService.migrateDocumentPermissionsToWorkspacePermissions() 활용
// Permission(type=OWNER) → WorkspaceRole.OWNER
// Permission(type=WRITE) → WorkspaceRole.EDITOR
// Permission(type=READ) → WorkspaceRole.VIEWER
```

#### 3-3. 중복 권한 정리
```java
// 워크스페이스 권한이 있는 경우 문서별 권한 제거
// 단, 특별한 문서별 권한은 유지 (예: 특정 문서만 공유)
```

**구현 파일**:
- `PermissionMigrationService.java`: 기존 메서드 활용 및 개선

### 4단계: 마이그레이션 API 엔드포인트 구현
**목적**: 관리자가 마이그레이션을 제어할 수 있도록

**엔드포인트**:
```
POST /api/migration/validate          - 데이터 검증
POST /api/migration/backup            - 백업 생성
POST /api/migration/execute           - 마이그레이션 실행
POST /api/migration/rollback          - 롤백
GET  /api/migration/status            - 상태 확인
```

**구현 파일**:
- `PermissionMigrationController.java`: 엔드포인트 추가

### 5단계: 마이그레이션 실행 스크립트
**목적**: 자동화된 마이그레이션 프로세스

**스크립트 내용**:
```sql
-- 1. 백업 테이블 생성
CREATE TABLE permissions_backup AS SELECT * FROM permissions;
CREATE TABLE workspace_permissions_backup AS SELECT * FROM workspace_permissions;

-- 2. 워크스페이스 소유자 설정 (없는 경우)
-- 애플리케이션 레벨에서 처리

-- 3. 데이터 검증
-- 애플리케이션 레벨에서 처리

-- 4. 마이그레이션 실행
-- 애플리케이션 레벨에서 처리
```

**구현 파일**:
- `V1__migration_workspace_permissions.sql` (Flyway 또는 수동 실행)

### 6단계: 검증 및 테스트
**목적**: 마이그레이션 성공 확인

**검증 항목**:
- [ ] 모든 워크스페이스에 소유자가 있는가?
- [ ] 기존 permissions 데이터가 workspace_permissions로 변환되었는가?
- [ ] 사용자가 기존과 동일한 권한을 가지는가?
- [ ] 중복 권한이 정리되었는가?
- [ ] 권한 검증 로직이 정상 작동하는가?

**테스트 케이스**:
- 워크스페이스 소유자 권한 테스트
- 문서 생성/편집/삭제 권한 테스트
- 멤버 관리 권한 테스트
- 권한 없는 사용자 접근 차단 테스트

### 7단계: 롤백 계획
**목적**: 문제 발생 시 안전한 복구

**롤백 절차**:
```sql
-- 1. 백업에서 복원
DROP TABLE permissions;
DROP TABLE workspace_permissions;
CREATE TABLE permissions AS SELECT * FROM permissions_backup;
CREATE TABLE workspace_permissions AS SELECT * FROM workspace_permissions_backup;

-- 2. 인덱스 재생성
-- 3. 제약조건 재생성
```

## 마이그레이션 실행 순서

### 프로덕션 환경
1. **사전 준비** (D-7)
   - 마이그레이션 계획 공유
   - 백업 전략 수립
   - 롤백 시나리오 준비

2. **스테이징 테스트** (D-3)
   - 스테이징 환경에서 전체 마이그레이션 실행
   - 문제점 파악 및 수정

3. **프로덕션 마이그레이션** (D-Day)
   - 서비스 점검 공지
   - DB 백업 (자동)
   - 마이그레이션 실행
   - 검증 테스트
   - 서비스 재개

4. **모니터링** (D+1 ~ D+7)
   - 권한 관련 에러 모니터링
   - 사용자 피드백 수집
   - 필요시 핫픽스 적용

### 개발 환경
1. 로컬 DB 백업
2. 마이그레이션 API 호출
3. 검증 테스트
4. 문제 발견 시 롤백 후 수정

## 주의사항

1. **데이터 손실 방지**
   - 마이그레이션 전 반드시 백업
   - 트랜잭션 단위로 실행
   - 실패 시 자동 롤백

2. **성능 고려**
   - 대량 데이터의 경우 배치 처리
   - 인덱스 활용
   - 마이그레이션 중 서비스 중단 최소화

3. **권한 일관성**
   - 기존 권한보다 낮아지지 않도록
   - 특수 케이스 별도 처리
   - 마이그레이션 후 권한 재검증

## 구현 우선순위

1. **P0 (필수)**: 마이그레이션 상태 확인 API
2. **P0 (필수)**: 데이터 검증 로직
3. **P0 (필수)**: 마이그레이션 실행 로직
4. **P1 (중요)**: 백업/롤백 기능
5. **P2 (선택)**: 마이그레이션 UI 대시보드

