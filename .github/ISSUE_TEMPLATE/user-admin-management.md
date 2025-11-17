---
name: SUPER_ADMIN 사용자 관리 기능
about: SUPER_ADMIN이 다른 사용자의 역할과 비밀번호를 변경할 수 있는 기능
title: "feat: SUPER_ADMIN 사용자 관리 기능 추가"
labels: type:feature, area:admin, difficulty:medium
---

## 설명
SUPER_ADMIN 역할을 가진 관리자가 다른 사용자의 역할과 비밀번호를 변경할 수 있는 기능을 추가합니다.

## 요구사항
- [x] UserManagementPanel에 좌측 체크박스 컬럼 추가
- [x] 체크박스 선택 시 팝오버 메뉴 표시
- [ ] 역할 변경 기능 (SUPER_ADMIN, ADMIN, USER)
- [ ] 비밀번호 재설정 기능
- [ ] 계정 활성화/비활성화 기능
- [ ] 권한 검증 (SUPER_ADMIN만 사용 가능)
- [ ] 감사 로그 기록
- [ ] 에러 처리 및 토스트 알림

## 디자인
체크박스 + 팝오버 메뉴 방식:
- 테이블 맨 왼쪽에 체크박스 추가
- 선택된 행 클릭 시 팝오버 메뉴 표시
- 팝오버 메뉴 구성:
  - 역할 변경 (드롭다운)
  - 비밀번호 재설정
  - 계정 활성화/비활성화
  - 계정 삭제

## 구현 계획

### 1. UserManagementPanel.jsx 개선
- 체크박스 컬럼 추가 (좌측)
- 선택 상태 관리 (useState)
- 선택된 행 하이라이트
- 팝오버 메뉴 통합

### 2. UserActionPopover.jsx 컴포넌트 생성
- 역할 변경 드롭다운
- 비밀번호 재설정 버튼
- 계정 관리 옵션
- 토스트 알림

### 3. API 서비스 추가
- updateUserRole() - 사용자 역할 변경
- resetUserPassword() - 비밀번호 재설정
- toggleUserStatus() - 계정 활성화/비활성화
- deleteUser() - 계정 삭제

### 4. 테스트 및 검증
- 권한 검증 로직
- 에러 핸들링
- 감사 로그 확인

## 관련 파일
- `frontend/src/components/settings/UserManagementPanel.jsx`
- `frontend/src/components/settings/UserActionPopover.jsx` (신규)
- `frontend/src/services/userApi.js` (기존 또는 신규)
- `backend/src/main/java/com/example/notionclone/domain/user/` (API 엔드포인트)

## 보안 고려사항
1. **권한 검증**: 오직 SUPER_ADMIN만 이 기능 사용 가능
2. **민감한 작업**: 비밀번호 재설정 시 확인 다이얼로그 필수
3. **감사 로그**: 모든 관리자 작업 기록
4. **자신의 계정 보호**: 자신의 역할은 변경 불가능

## 참고
- 기존 팝오버 패턴: DocumentSharePopover.jsx 참조
- 체크박스 컴포넌트: @/components/ui/checkbox
- 디자인 시스템: Tailwind CSS + shadcn/ui
