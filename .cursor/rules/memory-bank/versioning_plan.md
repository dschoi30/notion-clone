# Versioning (P2.3) 개발 계획

## 결정사항
- 보관 정책: 90일 보관 후 정리
- 동일 스냅샷 중복 방지: 스냅샷 해시(SHA-256) 기반 중복 스킵
- Dev 타이머: 30초(운영 10분)
- 로깅: 네임스페이스 로거(`stayTimer`, `version`, `router`) + VITE_DEBUG/VITE_DEBUG_NS

## 현황(완료)
- BE: `document_versions` 엔티티/리포지토리/서비스/컨트롤러, 해시 중복 방지, 90일 정리(on-create)
- FE: `usePageStayTimer`(안정화), 자동 스냅샷 연동, 버전 기록 패널(목록/단건, PAGE 미리보기), 로깅 유틸 도입

## API 요약(현행)
- POST `/api/workspaces/{wid}/documents/{docId}/versions` → 버전 생성 (200: id, 204: 중복)
- GET `/api/workspaces/{wid}/documents/{docId}/versions` → 목록 페이지네이션(최신순)
- GET `/api/workspaces/{wid}/documents/{docId}/versions/{versionId}` → 상세

---

## Phase A. 복원/관리 기능
- 브랜치: `feature/versioning-fe-restore`, `feature/versioning-be-restore`
- BE (완료)
  - POST `/versions/{versionId}/restore` → 해당 버전 내용으로 문서 복원(제목/내용/속성/값/타이틀폭/뷰타입)
  - 권한: 문서 쓰기 권한 필요, 감사 로그 남기기
- FE (완료)
  - 복원 버튼 + 확인(모달 확인 대화), 복원 후 문서/뷰 갱신
  - 모달 형태 패널(오버레이 클릭 닫기, 배경 스크롤 잠금, z-index 정리)
  - 최신 버전 자동 선택, 속성/값 2열 표시(날짜 한국어 포맷/태그 라벨 컬러 유지)
  - 버전 기록 무한 스크롤(스크롤 하단 임계치 트리거), 선택 항목 하이라이트, 하단 고정 복원 버튼

## Phase B. 비교/라벨링/고정
- 브랜치: `feature/versioning-fe-diff`, `feature/versioning-be-diff`
- BE: 버전 라벨/메모/잠금(locked) 필드 추가, 삭제 제한
- FE
  - 현재 vs 선택 버전 Diff(PAGE: 제목/본문/속성값 라이트 하이라이트)
  - 라벨/메모 편집, 잠금 토글

## Phase C. 보관/청소/레이트리밋 하드닝
- 브랜치: `feature/versioning-be-retention-job`, `feature/versioning-be-cooldown`
- BE
  - @Scheduled 배치로 90일 초과 일괄 정리(보정)
  - 문서/사용자 쿨다운(예: 5분) 서버측 방어
  - 해시 정규화(트리밍/빈 콘텐츠 처리), 페이로드 크기 제한/압축

## Phase D. TABLE 뷰 스냅샷/미리보기
- 브랜치: `feature/versioning-be-table-snapshot`, `feature/versioning-fe-table-preview`
- BE: 행/셀 상태 포함 스냅샷(JSON or 별도 버전 테이블), 필요 시 압축
- FE: read-only 테이블 미리보기(가상 스크롤/페이지네이션)
- 성능/용량 프로파일링

## Phase E. 관측/품질
- 브랜치: `infra/observability-logs`, `qa/versioning-e2e`
- 메트릭/로그(생성/복원/실패율), Sentry/Playwright E2E, 부하/쿼리 튜닝

## Phase F. 문서화/가이드
- 브랜치: `docs/versioning-usage`
- 사용자/운영 가이드(복원/비교/보관/쿨다운/모니터링)

---

## 프런트 구현 체크리스트
- [x] `VersionHistoryPanel` 복원 버튼/확인 모달
- [ ] Diff 뷰 컴포넌트(PAGE, 최소 비교)
- [ ] TABLE 미리보기(2차)
- [ ] 로거 네임스페이스 유지, 필요시 `api`/`ws` 추가

## 백엔드 구현 체크리스트
- [x] 복원 API + 권한/감사 로그
- [ ] 라벨/메모/잠금 필드 및 API
- [ ] 배치 정리/쿨다운/해시 고도화/압축 옵션
- [ ] 인덱스/페이지네이션/용량 가드

## 설정/운영
- Dev 타이머: env 기반(30s) — 운영 10m
- 로깅: `.env.development.local` → `VITE_DEBUG=true`, `VITE_DEBUG_NS=stayTimer,version,router`
- 런타임 토글: URL `?debug=stayTimer` or `*`, `localStorage.DEBUG='stayTimer,version'`

## 리스크/유의사항
- 중복 스냅샷 무시 시 사용자 피드백 필요(스킵 안내)
- 대형 콘텐츠/테이블 스냅샷의 저장 비용 → 압축/샘플링/상한 고려
- 복원 시 동시 편집 충돌 방지(락 or 병합 정책)

## 일정 러프
- A: 0.8d, B: 1.5d, C: 1.0d, D: 2.0d, E: 0.8d, F: 0.4d (총 ~6.5d + QA)
