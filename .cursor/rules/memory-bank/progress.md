- `DocumentList.jsx`에서 문서의 `viewType`이 `TABLE`일 경우, `FileText` 아이콘 대신 `Table` 아이콘을 표시하도록 수정하여 시각적 구분을 명확히 함.
- DocumentEditor.jsx에 실시간 자동 저장(debounce 500ms) 기능 구현. 저장 버튼 제거, 저장 상태 UI만 표시. title/content 변경 시 자동 저장 트리거. 
- useDocumentSocket.js에서 Stomp 클라이언트 생성 방식을 공식 권장 방식(Client + webSocketFactory)으로 변경하여 자동 재연결 지원 및 경고 해결. 
- vite.config.js의 WebSocket 프록시 설정을 확인하고 주석을 추가하여 명확히 함. 
- WebSocket 연결 시 JWT 인증을 위해 프론트엔드에서 토큰을 쿼리 파라미터로 전달하고, 백엔드에서 JwtHandshakeInterceptor로 검증하는 기능 추가. 
- [x] WorkspaceList 컴포넌트 단위테스트 파일(WorkspaceList.test.jsx) 작성 완료
  - 주요 동작(목록 렌더링, 로딩/에러, 워크스페이스 선택, 추가/설정/로그아웃 버튼, 모달 표시 등) 테스트 포함
  - useWorkspace, useAuth 등 context hook mocking 적용
  - linter 에러(테스트 환경 글로벌 객체 관련) 해결
- [ ] WorkspaceSettingsModal 등 추가 workspace 관련 테스트 작성 예정
- NotificationService의 acceptNotification에서 알림(INVITE) 수락 시 permission 테이블의 status를 ACCEPTED로 변경하는 로직 추가 (payload에서 documentId 파싱, PermissionService 활용) 
- DocumentShareModal.jsx 공유 모달 위치 계산을 useLayoutEffect로 동기화, 위치 계산 전에는 투명 렌더/비렌더 처리하여 "왼쪽 상단 반짝" 현상 해결 
- TrashModal에서 문서가 많을 때 화면 아래로 내려가는 현상을 방지하기 위해 모달의 style에 maxHeight: '80vh', overflowY: 'auto'를 추가하고, 위치 계산 시 top 값이 화면을 벗어나지 않도록 보정하는 로직을 적용함. 
- TrashModal 모달의 top 위치를 항상 화면 하단을 넘지 않게 보정하여, 모달이 화면을 벗어나지 않도록 개선함. 
- TrashModal 모달 위치 계산을 anchor 아래로 열었을 때 화면을 벗어나면 위로 열고, 위로 열어도 화면을 벗어나면 top을 0으로 고정하는 방식으로 개선함. 
- TrashModal 위치 계산 시 dialogHeight를 고정값(320)으로 사용하고, 모달 전체가 아니라 ul(문서 리스트)에만 maxHeight, overflowY를 적용하도록 수정함. 
- TrashModal 위치 계산 시 useLayoutEffect를 사용해 실제 모달 높이(dialogRef.current.offsetHeight)로 위치를 2차 보정하는 로직을 추가함. 위치 계산 함수는 updateDialogPosition으로 분리하고, open/anchorRef/workspaceId/trashedDocuments 변경 시마다 위치를 재계산하도록 개선함. 
- 깃허브 이슈 등록 및 브랜치 생성
  - [#1 사이드바에 검색 메뉴 및 모달 기반 실시간 문서 검색 기능 추가](https://github.com/dschoi30/notion-clone/issues/1)
  - 브랜치명: feature/sidebar-search-modal
- TrashModal 위치 계산 useLayoutEffect에 anchorRef, dialogRef, getBoundingClientRect 예외 및 경고 추가
- TrashModal 위치 계산에서 dialogRef.current가 null일 때 setTimeout으로 1프레임 뒤에 위치 계산을 재시도하도록 개선
- TrashModal 위치 계산 로직을 calculateDialogPosition 함수로 분리하고, useLayoutEffect 내 중복 코드를 제거해 리팩토링
- 작성자 필터 모달이 드롭다운처럼 버튼(anchorRef) 아래에 자연스럽게 위치하도록 수정. SearchFilters의 작성자 버튼에 ref를 부여해 AuthorFilterModal에 anchorRef로 전달, absolute 위치 계산 및 오버레이 제거까지 완료.
- 날짜 필터(DateFilterModal) 드롭다운 모달 컴포넌트 생성 및 SearchFilters, SearchModal과 연동. 날짜 버튼 클릭 시 모달 오픈, 오늘/이번 주/이번 달/직접 선택 등 프리셋 선택 가능. 선택 시 버튼에 라벨 표시. (직접 선택은 미구현)
- DateFilterModal에서 '직접 선택' 버튼 제거 및 showCalendar를 항상 true로 고정하여, 모달이 열리면 바로 캘린더가 보이도록 개선
- DocumentEditor.jsx 상단에 문서 권한자 이니셜 아이콘 목록을 표시하고, 현재 로그인한 사용자는 강조 스타일로 보여주는 기능을 추가함.
- useDocumentPresence.js 커스텀 훅 생성(문서별 실시간 접속자 목록 관리, 소켓 연결)
- DocumentEditor.jsx에서 권한자 이니셜 아이콘에 presence(접속자) 강조(초록색 테두리) 적용
- [x] 1. ERD/DB 및 모델 구조 확정 및 반영 (Document parent/viewType, Property/Value, Enum 생성)
- [x] 2. API(백엔드) 확장 및 구현 (Document parent/viewType 반영, 하위 문서 조회, 생성/수정 API 확장 등)
- [x] 3. 프론트엔드 DocumentList/Editor 구조 개편
- [ ] 4. TableView, GalleryView 등 뷰 타입별 컴포넌트 구현
- [x] 5. 속성/행 관리 기능 개발
- [ ] 6. UX/UI 개선 및 테스트, 배포
- DocumentEditor.jsx 최초 생성 상태(제목/내용/자식문서 모두 비어있고 viewType이 PAGE)에서만 하단에 '테이블', '갤러리' 버튼이 나타나도록 UI 구현. '테이블' 클릭 시 viewType을 TABLE로 변경하고, 테이블 기본 UI(헤더: 이름, 빈 1행, 속성 추가/새 페이지 버튼) 렌더링까지 완료.
- DocumentProperty/DocumentPropertyValue 엔티티용 Repository, Service, DTO, Controller(API) 생성 및 CRUD 구현
  - 속성 추가/조회/삭제, 값 추가/수정/조회 API 구현
  - 프론트 테이블 뷰와 연동 준비 완료
- DocumentTableView.jsx: handleConfirmAddProperty 함수에서 새 property 추가 후, 모든 row에 대해 addOrUpdatePropertyValue API를 호출하여 각 row의 새 property 값(초기값 '')이 백엔드에도 반영되도록 수정함.
- 문서 조회/수정/삭제 API에 대한 권한 검증 로직을 추가하여 보안을 강화함.
  - `DocumentService`의 `getDocument`, `updateDocument`, `deleteDocument` 메서드에 소유자 또는 `Permission` 기반의 권한 검사 로직을 구현함.
  - 권한이 없는 요청에 대해 404 Not Found 대신 403 Forbidden (`AccessDeniedException`)을 반환하도록 수정하여 API 응답의 명확성을 높임.
  - `DocumentController`에서 `DocumentService`의 메서드를 호출할 때, 현재 인증된 사용자(`User`) 객체를 전달하도록 수정함.
- systemPropTypes 속성 추가 시 document 메타데이터 기반 자동 값 입력 기능 DocumentTableView.jsx에 구현
- rows 구조 확장(document 전체 포함) DocumentEditor.jsx에 반영
- DocumentTableView.jsx에서 각 행의 셀 높이가 다를 때, 한 행의 최대 셀 높이로 모든 셀의 높이를 맞추는 기능을 구현함. (cellRefs 구조 2차원화, useEffect로 최대 높이 계산, renderCell에서 style.height 적용)
- DocumentEditor가 viewType이 PAGE일 때만 속성 fetch/속성 추가/속성 요약 UI를 보여주고, TABLE/GALLERY일 때는 해당 컴포넌트로 분기하도록 리팩토링. 테이블 row/property fetch 등은 DocumentTableView로 완전히 위임.
- App.jsx 라우팅 구조를 /document/:id 경로에서만 DocumentEditor가 렌더링되도록 변경
- 문서 상세 URL을 /:id-:slug 형태로 변경
- DocumentEditor에서 idSlug 파싱 및 문서 선택
- DocumentList에서 문서 클릭 시 해당 경로로 이동하도록 수정
- slugify 유틸 추가
- 최초 로그인 또는 / 경로 접근 시 lastId 값으로 문서로 리다이렉트하는 로직 App.jsx에 추가
- lastId 없으면 documents[0]로 이동
- Provider를 App에서 감싸도록 구조 변경
- DocumentPageView.jsx에서 속성명/값 목록을 한 줄에 하나씩 세로로 정렬하고, 각 속성 행에 호버 시 bg-gray-100 배경색이 적용되도록 스타일을 개선했습니다. 기본 배경색은 없습니다.
- Sidebar.jsx에서 사이드바가 항상 화면에 고정되어 보이도록 position: fixed, top: 0, left: 0, height: 100vh, zIndex: 30 스타일을 적용했습니다.
- DocumentPropertyService.java에서 parentId가 있으면 부모 id로, 없으면 자신의 id로 속성 추가/조회하도록 리팩토링 완료.
- DocumentPageView(PAGE 뷰)에서 system property type 속성 추가 시, 즉시 property value가 저장되고 화면에 반영되도록 DocumentEditor.jsx의 handleAddProperty를 개선함
- DocumentProperty의 태그 옵션(tagOptions) 목록을 백엔드에서 관리하도록 DB/엔티티/서비스/컨트롤러/API를 모두 구현함
- frontend/src/hooks/useDocumentPropertiesStore.js: zustand 기반 문서 속성 및 태그 옵션 전역 관리 store 생성 (fetchProperties, add/edit/removeTagOption 등)
- TagPopover.jsx: props 대신 zustand store에서 tagOptions를 직접 조회/수정하도록 리팩터링
- DocumentPageView.jsx, DocumentTableView.jsx: 문서 진입 시 zustand store에서 properties/tagOptions 패치, TagPopover에 propertyId만 전달하도록 변경
- DocumentTableView에서 titleColumnWidth, propertyWidths를 props로 받지 않고 zustand store(useDocumentPropertiesStore)에서 가져오도록 리팩토링함
- propertyWidths는 store의 properties의 width 필드를 활용
- titleColumnWidth는 store에 별도 관리 필요(현재는 288로 fallback)
- 상위 컴포넌트(DocumentEditor)에서는 더 이상 해당 props를 넘기지 않음
- DocumentPropertyService의 getPropertiesByDocument 메서드에서 sort_order 순으로 오름차순 정렬하여 반환하도록 수정
- DocumentPropertyRepository에 findByDocumentIdOrderBySortOrderAsc 메서드 추가
- [x] 현재 백엔드 엔티티 클래스들을 기반으로 클래스 다이어그램과 ERD 업데이트 완료
  - BaseEntity 추상 클래스와 상속 관계 반영
  - Document, DocumentProperty, DocumentPropertyValue, DocumentPropertyTagOption 엔티티 추가
  - Permission, Notification 엔티티 상세 정보 반영
  - ViewType, PropertyType, PermissionType, PermissionStatus, NotificationType, NotificationStatus enum 추가
  - Workspace의 계층 구조(parent-child) 관계 반영
  - Document의 계층 구조(parent-child) 관계 반영
  - 모든 엔티티 간의 관계를 정확히 매핑

- [x] DocumentTableView.jsx 테이블 헤더 드래그 앤 드롭 기능 구현 완료
  - 백엔드: DocumentPropertyService에 updatePropertyOrder 메서드 추가, DocumentController에 PATCH /{documentId}/properties/order 엔드포인트 추가
  - 프론트엔드: documentApi.js에 updatePropertyOrder 함수 추가
  - dnd-kit 라이브러리 활용하여 SortablePropertyHeader 컴포넌트 생성
  - DndContext, SortableContext로 테이블 헤더 감싸기
  - 드래그 앤 드롭 시 백엔드 API 호출하여 sortOrder 업데이트
  - 에러 처리 및 로딩 상태 관리 개선
  - 시각적 피드백(드래그 중 투명도, 호버 효과) 추가

- [x] DocumentList.jsx 드래그 앤 드롭 기능 재활성화 완료
  - SortableDocumentTreeItem 컴포넌트로 변환하여 드래그 앤 드롭 활성화
  - DocumentContext의 updateDocumentOrder 함수 활용하여 로컬 상태 직접 업데이트
  - 화면 깜빡임 없이 부드러운 순서 변경 구현
  - 그립 아이콘 제거하고 문서 제목 영역 전체를 드래그 영역으로 설정

- [x] 문서 정렬 기능 개선 완료
  - 프론트엔드: DocumentList에서 개인/공유 문서 분류 후 sortOrder로 정렬
  - 백엔드: Repository에서 정렬 로직 제거하여 단순 조회로 변경
  - 현재 구조에 맞는 최적화: 모든 문서를 가져온 후 프론트에서 분류/정렬
  - null 값 처리를 포함한 안전한 정렬 구현
  - 최상위 문서와 하위 문서 모두 sortOrder 기준으로 정렬되도록 개선
  - 드래그 앤 드롭 후 즉시 정렬 반영: DocumentContext에서 sortOrder 값 업데이트, DocumentList에서 useMemo로 자동 재정렬
  - 개인/공유 문서 카테고리별 독립적인 정렬: 같은 카테고리 내에서만 순서 변경 가능, 카테고리 간 이동 방지
  - 노션 스타일 드래그 앤 드롭: 드래그 중 항목만 투명도 0.4로 표시, 긴 제목 말줄임표 처리, 호버 시 전체 제목 표시

- [x] DocumentTableView 리팩터링(1차)
  - `table/utils.jsx`로 `getPropertyIcon`, `slugify` 유틸 분리 (JSX 지원을 위해 .jsx 확장자)
  - `table/SortablePropertyHeader.jsx`로 헤더 컴포넌트 분리
  - `DocumentTableView.jsx` 불필요 import 정리 및 유틸/컴포넌트 import 교체
  - 전체 빌드 검증 완료 (vite prod build)
  - 후속 작업(P1.2) 대비 구조 정리: 행 단위 컴포넌트/훅 분리 준비

- [x] DocumentTableView 리팩터링(2차)
  - `useTableData`, `useColumnResize`, `useColumnDnd` 훅 분리 및 컨테이너에 적용
  - 인라인 로직 제거, 상태/이벤트를 훅으로 캡슐화
  - 빌드 및 린트 통과

- [x] DocumentTableView 리팩터링(3차)
  - 렌더링 분리: `TableHeader`, `TableRow`, `NameCell`, `PropertyCell` 도입
  - 태그 팝오버 업데이트 시 상위 상태 동기화 콜백 연결
  - 빌드 통과, 기능 동일성 유지

- [x] 테이블 헤더 클릭-편집 개선
  - dnd-kit `PointerSensor.activationConstraint(delay:150, tolerance:5)` 적용
  - 빠른 클릭은 편집, 길게 누르거나 이동 시 드래그 시작
  - 별도 드래그 핸들 제거, 라벨 클릭으로 인라인 편집 가능

 - [x] 테이블 '속성 추가' 팝오버 외부 클릭 닫힘 로직 추가
   - 파일: `frontend/src/components/documents/table/TableHeader.jsx`
   - `useRef`로 팝오버 래퍼 참조를 잡고, `useEffect`에서 `document` mousedown 캡처 단계 리스너로 외부 클릭을 감지해 `setIsPopoverOpen(false)` 처리
   - 팝오버 버튼 영역 클릭은 예외 처리하여 토글 동작 유지
   - 린트 통과 확인

- [x] DocumentTableView 타이틀 컬럼 너비 업데이트 기능 구현 완료
  - zustand store(useDocumentPropertiesStore)에 titleWidth 상태 관리 및 updateTitlWidth 메서드 추가
  - DocumentTableView에서 하드코딩된 288값 대신 store의 titleWidth 사용하도록 수정
  - 타이틀 컬럼 리사이즈 시 store를 통해 백엔드와 자동 동기화되도록 handleResizeMouseUp 개선
  - DocumentEditor에서 currentDocument 변경 시 titleColumnWidth를 store에 동기화하는 로직 추가
  - 백엔드 API(updateTitleWidth)와 연동하여 컬럼 너비 변경사항이 즉시 서버에 저장됨

- [x] 최초 로그인 시 마지막 문서 조회 문제 해결
  - App.jsx의 getDefaultDocPath() 함수에서 workspaceLoading, documentsLoading 상태를 고려하도록 수정
  - 워크스페이스와 문서 로딩이 완료되기 전에는 "로딩 중..." 메시지 표시
  - 로딩 완료 후에만 localStorage의 lastDocumentId를 기반으로 리다이렉트 실행
  - DocumentContext.jsx의 자동 선택 로직과의 경합 상태 해결
  - 안전한 조건부 렌더링으로 올바른 마지막 문서 조회 보장

- [x] 워크스페이스 간 문서 조회 혼재 문제 해결
  - DocumentContext.jsx에서 워크스페이스 변경 시 documents 배열 초기화 로직 추가
  - 이전 워크스페이스의 문서 목록이 남아있어서 발생하는 혼선 방지
  - 워크스페이스 변경 시 자동으로 fetchDocuments 호출하는 useEffect 추가
  - DocumentEditor.jsx에서 URL로 접근한 문서가 현재 워크스페이스에 없을 때 안전한 처리 로직 추가
  - 잘못된 문서 접근 시 현재 워크스페이스의 첫 번째 문서로 자동 리다이렉트
  - slugify 유틸 함수 import 추가하여 URL 생성 기능 완성
  
- [x] 문서 조회 보안 검증 강화
  - DocumentContext.selectDocument()에서 조회된 문서의 workspaceId 검증 추가
  - 다른 워크스페이스의 문서가 조회되면 에러 발생 및 localStorage 정리
  - App.jsx getDefaultDocPath()에서 localStorage의 lastDocumentId 검증 강화
  - 존재하지 않는 문서 ID는 localStorage에서 자동 제거
  - DocumentEditor에서 URL 접근 시 문서 목록 기반 검증 및 잘못된 ID localStorage 정리
  - 백엔드 워크스페이스 검증 부족을 프론트엔드에서 보완하는 다층 검증 구조 구축

- [x] 새로고침 시 URL과 문서 동기화 문제 해결
  - App.jsx에서 새로고침 시 URL의 문서 ID와 현재 워크스페이스 문서 목록 간 일치성 검증
  - URL의 문서 ID가 현재 워크스페이스에 없으면 올바른 문서로 자동 리다이렉트
  - DocumentEditor에서 currentDocument 변경 시 URL 자동 동기화 로직 추가
  - DocumentContext에서 중복된 자동 문서 선택 로직 제거하여 URL과 문서 상태 충돌 방지
  - React Router의 useLocation, useNavigate를 활용한 실시간 URL 동기화
  - 워크스페이스 변경, 새로고침, 직접 URL 접근 시 모든 상황에서 일관된 동작 보장

- [x] 문서 선택 시 무한 루프 문제 해결
  - App.jsx useEffect에서 location.pathname 의존성 제거로 URL 변경으로 인한 재실행 방지
  - DocumentEditor URL 동기화 useEffect에서 location.pathname 의존성 제거
  - DocumentEditor idSlug useEffect에서 selectDocument 의존성 제거
  - URL 검증은 워크스페이스/문서 목록 변경 시에만, URL 동기화는 문서 변경 시에만 실행되도록 분리
  - 사이드바에서 다른 문서 선택 시 안정적인 단방향 흐름 보장

- [x] 새로고침 시 WorkspaceContext selectedWorkspace 로딩 문제 해결
  - **근본 원인 발견**: 백엔드 DocumentResponse에 workspaceId 필드가 누락되어 모든 문서가 `[ws:undefined]`로 표시됨
  - **백엔드 수정**: DocumentResponse.java에 workspaceId 필드 추가 및 매핑 로직 구현
  - **프론트엔드 개선**: DocumentContext에 백엔드 응답 상세 로그 추가로 workspaceId 확인 가능
  - **필터링 강화**: workspaceId 또는 workspace.id로 이중 확인하는 필터링 로직 적용
  - WorkspaceContext에 상세 디버깅 로그 추가: savedId 읽기, workspaces 목록, 워크스페이스 찾기/설정 과정
  - App.jsx에 workspaceId 포함 문서 목록 디버깅 로그 추가
 
 - [x] P1.2 테이블 행 관리(드래그 앤 드롭/체크박스/삭제) 1차 구현
   - 프론트엔드
     - `@radix-ui/react-checkbox` 추가, `components/ui/checkbox.jsx` 생성(shadcn 스타일)
     - `DocumentTableView.jsx`에 행 DnD 컨텍스트 추가(세로 정렬), 선택 상태(Set) 및 선택바(선택 개수/삭제) 구현
     - `TableRow.jsx`에 `useSortable` 적용, 드래그 핸들/체크박스는 `NameCell` 좌측 레일에 표시
     - `NameCell.jsx`에 체크박스/Grip 핸들 추가, 호버 시 표시되도록 처리
   - 백엔드
     - 자식 문서 정렬 API 추가: `PATCH /api/workspaces/{wsId}/documents/{parentId}/children/order` (배열 바디)
     - `DocumentRepository`에 `updateChildSortOrder` 쿼리 추가, 정렬 조회 메서드 `findByParentIdAndIsTrashedFalseOrderBySortOrderAscIdAsc`
     - `DocumentService.updateChildOrder()` 구현, `getChildDocuments()` 정렬 보장
     - `DocumentController`에 권한 체크 후 서비스 호출 엔드포인트 추가
   - 프론트/백엔드 연동
     - `documentApi.updateChildDocumentOrder()` 추가, DnD 종료 시 호출
     - 선택 삭제는 기존 `deleteDocument` 반복 호출(추후 bulk API 고려)

- [x] 테이블에서 새 문서 생성 후 "열기" 시 URL 진입 에러 수정
  - 문제: `useTableData` 훅이 문서 생성/제목수정 시 컨텍스트를 우회하여 API를 직접 호출해, `DocumentContext.documents`가 갱신되지 않아 App/Layout/Editor에서 URL 검증에 실패함
  - 수정: `useTableData`에서 컨텍스트의 `createDocument`, `updateDocument`를 사용하도록 변경하여 전역 문서 목록과 현재 문서 상태가 즉시 동기화되도록 개선
  - 파일: `frontend/src/components/documents/table/hooks/useTableData.js`
  - 영향: 테이블에서 새 행 생성 직후 "열기" 버튼으로 이동하면 `documents` 목록에 새 문서가 포함되어 URL 검증 통과 및 정상 렌더링

- [x] 공통 속성 DnD/상수 도입 및 테이블 적용
  - `shared/hooks/usePropertiesDnd.js` 추가: 컬럼/리스트 공용 속성 DnD 훅(기존 useColumnDnd 동작을 일반화)
  - `shared/constants.js` 추가: `SYSTEM_PROP_TYPES`, `DEFAULT_PROPERTY_WIDTH` 공용화
  - `DocumentTableView.jsx`에서 공통 훅/상수 사용하도록 수정, 기본 너비 상수 치환
  - 린트 통과 확인, 테이블 컬럼 DnD/리사이즈 기존 동작 
  - 2025-08-12: P2.3 버전 관리 착수. 백엔드 `document_versions` 엔티티/리포지토리/서비스/컨트롤러 추가(해시 기반 중복 방지, 90일 보관 정리). FE에 체류 타이머 훅 `usePageStayTimer` 추가, `DocumentEditor` 자동 스냅샷 연동(개발 30초, 운영 10분). 우측 상단 `버전 기록` 버튼 및 `VersionHistoryPanel` 사이드패널 구현(목록/단건 조회, PAGE 미리보기). API 클라이언트 함수 3종 추가.
- 2025-08-12: 버전 관리 1차 안정화 및 디버깅 체계 도입
  - FE 타이머 안정화: `usePageStayTimer`에 콜백 ref 적용, interval 재시작/cleanup 보강, 디버그 로그 추가. dev 모드 30초 간격 적용.
  - 로깅 유틸: `src/lib/logger.js` 추가(VITE_DEBUG/VITE_DEBUG_NS, URL/localStorage 토글, 네임스페이스 지원). `stayTimer`/`version`/`router`에 적용.
  - 라우팅 로그: `DocumentEditor.jsx`, `App.jsx`, `DocumentContext.jsx`에 `router` 네임스페이스 로깅 추가(slug sync/네비게이션/selectDocument).
  - 버전 UI 로깅: `VersionHistoryPanel.jsx`에 목록/단건 조회 로깅 추가 및 소소한 스타일 정리.
  - BE 보완: `DocumentVersionController` 인증 누락 시 401 명시. gradle assemble 확인.
  - 테이블 뷰에서 "열기" 동작 시 URL 동기화 경합 완화(`DocumentEditor` slug 동기화 로직 보수).
- 2025-08-15: versioning Phase A 진행 시작
  - 브랜치: `feature/versioning-be-restore`, `feature/versioning-fe-restore`
  - BE: `POST /api/workspaces/{wid}/documents/{docId}/versions/{versionId}/restore` 추가
    - 권한 체크: `PermissionService.checkPermission(..., WRITE)`
    - 서비스: 문서 필드(title/content/viewType/titleWidth) 복구, 속성/값 단순 재작성 복구
    - 빌드 성공(테스트 제외)
  - FE: `restoreDocumentVersion` API 추가, `VersionHistoryPanel`에 복구 버튼/확인/로딩/재조회 연동
  - 남은 일: 복구 후 속성/값/타이틀폭 UI 동기화 추가 검증, 권한 가드, 토스트로 교체, E2E 추가
  ## 2025-08-16

- 변경: `frontend/src/components/documents/VersionHistoryPanel.jsx` 우측 버전 기록 목록 무한 스크롤 방식을 `onScroll` 기반에서 `IntersectionObserver` 기반으로 전환.
- 의도: 스크롤 이벤트 발생 시 매 렌더링/계산을 줄여 렌더링 빈도를 최소화하고, 불필요한 상태 업데이트를 방지하여 성능 최적화.
- 주요 내용:
  - `useRef`로 스크롤 컨테이너와 센티넬 엘리먼트 참조 추가.
  - `handleScroll` 제거, `IntersectionObserver`를 통해 하단 센티넬이 보일 때 `loadPage(page + 1)` 호출.
  - 기존 페이지네이션/로딩 상태(`page`, `hasMore`, `loadingMore`, `loading`) 로직은 유지.
- 영향: UI/UX 동일, 렌더링/스크롤 처리 비용 감소.

- 추가: `VersionHistoryPanel`을 `React.memo`로 래핑하고, `DocumentHeader`에서 `onClose` 콜백을 `useCallback`으로 안정화하여 상위 리렌더로 인한 불필요한 하위 리렌더 및 로그 출력 빈도를 감소.
 - 2025-08-17: TrashModal 단순화 및 스크롤 점프 방지
   - 버튼(bottom)을 기준으로 모달(bottom)을 고정 배치: viewport 기준 `position: fixed`, `left = rect.right + 8`, `bottom = window.innerHeight - rect.bottom`
   - 초기 rAF 지연 제거, 스크롤 핸들러 제거(fixed 기준), 창 리사이즈 시에만 재측정
   - Radix 자동 포커스에 의한 스크롤 이동 방지: `onOpenAutoFocus={(e) => e.preventDefault()}` 유지
   - 애니메이션 종료 후 재측정 불필요: `onAnimationEnd` 제거
   - DOM 포탈 사용 불필요: `portal` 옵션 제거
   - 영향: 최초 오픈 시 document 영역 스크롤이 최하단으로 튀던 문제 해결, 사이드바 휴지통 버튼 위치와 일관된 정렬 보장
 - 2025-08-17: TrashModal 높이/위치 계산 정확도 개선
   - 문제: dialogHeight가 절반 수준으로 작게 측정되어(top 계산에 오차) 모달 위치가 어긋남
   - 원인: 애니메이션/변형(scale) 적용 상태에서 `offsetHeight` 사용, 스크롤 보정 누락, 렌더 직후 타이밍 문제
   - 수정: `getBoundingClientRect().height` 사용, `window.scrollY` 포함 보정, resize/scroll/애니메이션 종료 시 재측정, `requestAnimationFrame`으로 타이밍 안정화, 중첩 포탈 방지(`portal={false}`)
   - 파일: `frontend/src/components/layout/TrashModal.jsx`
- 2025-08-17: 휴지통 영구삭제/전체비우기 403 이슈 해결 및 참조 정리
  - 원인: 버전(DocumentVersion) 및 권한(Permission) 정리 없이 삭제 시 제약/보안 충돌 가능성이 있어 간헐적 오류 발생
  - 백엔드 수정:
    - `DocumentVersionRepository.deleteByDocument(Document)` 추가
    - `DocumentService.deleteDocumentPermanently()`에서 값→버전→권한→문서 순으로 삭제, TABLE 문서는 자식부터 하드 삭제
    - `DocumentService.emptyTrash()`에서 값 일괄 삭제 후 각 서브트리를 자식→부모 순으로 삭제
  - 영향: 속성 값/부모 여부와 관계없이 문서 영구삭제/전체비우기 일관 동작, FK 제약 오류 해소

- 2025-08-17: TABLE 문서 삭제 시 자식 일괄 처리 구현
  - 소프트 삭제: `ViewType.TABLE` 문서 삭제 시 모든 하위 문서를 함께 휴지통 처리
  - 영구 삭제: 하위 문서부터 값→버전→권한→문서 순으로 안전 삭제
  - 전체 비우기: 휴지통 내 문서들의 값 일괄 삭제 후 서브트리를 자식→부모 순서로 삭제
 - 2025-08-17: WebSocket 문서 정보 요청 과다(1초 간격) 및 재연결 루프 이슈 해결
   - 원인: `useDocumentSocket` 이펙트 의존성에 `onRemoteEdit`가 포함되어 콜백이 리렌더마다 새로 생성될 때마다 SockJS가 재연결됨 → `/ws/document/...` 요청이 1초 간격으로 발생하고 백엔드 로그가 계속 출력됨
   - 수정: 콜백을 `useRef`로 고정(`onRemoteEditRef`)하고, 구독 콜백에서 `onRemoteEditRef.current`를 사용. 이펙트 의존성 배열에서 `onRemoteEdit` 제거해 `documentId` 변경시에만 연결/해제 수행
   - 결과: 문서 화면 활성화 시 불필요한 재연결/하트비트 제거, 서버 로그 스팸 해소. 린트 통과 확인(`frontend/src/hooks/useDocumentSocket.js`).
 - 2025-08-17: 새 문서 생성 직후 이전 문서로 되돌아가는 라우팅 경합 문제 해결
   - 원인: `DocumentList.handleCreateDocument`에서 `selectDocument`가 먼저 실행되며, `App.jsx`/`DocumentEditor.jsx`의 URL 동기화/복원 로직과 경합하여 마지막 문서로 리디렉션되는 경우 발생
   - 수정: 새 문서 생성 후 URL을 먼저 신규 문서 경로(`/:id-:slug`)로 이동시키고, 이어서 `selectDocument`로 상세 데이터를 로드하도록 순서 변경. 빈 제목일 경우 슬러그에 `untitled` 사용
   - 추가: 문서 클릭 시 라우팅에서도 슬러그 생성 시 `untitled` 폴백 적용
   - 파일: `frontend/src/components/documents/DocumentList.jsx`
- 2025-08-17: 개발용 도커 구성 추가 및 FE/프록시 환경변수화
- 2025-08-19: Docker/Vite 개발환경 안정화
  - 프론트 Dockerfile을 Node 공식 Debian 이미지로 전환: `node:22-bookworm-slim`
  - inotify 네이티브 빌드 실패 회피
    - `.pnpmfile.cjs` 도입: `inotify` 패키지 install 스크립트 제거 (`frontend/.pnpmfile.cjs`)
    - Dockerfile에서 `.npmrc`, `.pnpmfile.cjs`를 install 이전에 COPY
    - `pnpm config set never-built-dependencies[] inotify`로 빌드 스킵 보강
    - pnpm overrides로 `inotify`를 로컬 스텁(`frontend/tools/stubs/inotify`)으로 치환
  - Vite dev 서버 안정화: `host: '0.0.0.0'`, `watch.usePolling: true`, 프록시 대상 `loadEnv` 적용
  - pnpm hoisted 링크 모드 사용, devDependencies 포함 설치
  - `frontend/.dockerignore` 추가로 컨텍스트/용량 최적화 (`node_modules`, 빌드 산출물, 로그, VCS/IDE 제외)
  - 결과: 도커 빌드 중 `inotify` 컴파일 오류 제거, 컨테이너 내 Vite dev 정상 기동/HMR 폴링 동작

- 2025-08-21 운영용 도커 구성 추가(Nginx 정적 배포 + API/WS 프록시)
  - `docker-compose.yml`: `db + backend + frontend(Nginx)` 구성 추가
  - `frontend/Dockerfile.prod`: 빌더(pnpm build) + Nginx 스테이지, dist 배포
  - `frontend/nginx.conf`: SPA `try_files`, `/api`는 `backend:8080` 프록시, `/ws`는 업그레이드 헤더 포함 WebSocket 프록시
  - `frontend/src/services/api.js`: 기본값을 `/api`로 단순화, VITE_API_BASE_URL로 오버라이드 가능
  - 효과: prod 실행 시 80 포트로 정적 제공, API/WS는 동일 도메인/포트에서 리버스 프록시
  - 경고 정리: Compose v2에서 `version` 키가 더 이상 사용되지 않으므로 `docker-compose.yml` 상단의 `version: "3.9"` 항목 제거
 - 2025-08-23: Editor 블록 DnD 1차 도입 시작
   - FE: `BlockDragHandle` 확장 추가(`frontend/src/components/editor/extensions/BlockDragHandle.js`)
     - 블록 시작 위치에 드래그 핸들 위젯 데코레이션 표시, 클릭 시 `NodeSelection` 설정
     - 드래그 시작 시 선택 노드 DOM을 Drag Image로 사용, 드롭 시 블록 단위 이동 처리(초기 단일 블록)
   - FE: `Editor.jsx`에 확장 통합, `Editor.css`에 핸들 스타일 추가
   - 린트 통과 확인

## 2025-08-24
- 시스템 속성 최신화 일관 처리(문서/속성값 변경 반영)
  - BE: `DocumentPropertyValueRepository`에 최신값 조회 추가
    - `findTopByDocumentIdOrderByUpdatedAtDesc(Long)`
    - `findLatestUpdatedAtByDocumentIds(List<Long>)` (목록 최적화용 집계 쿼리)
  - BE: `DocumentService`에 `applyLatestMeta` 도입
    - `DocumentResponse.updatedAt/updatedBy`를 문서 vs 속성값 중 더 최신 메타로 합성
    - 단건/워크스페이스 목록/전체/워크스페이스 없음/접근 가능 문서/자식 목록/휴지통/생성/수정 응답에 적용
  - DTO: `DocumentResponse`에 `setUpdatedAt`, `setUpdatedBy` 추가
  - FE(Page): `usePageData.handleValueChange`에서 값 저장 후 `fetchDocument(documentId, { silent: true, apply: false })`로 메타 갱신(전역 오염 방지)
  - FE(Table): 시스템 속성 맵/표시 안정화(`useMemo`, `PropertyCell`에서 `row.document` 우선)
  - 효과: LAST_UPDATED_BY/AT 시스템 속성이 문서/속성값 변경 시 페이지/테이블 모두 자동 최신 반영

## 2025-08-24 (추가)
- 값 저장 API 응답 확장 및 테이블 즉시반영
  - BE: `POST /documents/{docId}/properties/{propertyId}/value` 응답에 `{ updatedAt, updatedBy }` 포함(문서 vs 값 최신 기준)
  - FE: `useTableData`가 응답의 메타로 해당 행 `row.document.updatedAt/updatedBy` 즉시 갱신 (저장 직전 낙관적 now → 응답 도착 시 정확값 덮어쓰기)
  - FE(Context): `fetchDocument`에 `apply` 옵션 추가, PAGE에서 부모 이동 시 무한 로딩 방지
  
## 2025-08-25
- TableView 중복 API 호출 최소화 리팩토링
  - 원인: `DocumentTableView`가 zustand `fetchProperties`로 `/properties`를 호출하고, 동시에 `useTableData`가 동일 자원을 로딩 → 중복 요청 + React StrictMode로 2배 호출
  - 수정: `DocumentTableView.jsx`에서 zustand 기반 속성 fetch/useEffect 제거. 속성/행/에러/로딩은 모두 `useTableData` 한 곳에서만 관리
  - 컬럼 폭 계산도 `fetchedProperties` 기준으로 통일하여 상태 일관성 확보
  - 영향: 테이블 진입 시 `/properties`, `/children`, `/children/property-values` 호출 횟수 감소. Dev 모드에서도 StrictMode 이중 마운트 영향 최소화
 - Docker 컨테이너 TZ 설정 추가 (운영/개발 compose)
   - `docker-compose.yml`/`docker-compose.dev.yml`에 `TZ=Asia/Seoul` 추가 (db, backend)
   - backend에 `JAVA_TOOL_OPTIONS=-Duser.timezone=Asia/Seoul` 설정 추가
   - 목적: 도커 환경에서 생성/업데이트 시간 9시간 지연 표시 문제 해소 (KST 고정)
## 2025-08-26
- Editor 블록 DnD 정밀 동작 수정(행 이동 1↔2 문제 해결)
  - `BlockDragHandle.js` 개선:
    - 드롭 시 삭제 이후 좌표를 `tr.mapping.map(found.pos)`로 매핑하여 위치 어긋남 방지
    - 스키마 유효 삽입점 계산에 `dropPoint` + `Slice` 사용하여 리스트/중첩 컨텍스트에서도 안전 삽입
    - `dragover`에서 `preventDefault()`로 브라우저 드롭 허용 유지
    - 드래그 시작 처리 일원화: `handleDragStart`에서만 처리, 핸들 요소에 한해 drag image 설정 및 `dataTransfer` 초기화
  - 결과: 1행→2행 이동 불가, 3행→2행 시 1행으로 오입력되던 문제 해결. 상하 인접 이동이 기대대로 동작
## 2025-08-26 (추가)
- Editor 블록 DnD UI/UX 개선
  - 행 호버 시 좌측 드래그 핸들 표시, 호버 종료 시 자동 숨김
  - 드래그 중 블록 내용이 반투명(0.6) 프리뷰로 포인터를 따라 이동
  - 드롭 커서 실선 두께 2배로 증대, 색상은 Tailwind `bg-blue-300`(#93c5fd) 적용
  - 드롭 완료 후 해당 블록에 일시적 하이라이트(Tailwind `bg-blue-50`=#eff6ff) 표시
  - 파일: `frontend/src/components/editor/extensions/BlockDragHandle.js`, `frontend/src/components/editor/Editor.css`

## 2025-08-26 (마무리)
- Editor DnD 시각효과 정리(진행 중):
  - Dropcursor는 StarterKit 옵션(`dropcursor`)으로 색상/두께 적용 완료
  - 반투명 드래그 프리뷰/드롭 후 하이라이트는 일부 환경에서 미표시 이슈 확인 → 후속 과제로 이관
  - 후속 과제: 프리뷰 z-index/크기/스타일 강제 일관화, 드롭 직후 DOM 탐색 보강, 특정 블록(리스트/헤딩/문단)별 스타일 보정
  
## 2025-08-26 (추가-에디터 타이핑 유실 수정)
- 증상: 빠른 타이핑 시 문장 끝 글자 수 개가 간헐적으로 사라지는 문제
- 원인 추정:
  - 외부 `content` 동기화가 입력 중인 에디터 상태를 덮어쓰는 경쟁 조건
  - WebSocket 에코 메시지가 자기 자신 입력을 되돌리는 경우
- 수정 사항:
  - `Editor.jsx`: `content` → 에디터 동기화 시 IME 조합 중(`isComposing`) 또는 에디터 포커스 중(`editor.isFocused()`)엔 적용하지 않도록 가드. 현재 HTML과 다를 때만 `setContent` 수행.
  - `DocumentEditor.jsx`: WebSocket 전송 페이로드의 `userId`를 실제 로그인 사용자 `user.id`로 송신. 수신 시 `msg.userId === user.id` 에코 메시지는 무시하여 자체 입력 덮어쓰기 방지.
- 결과: 빠른 입력 및 한글 IME 조합 시 마지막 글자 잘림/유실 현상 재현 불가. 린트 무오류.
## 2025-08-28
- 부모 권한에 따른 자식 문서 접근 허용
  - BE: `DocumentService.getChildDocuments`에서 자식 문서 필터 시 부모 문서의 소유자이거나 부모에 대해 `PermissionStatus.ACCEPTED` 권한이 있는 사용자에게 접근 허용 로직 추가
  - 영향: 부모 문서에 초대된 사용자가 동일 워크스페이스 내 해당 부모의 직계 자식 문서를 목록에서 확인 가능
 - FE: 초대 사용자 onOpenRow로 자식 문서 직접 진입 시 목록에 없더라도 단건 조회로 로드
   - `DocumentEditor.jsx`의 URL id 슬러그 처리 이펙트에서 `documents`에 문서가 없을 때도 `selectDocument({ id })`로 단건 조회 트리거
   - 영향: 공유받은 사용자도 테이블 행 클릭으로 상세 페이지 진입 가능
 - BE: 단건 조회(GET /documents/{id})에서도 부모 권한 소유 시 접근 허용
   - `DocumentService.getDocument`에 부모 소유/부모에 대한 ACCEPTED 권한을 읽기 허용 조건에 포함
   - 영향: 목록엔 없지만 부모로 권한을 받은 자식 문서를 직접 URL 또는 onOpenRow로 접근할 때 403 대신 200 반환
 - FE: 공유 팝오버 권한 변경은 문서 소유자만 가능하도록 제한
   - `DocumentSharePopover.jsx`에 `isDocOwner` 도입, 초대 버튼/드롭다운/핸들러에서 소유자 아닐 때 비활성/차단
## 2025-08-31
- FE(Page): 읽기 전용 모드 UX 강화
  - `PagePropertyList`/`PagePropertyRow`: `isReadOnly`로 값/헤더 편집, TAG 팝오버, DnD 차단 및 핸들 미표시
  - `PageHeaderArea`: 읽기 전용 시 버튼 숨김(`DocumentPageView`에서 조건부 렌더)
  - `DocumentPageView`: 읽기 전용일 때 속성 리스트와 에디터 사이 구분선 추가
- FE(Editor): 읽기 전용 시 플러그인/툴바 숨김 및 붙여넣기 차단
  - `Editor.jsx`: `BlockDragHandle`은 editable일 때만 등록, 메뉴바 editable 조건부 렌더, `handlePaste`는 `!view.editable`이면 즉시 false 반환
- FE(List): 부모 미접근 자식 문서를 루트로 승격해 표시
  - `DocumentList.jsx`: 루트 후보 조건을 `parentId == null || !accessibleIds.has(parentId)`로 확장해 자식만 공유된 문서도 최상위에 노출
## 2025-08-31 (추가)
- BE: 자식 문서 단건 조회 시 부모 권한을 유효 권한으로 병합하여 응답
  - `DocumentService.getDocument`: 부모 문서의 ACCEPTED 권한(OWNER/WRITE/READ)을 자식 문서 `permissions`에 누락 사용자만 주입
  - 효과: 작성자 화면 `DocumentHeader`의 권한자 이니셜/뷰어 표시가 부모-자식 간 일관되게 반영(부모 권한만 있는 유저도 자식 문서에서 표시/강조)
 - FE: 상단 경로(breadcrumb) 표시가 부모만 접근 가능한 계정에서도 최소 현재 문서는 보이도록 개선
   - `DocumentEditor.jsx`의 경로 계산 로직을 보강하여 `documents` 목록에 현재 문서/부모가 없더라도 `currentDocument`로 1단계 이상 표시
   - 경로 클릭 시 목록에서 문서를 찾지 못하면 `/:id`로 안전 이동 후 슬러그 동기화 이펙트로 보정
   - 의도: 부모 권한만으로 접근한 자식 문서에서 경로가 비어 UI가 깨지는 문제 완화 및 예기치 않은 라우팅 전환 가능성 축소

## 2025-08-31 (추가)
- FE(Router): URL 문서가 목록에 없더라도 이미 `currentDocument`로 로드된 경우 리다이렉트하지 않도록 허용 (`App.jsx`). 부모 권한 계정에서 자식 페이지 편집 시 테이블로 되돌아가던 현상 해결.
- FE(Editor): 쓰기 권한 판정 보강 (`DocumentEditor.jsx`)
  - `isOwner`를 write-capable로 간주, `userId` 비교는 문자열 기준으로 통일.
  - 부모 상속 WRITE 사용자에 대해 `isReadOnly`가 잘못 true가 되는 문제 수정.
- FE(Context): 문서 업데이트 응답에 `permissions`가 누락된 경우 기존 `currentDocument.permissions`를 유지하도록 병합 처리 (`DocumentContext.updateDocument`). 상속 권한이 저장 중 사라지지 않도록 보존.
- BE(Versioning): 버전 생성 시 누락 필드를 문서 현재값으로 보정하여 500 방지 (`DocumentVersionService.createVersion`)
  - `title/viewType/titleWidth`가 null이면 문서 값(및 기본 288)으로 대체.
- BE(Document): 단건 조회/수정 응답 로직 중복 제거 및 일관화 (`DocumentService`)
  - `buildResponseWithMergedPermissions(Document)` 헬퍼 추가: 부모의 ACCEPTED 권한을 병합하고, 부모가 있으면 부모 속성 기준으로 `propertyDtos` 구성 후 최신 메타 적용.
  - `getDocument`, `updateDocument` 모두 동일 헬퍼 사용 → 업데이트 응답에도 부모 상속 권한이 포함되어 FE 헤더 아바타/공유 버튼/쓰기 가드 상태가 일관 유지.
 - FE(접근성): 공유 팝오버 `DialogContent`에 필수 `DialogTitle`/`DialogDescription` 연결 추가로 경고 제거 (`DocumentSharePopover.jsx`). 측정 렌더 브랜치와 본 렌더 모두에 `aria-describedby`와 `sr-only` 설명 제공.
## 2025-09-01
- FE(Page): `DocumentPageView.jsx` 좌우 패딩을 고정 `px-80`에서 반응형 비율 패딩으로 변경
  - 클래스: `px-4 sm:px-6 md:px-[8vw] lg:px-[10vw] xl:px-[12.5vw]`
  - 의도: 16"에서는 여백을 줄이고, 32" 기준 비율을 유지하며 50" 등 초대형 화면에서도 적절한 여백 자동 조정(vw 기반)
  - 빌드/린트 무오류 확인
 - FE(Header): `DocumentHeader.jsx`에 뷰 타입별 패딩 분기 추가
   - TABLE 뷰일 때 `px-20` 고정, 그 외에는 반응형(`px-6 sm:px-8 md:px-[10vw] lg:px-[14vw] xl:px-[18vw]`)
   - 의도: 테이블 화면은 넓은 캔버스 확보, 페이지/갤러리는 화면 크기별 균형 잡힌 여백 유지
 - FE(UI): 시스템 속성 '생성자/최종 편집자'에 사용자 뱃지(UserBadge) 도입
   - 공용 컴포넌트 `frontend/src/components/documents/shared/UserBadge.jsx` 추가 (프로필 이미지 또는 이니셜 + 이름)
   - PAGE: `PagePropertyRow.jsx`에서 `CREATED_BY`/`LAST_UPDATED_BY` 값에 `UserBadge` 렌더
   - TABLE: `PropertyCell.jsx`에서 행의 `row.document.permissions`에서 이메일 매칭해 `name/profileImageUrl` 매핑 후 `UserBadge` 렌더
   - BE: `PermissionInfo` DTO에 `profileImageUrl` 필드 추가로 아바타 URL 제공
   - 린트 통과, 기존 동작과 호환(프로필 이미지 없을 경우 이니셜 표시)
## 2025-09-04
- FE(Share Popover): 권한 변경 직후 전체 문서 재적용을 피하기 위해 `fetchDocument(documentId, { silent: true, apply: false })`로 전환 (`DocumentSharePopover.jsx`). 작성자 화면에서 공유자 권한을 WRITE로 올릴 때 일시적으로 본인이 읽기 전용으로 표시되던 깜빡임 해소.
 - FE(Share Popover): 팝오버 내 권한 목록을 로컬 상태(`localPermissions`)로 유지하고, 변경 직후 즉시 반영하도록 개선. DB에는 반영되지만 팝오버 라벨이 갱신되지 않던 문제 해결 (`DocumentSharePopover.jsx`). 팝오버 닫힐 때 `fetchDocument(documentId, { silent: true, apply: true })`로 전역 동기화하여 다음 오픈 시 최신 라벨 보장.

## 2025-09-06
- FE(Editor): bullet/ordered 리스트 마커가 보이지 않는 문제 해결
  - 원인: Tailwind 리셋 영향으로 `.ProseMirror` 내부 `ul/ol`의 `list-style`이 사라짐
  - 수정: `frontend/src/components/editor/Editor.css`에 `.ProseMirror ul{list-style:disc}`, `.ProseMirror ol{list-style:decimal}` 및 `list-style-position: outside` 추가
  - 영향: 툴바에서 글머리/번호 목록 클릭 시 마커가 정상 표시, 체크리스트(`ul[data-type="taskList"]`)는 기존 비표시 유지

## 2025-09-04
- Docker Compose 실행 시 DB만 올라가는 문제 해결
  - **문제 원인 분석**: `docker-compose.yml`에서 포트 매핑, 네트워크 설정, 의존성 설정 부족
  - **주요 수정사항**:
    - 포트 매핑 추가: `backend:8080`, `db:5432`
    - 헬스체크 추가: DB가 완전히 준비된 후 backend 시작 (`condition: service_healthy`)
    - 네트워크 설정: `notion-network` 브리지 네트워크 추가
    - 컨테이너 이름: 각 서비스에 고유한 이름 부여
    - 재시작 정책: `restart: unless-stopped` 추가
  - **결과**: `docker-compose up` 실행 시 모든 서비스가 순서대로 올라가며, 의존성 기반 안정적인 실행 보장
 - FE(Editor): 핸들 바 수직 이동 추적 개선
   - 요청사항 반영: X를 유지한 수직 이동만으로도 해당 행 핸들이 표시되도록 DOM Y-근접 매칭 우선 적용(`mousemove`/`dragover`)
   - 보조: DOM 매칭 불가 시 `posAtCoords` → 블록 탐색 → 리스트 부모 승격으로 계산

- FE(Versioning Preview): 버전 패널에서 태그/체크리스트 표시 오류 수정
  - 원인 1: 태그 옵션 ID와 값(ID 배열) 비교 시 숫자/문자열 타입 불일치로 라벨 매칭 실패
  - 수정 1: `String(opt.id) === String(tid)`로 비교 통일하여 라벨 정상 표시
  - 원인 2: 우측 미리보기 영역이 일반 `prose`만 사용해 에디터의 체크리스트 레이아웃 CSS(`.ProseMirror`)가 적용되지 않아 체크박스 행 줄바꿈
  - 수정 2: 미리보기 컨테이너에 `className="max-w-none ProseMirror prose"` 적용, 에디터 기본 높이/패딩은 무효화(`style={{ minHeight:'auto', padding:0 }}`)
  
 - FE(Editor Toolbar): 콘텐츠 스크롤 시 툴바가 화면 상단에 고정되도록 sticky 적용
   - 파일: `frontend/src/components/editor/EditorMenuBar.jsx`
   - 변경: 툴바 컨테이너에 `className="sticky top-0 z-30 bg-white border-b border-input"` 적용
   - 효과: 에디터 내용이 Y축 스크롤되어도 툴바가 상단에 고정되어 항상 접근 가능

## 2025-09-07
- FE(Settings): 새로운 설정 패널 셸 도입 및 연동 시작
  - `frontend/src/components/settings/SettingsPanel.jsx` 추가
    - 레이아웃: `VersionHistoryPanel`과 동일한 고정 오버레이 + 카드 패널 구조 재사용
    - 좌측 네비 섹션: 계정(기본 설정/비밀번호 변경), 워크스페이스(일반) 플레이스홀더 구성
    - 우측 컨텐츠 영역: 후속 태스크에서 각 폼/검증/API 연동 예정
  - `WorkspaceList.jsx`의 설정 버튼이 기존 모달 대신 새 패널을 열도록 연동(`isSettingsPanelOpen` 상태 추가)
  - AccountBasicForm 컴포넌트 및 account-basic 설정 완전 구현
  - userApi.js 생성: getProfile/updateProfile/changePassword API 추가
  - AccountBasicForm 컴포넌트: 이름/이메일 수정, 프로필 이미지 업로드, 비밀번호 변경 폼 구현
  - AuthContext에 updateUser 함수 추가하여 사용자 정보 동기화 지원
  - SettingsPanel에서 AccountBasicForm 연동 완료
  - 에러 처리, 로딩 상태, 유효성 검증 UX 구현 (현재는 alert 사용, 추후 toast 시스템 추가 가능)
  - 백엔드 사용자 API 완전 구현:
    - User 엔티티에 profileImageUrl 필드 이미 존재 확인
    - UserService 생성: 프로필 조회/업데이트, 비밀번호 변경 로직
    - UserController 생성: /api/users/profile (GET/PUT), /api/users/change-password (PUT)
    - DTO 클래스들 생성 (UpdateProfileRequest, ChangePasswordRequest, UserProfileResponse, ProfileUpdateResponse)
    - UserResponse에 profileImageUrl 필드 추가
    - SecurityConfig에서 JWT 인증 필터 적용 및 사용자 API 인증 필요 경로 설정
  - WorkspaceGeneralForm에 소유자 권한 체크 기능 추가:
    - 현재 사용자가 워크스페이스 소유자가 아닌 경우 모든 인풋/버튼 비활성화
    - 시각적 비활성화 처리 (opacity 60%, pointer-events-none)
    - 권한 안내 메시지 표시 (Lock 아이콘과 함께)
    - 소유자만 변경 가능하다는 명확한 UX 제공
  - 모든 모달의 z-index 수정으로 EditorMenuBar보다 위에 표시되도록 개선:
    - SettingsPanel: z-[9999] → inline style zIndex 99999 (최우선 적용)
    - VersionHistoryPanel: z-[9999] 
    - AuthorFilterModal: zIndex 9998
    - DocumentSharePopover: zIndex 9998
    - DateFilterModal: zIndex 9998
    - EditorMenuBar: z-30 → z-10 (더 낮게 조정)
    - inline style 사용으로 CSS 우선순위 최상위 적용하여 문제 완전 해결
## 2025-09-08
- FE(Tooltip): UserBadge 마우스 호버 시 사용자 정보 툴팁 기능 구현
  - `frontend/src/components/ui/tooltip.jsx` 추가: 재사용 가능한 Tooltip 컴포넌트 생성
    - 단일 컴포넌트로 트리거와 컨텐츠를 모두 처리하는 간단한 구조
    - `side` prop으로 툴팁 표시 위치 제어 (top/bottom/left/right)
    - `delayDuration`으로 호버 지연 시간 제어 (기본 700ms)
    - 마우스 엔터/리브 시 타이머 기반으로 툴팁 표시/숨김 처리
    - 동적 위치 계산으로 트리거 요소 기준 정확한 툴팁 위치 표시
  - `frontend/src/components/documents/shared/UserBadge.jsx` 수정: 툴팁 기능 적용
    - 사용자 이름과 이메일을 조합한 툴팁 내용 생성 (`getTooltipContent` 함수)
    - 이름이 있으면 "이름 (이메일)", 없으면 "이메일"만 표시
    - 기존 UserBadge UI를 Tooltip 컴포넌트로 감싸 호버 시 정보 표시
    - 기존 동작과 완전히 호환되도록 처리 (툴팁 내용이 없으면 툴팁 미표시)
  - 영향: 문서 헤더의 권한자 아바타, 페이지/테이블 뷰의 생성자/편집자 정보에 마우스 호버 시 상세 정보 확인 가능
  - 툴팁 스타일 개선: 사용자 이름과 이메일을 두 줄로 표시 (이름은 font-medium, 이메일은 작은 크기로 구분)

## 2025-09-09
- DocumentTableView 상단 툴바 기능 구현 (feature/table-toolbar 브랜치)
  - 새로 만들기 버튼: 테이블 첫 행에 신규 문서 생성
  - 슬라이드 검색 기능: 돋보기 아이콘 클릭시 검색 인풋이 슬라이드 애니메이션으로 나타나며 문서 이름 실시간 필터링
  - 필터 드롭다운: 시스템/사용자 속성 목록 표시 (기본 구조)
  - 정렬 아이콘: 플레이스홀더 추가
  - 컴포넌트 구조: TableToolbar, SearchSlideInput, FilterDropdown, useTableSearch/useTableFilters 훅
  - 검색/필터 상태 연동 및 빈 상태 메시지 처리

## 2025-09-11
- 테이블 상단 툴바 개선 및 검색 UX 업데이트
  - 툴바 위치: 테이블 컨테이너 기준 Y 좌표를 계산하여 `fixed right-20`로 화면 우측에 고정 (resize/scroll 동기화)
  - 검색 인풋: 하단 팝업 방식 → 인라인 확장 방식으로 변경 (좌측에서 우측으로 w-8 → w-56)
  - 돋보기 버튼: 별도 버튼 제거, 기존 버튼을 인풋 좌측으로 이동하여 토글 동작(onToggle) 수행
  - X 버튼: 검색어가 있을 때만 노출, 클릭 시 인풋을 닫지 않고 검색어만 초기화
  - 인풋 스타일: 테두리/외곽선 제거, 높이 `h-8`로 툴바 다른 버튼들과 동일하게 정렬
  - ESC/외부 클릭 시 닫힘 처리 추가

- 새 문서 추가 동작 분리 및 DB 정렬 동기화
  - 상단 툴바의 "새 문서": 첫 행에 추가 (`handleAddRowTop`)
  - 하단 "+ 새 페이지": 마지막 행에 추가 (`handleAddRowBottom`)
  - 새 문서 생성 후 현재 행 순서 배열을 기반으로 `updateChildDocumentOrder` 호출하여 DB의 `sort_order` 동기화

## 2025-09-14
- DocumentSharePopover 접근성 경고 수정
  - 문제: DialogContent에 Description 또는 aria-describedby 속성이 누락되어 접근성 경고 발생
  - 수정: DialogDescription과 aria-describedby 속성을 제거하고 DialogTitle만 사용하도록 단순화
  - 파일: frontend/src/components/documents/DocumentSharePopover.jsx
  - 영향: 접근성 경고 해결, 기존 기능 동일하게 유지

- 테이블 정렬 기능 완전 구현
  - **useTableSort 훅**: 다중 정렬 상태 관리 및 정렬 로직 구현
    - `addSort`, `updateSort`, `removeSort`, `clearAllSorts` 메서드 제공
    - 시스템 속성(이름, 생성일, 수정일)과 사용자 정의 속성별 타입별 정렬 처리
    - 오름차순/내림차순 지원, 다중 정렬 우선순위 적용
    - 로거 유틸 연동으로 디버깅 지원 (`createLogger('useTableSort')`)
  - **SortManager 컴포넌트**: 정렬 관리 UI 구현
    - 정렬된 속성별 버튼 표시 (속성명 + 정렬 순서)
    - 정렬 팝오버: 속성명과 정렬 순서 변경 가능
    - "정렬 추가" 드롭다운으로 추가 가능한 속성 선택
    - ESC 키 및 외부 클릭으로 팝오버 닫기 처리
  - **TableToolbar 통합**: 정렬 기능을 툴바에 완전 통합
    - SortDropdown과 SortManager를 툴바에 배치
    - 읽기 전용 모드에서 정렬 기능 비활성화
    - 고정 위치 계산 및 반응형 레이아웃 지원
  - **정렬 타입별 처리**:
    - TEXT: 문자열 정렬 (대소문자 구분)
    - NUMBER: 숫자 정렬
    - DATE: 날짜 정렬
    - CHECKBOX: 체크박스 상태 정렬
    - TAG: 태그 배열 길이 기준 정렬
    - 기타: 문자열 변환 후 정렬
  - **UX 개선**: 정렬 상태 시각적 표시, 직관적인 정렬 순서 변경, 다중 정렬 지원

## 2025-09-15
- 테이블 정렬 시 새 문서 위치 문제 해결
  - **문제**: 생성일시 내림차순 정렬 설정 후 새 문서 버튼 클릭 시 새 문서가 맨 아래에 추가되는 문제
  - **원인**: 정렬 로직에서 빈 값 처리와 정렬 방향 적용이 잘못되어 새로 생성된 문서가 올바른 위치에 표시되지 않음
  - **수정사항**:
    - `useTableSort.js`: 날짜 비교 로직에서 빈 값 처리 개선, 정렬 방향에 따른 결과 계산 단순화
    - `SortManager.jsx`: 생성일시/수정일시 정렬 추가 시 기본값을 내림차순으로 설정
    - `SortDropdown.jsx`: 동일하게 생성일시/수정일시 정렬 시 기본값을 내림차순으로 설정
    - `addSort` 함수에 `defaultOrder` 매개변수 추가하여 속성 타입별 기본 정렬 순서 설정
  - **결과**: 생성일시 내림차순 정렬 시 새 문서가 맨 위에 올바르게 표시됨

## 2025-09-15 (추가)
- 테이블 정렬 상태 사용자별 영속 저장 기능 구현
  - **목적**: 사용자가 설정한 정렬 상태를 로컬스토리지에 저장하여 페이지 새로고침이나 재방문 시에도 유지
  - **구현사항**:
    - `useTableSort` 훅에 로컬스토리지 저장/불러오기 기능 추가
    - 사용자 ID와 문서 ID를 조합한 고유 키(`tableSort_{userId}_{documentId}`)로 정렬 상태 저장
    - 정렬 추가/수정/삭제/전체제거 시 자동으로 로컬스토리지에 저장
    - 컴포넌트 마운트 시 이전 정렬 상태 자동 복원
    - `useAuth` 훅을 통해 사용자 정보 접근
    - `DocumentTableView`에서 `documentId`를 `useTableSort` 훅에 전달
  - **기능**:
    - 사용자별 독립적인 정렬 상태 관리
    - 문서별 독립적인 정렬 상태 관리
    - 페이지 새로고침 후에도 정렬 상태 유지
    - 에러 처리 및 로깅 기능 포함
  - **결과**: 사용자가 설정한 정렬 상태가 영속적으로 저장되어 향후 접근 시 자동으로 복원됨

## 2025-09-15 (추가)
- 테이블 정렬 상태 문서 소유자 전용 전역 저장 기능 구현
  - **목적**: 문서 소유자가 설정한 정렬 상태를 DB에 저장하여 모든 사용자에게 동일한 정렬 순서 적용
  - **구현사항**:
    - 백엔드: `DocumentService.updateChildSortOrderByCurrentSort` 메서드 추가
      - 문서 소유자 권한 검증 후 자식 문서들의 `sortOrder` 필드 업데이트
      - 기존 `updateDocumentOrder` 메서드 재사용하여 일관성 유지
    - 백엔드: `DocumentController`에 `POST /{documentId}/children/sort-by-current` API 엔드포인트 추가
    - 프론트엔드: `documentApi.updateChildSortOrderByCurrentSort` API 클라이언트 함수 추가
    - 프론트엔드: `SortManager` 컴포넌트에 소유자 전용 "모두에게 저장" 버튼 추가
    - 프론트엔드: 문서 소유자 확인 로직 추가 (`currentDocument.userId === user.id`)
    - 프론트엔드: `useTableSort` 훅에 `getSortedDocumentIds` 함수 추가하여 현재 정렬된 문서 ID 배열 반환
  - **기능**:
    - 문서 소유자만 "모두에게 저장" 버튼 표시
    - 현재 정렬 상태를 기반으로 자식 문서들의 `sortOrder` 필드 업데이트
    - 모든 사용자가 동일한 정렬 순서로 문서 목록 확인 가능
    - 로컬스토리지와 DB 저장 방식 분리 (개인 설정 vs 전역 설정)
  - **결과**: 문서 소유자가 설정한 정렬 순서가 모든 사용자에게 적용되어 일관된 문서 순서 제공

## 2025-09-15 (추가)
- shadcn/ui Toast 시스템 도입
  - **목적**: 브라우저 기본 alert/confirm 대화상자를 모던한 디자인의 toast 메시지로 대체
  - **구현사항**:
    - `@radix-ui/react-toast` 패키지 설치 및 shadcn/ui Toast 컴포넌트 생성
    - `frontend/src/components/ui/toast.jsx`: 기본 Toast 컴포넌트
    - `frontend/src/components/ui/toaster.jsx`: Toast 컨테이너 컴포넌트
    - `frontend/src/hooks/useToast.js`: Toast 상태 관리 훅
    - `frontend/src/App.jsx`에 Toaster 컴포넌트 추가
    - `SortManager` 컴포넌트에서 AlertDialog 제거하고 toast 메시지로 변경
  - **기능**:
    - 3초 후 자동으로 사라지는 비침습적 알림
    - 성공/실패 상태에 따른 적절한 색상과 아이콘
    - 화면 하단 가운데에서 아래에서 위로 나타나고 아래로 사라지는 애니메이션
    - shadcn/ui 디자인 시스템과 완전 통합
  - **결과**: 사용자 경험 향상 및 일관된 디자인 시스템 적용

## 2025-09-15 (추가)
- Toast 애니메이션 및 위치 최적화
  - **문제**: Toast 메시지가 우측 하단에 표시되고 애니메이션이 제대로 작동하지 않는 문제
  - **해결방법**:
    - Tailwind CSS 설정에 커스텀 애니메이션 추가
      - `toast-slide-in-from-bottom`: 아래에서 위로 나타나는 애니메이션
      - `toast-slide-out-to-bottom`: 아래로 사라지는 애니메이션
    - Toast 컴포넌트에서 직접 위치 및 애니메이션 클래스 적용
      - `fixed bottom-0 left-1/2 -translate-x-1/2`: 하단 가운데 위치
      - `data-[state=open]:animate-toast-slide-in-from-bottom`: 나타날 때 애니메이션
      - `data-[state=closed]:animate-toast-slide-out-to-bottom`: 사라질 때 애니메이션
    - CSS 오버라이드 방식 대신 컴포넌트 레벨에서 직접 제어
  - **결과**: Toast 메시지가 화면 하단 가운데에서 부드러운 애니메이션으로 표시됨

## 2025-09-16
- SortManager 외부 클릭 닫기 기능 구현
  - **목적**: SortManager 팝오버 외부 영역 클릭 시 팝오버가 자동으로 닫히도록 하는 UX 개선
  - **구현사항**:
    - `useEffect`를 사용한 외부 클릭 감지 로직 추가
    - `mousedown` 이벤트 리스너로 외부 클릭 감지
    - 팝오버 내부 클릭 시 이벤트 전파 방지 (`stopPropagation`)
    - 10ms 지연을 두어 내부 클릭 이벤트가 먼저 처리되도록 함
    - `handlePopoverClick` 함수로 팝오버와 드롭다운 컨테이너의 클릭 이벤트 처리
  - **기능**:
    - 팝오버 내부 클릭 시 팝오버 유지
    - 팝오버 외부 클릭 시 팝오버와 드롭다운 모두 닫기
    - ESC 키로도 팝오버 닫기 (기존 기능 유지)
    - Select 컴포넌트 옵션 선택이 정상적으로 작동
  - **결과**: 사용자가 원하는 대로 외부 클릭 시 팝오버가 닫히고, 내부 상호작용은 정상적으로 작동함

## 2025-09-16 (추가)
  - 에디터에서 Tab/Shift+Tab 키로 4칸 들여쓰기/내어쓰기 기능 구현 (TabIndent 확장 추가)
    - TabIndent.js 확장 생성: Tab 키로 4칸 공백 추가, Shift+Tab으로 4칸 공백 제거
    - Editor.jsx에 TabIndent 확장 추가하여 기본 핸들 동작 대체
  - PageView에서 타이틀 → 속성들 → 에디터 순서로 Tab 키 네비게이션 구현
    - DocumentEditor.jsx: 타이틀 Tab 키 처리 추가, pageViewRef로 PageView와 연동
    - DocumentPageView.jsx: forwardRef로 변경, focusFirstProperty 함수 구현
    - PagePropertyList.jsx: forwardRef로 변경, focusNextProperty 함수로 속성 간 이동 처리
    - PagePropertyRow.jsx: forwardRef로 변경, Tab 키로 다음 속성 또는 에디터로 이동
  - 태그 속성에서 화살표/엔터 키로 옵션 선택 및 Tab 키로 다음 속성 이동 기능 구현
    - TagPopover.jsx: 화살표 위/아래로 옵션 선택, 엔터로 확인, Tab으로 다음 속성 이동
    - 선택된 옵션 시각적 표시 (파란색 배경), 입력값 변경 시 선택 초기화
  - DocumentEditor에서 idSlug 파싱 및 문서 선택

## 2025-09-17 (에러 처리 시스템 개선)
- **전역 에러 처리 시스템 구현**
  - `ErrorBoundary.jsx`: React Error Boundary 구현으로 예상치 못한 에러 캐치 및 사용자 친화적 폴백 UI 제공
  - `ErrorMessage.jsx`: HTTP 상태 코드별 맞춤형 에러 메시지 및 복구 액션 제공하는 재사용 가능한 컴포넌트
  - `useErrorHandler.js`: 에러 처리 로직을 캡슐화한 커스텀 훅으로 일관된 에러 처리 방식 제공
- **API 인터셉터 개선**
  - `api.js`: 401/403/500 에러별 차별화된 처리 로직 구현
  - 401: 토큰 제거 및 로그인 페이지 리다이렉트
  - 403: 권한 문제로 토큰 유지, 사용자에게 권한 안내
  - 500+: 서버 에러 로깅 강화
- **기존 컴포넌트 에러 처리 개선**
  - `DocumentTableView.jsx`: alert() 대신 useErrorHandler 훅과 ErrorMessage 컴포넌트 사용
  - Toast 시스템과 연동하여 비침습적 에러 알림 제공
  - 에러 발생 시 사용자가 취할 수 있는 액션(다시 시도, 닫기) 제공
- **App.jsx에 Error Boundary 적용**
  - 최상위 레벨에서 예상치 못한 에러를 캐치하여 전체 앱 크래시 방지
  - 개발 환경에서만 상세 에러 정보 표시, 운영 환경에서는 사용자 친화적 메시지 제공

## 2025-09-17 (토큰 만료 시 자동 리다이렉트 구현)
- **403 토큰 만료 시 로그인 페이지 자동 리다이렉트 구현 완료**
  - **API 인터셉터 개선** (`api.js`):
    - 토큰 만료 엔드포인트 구분: 특정 엔드포인트(`/api/workspaces/accessible`, `/api/users/profile`, `/api/documents`)에서 403 에러 발생 시 토큰 만료로 간주
    - 자동 리다이렉트: 토큰 만료 시 localStorage 정리 후 로그인 페이지로 자동 이동
    - 부드러운 네비게이션: `window.location.href` 대신 React Router의 `navigate` 함수 사용
  - **WorkspaceContext 개선**:
    - 403 에러 조용한 처리: 토큰 만료로 추정되는 403 에러는 에러 상태를 설정하지 않고 조용히 종료
    - 사용자 경험 향상: 에러 메시지 노출 없이 자동으로 로그인 페이지로 이동
  - **App.jsx 리다이렉트 함수 설정**:
    - 전역 리다이렉트 함수: API 인터셉터에서 사용할 수 있는 리다이렉트 함수 설정
    - React Router 연동: `navigate('/login', { replace: true })`로 부드러운 페이지 전환
  - **개선 효과**:
    - 사용자 경험 향상: 에러 코드 대신 자동 로그인 페이지 이동
    - 보안 강화: 토큰 만료 시 즉시 정리 및 재인증 유도
    - 일관된 처리: 모든 토큰 만료 상황에서 동일한 동작
    - 부드러운 전환: 페이지 새로고침 없이 React Router 네비게이션

## 2025-09-17 (App.jsx 리팩토링 및 컴포넌트 분리)
- **App.jsx 리팩토링 완료**
  - **문제점**: App.jsx가 비대해져 가독성과 유지보수성 저하
  - **해결 방법**: 단일 책임 원칙에 따라 기능별로 컴포넌트 분리
  - **분리된 컴포넌트들**:
    - `App.jsx`: 204줄 → 59줄로 대폭 축소, 핵심 구조만 유지 (Router, Provider 설정, 인증 상태 분기)
    - `AppRouter.jsx`: 복잡한 URL 검증 및 리다이렉트 로직, 문서 경로 계산 및 네비게이션 처리
    - `AuthRouter.jsx`: 로그인/회원가입 페이지 라우팅, 인증되지 않은 사용자용 간단한 라우터
    - `MainLayout.jsx`: 사이드바와 메인 콘텐츠 영역 구성, Toast 컴포넌트 포함
  - **개선 효과**:
    - 가독성 향상: 각 컴포넌트가 단일 책임을 가짐
    - 유지보수성: 기능별로 분리되어 수정이 용이
    - 재사용성: 각 컴포넌트를 독립적으로 사용 가능
    - 테스트 용이성: 작은 단위로 분리되어 테스트 작성이 쉬움
    - 코드 구조: 명확한 계층 구조와 관심사 분리

## 2025-09-17 (테이블 셀 탭키 네비게이션 기능 구현)
- **테이블 셀 선택 및 탭키 네비게이션 기능 구현 완료**
  - **DocumentTableView.jsx**: 선택된 셀 상태 관리 및 네비게이션 로직 추가
    - `selectedCell` 상태로 현재 선택된 셀 추적
    - `navigateToNextCell` 함수로 탭키 이동 시 다음 셀 계산
    - `handleCellKeyDown` 함수로 탭키/엔터키 이벤트 처리
    - `handleCellClick` 함수로 셀 클릭 시 선택 상태 업데이트
  - **TableRow.jsx**: 새로운 props 전달 및 셀 컴포넌트 연동
    - `selectedCell`, `onCellClick`, `onCellKeyDown` props 추가
    - NameCell과 PropertyCell에 새로운 props 전달
  - **NameCell.jsx**: 셀 선택 및 탭키 네비게이션 기능 구현
    - 선택된 셀 강조 표시 (파란색 테두리, 연한 파란색 배경)
    - 탭키로 다음 셀 이동, 엔터키로 편집 모드 진입
    - input 필드에서 탭키로 편집 종료 후 다음 셀 이동
    - `tabIndex` 속성으로 키보드 포커스 관리
  - **PropertyCell.jsx**: 동일한 셀 선택 및 네비게이션 기능 구현
    - 시스템 속성은 편집 불가하므로 탭키 네비게이션 제외
    - TEXT/NUMBER 타입 input 필드에서 탭키 네비게이션 지원
    - 선택된 셀 시각적 강조 표시
  - **기능 동작**:
    - 셀 클릭 시 해당 셀 선택 및 강조 표시
    - 탭키로 우측 셀 또는 다음 행 첫 번째 셀로 이동
    - 엔터키로 편집 모드 진입
    - 편집 중 탭키로 편집 종료 후 다음 셀 이동
    - 마지막 셀에서 탭키 시 다음 행 첫 번째 셀로 이동
  - **UX 개선**: 노션과 유사한 테이블 셀 네비게이션 경험 제공

## 2025-09-17 (테이블 셀 키보드 네비게이션 고도화)
- **테이블 셀 화살표 키 네비게이션 기능 구현 완료**
  - **DocumentTableView.jsx**: 화살표 키 네비게이션 로직 추가
    - `navigateToCell` 함수로 상하좌우 방향별 셀 이동 처리
    - 행 간 이동 시 자동으로 다음/이전 행의 같은 위치 셀로 이동
    - 경계 처리: 첫 번째/마지막 행이나 열에서는 이동하지 않음
  - **NameCell.jsx & PropertyCell.jsx**: 화살표 키 이벤트 처리 추가
    - input 필드에서 화살표 키 입력 시 편집 모드 종료 후 셀 이동
    - 모든 방향 키(↑↓←→) 지원
  - **기능 동작**:
    - ← → 키: 좌우 셀 이동
    - ↑ ↓ 키: 상하 행의 같은 위치 셀로 이동
    - 편집 중 화살표 키: 편집 모드 종료 후 셀 이동
    - Tab 키와 우측 화살표 키 동일 동작으로 중복 함수 제거

- **ESC 키로 수정 모드 해제 기능 구현**
  - **DocumentTableView.jsx**: ESC 키 처리 추가
  - **NameCell.jsx & PropertyCell.jsx**: 모든 input 필드에 ESC 키 처리 추가
  - ESC 키 누르면 편집 모드 해제하고 기본 선택 모드로 복귀

- **태그 셀 팝오버 동작 개선**
  - **PropertyCell.jsx**: 태그 셀 접근 시 자동 팝오버 표시 제거
  - **DocumentTableView.jsx**: 엔터 키 처리 시 태그 타입 확인하여 팝오버 위치 설정
  - **TagPopover.jsx**: 키보드 이벤트 전파 방지로 테이블 셀 이동 차단
  - **동작 방식**:
    - 탭/화살표로 접근: 선택만 됨 (팝오버 표시 안됨)
    - 엔터 키: 팝오버 표시 및 편집 모드 진입
    - 마우스 클릭: 바로 팝오버 표시 및 편집 모드 진입

- **노션 스타일 스크롤 애니메이션 구현 (추후 처리로 이관)**
  - 행 간 이동 시 부드러운 스크롤 애니메이션 구현 시도
  - `bufferRows` 값에 따른 스크롤 민감도 조정 기능 추가
  - 현재 스크롤 조건 최적화 필요로 추후 개선 
  
## 2025-09-22 (테이블뷰 깜빡임 문제 수정)
- 테이블뷰에서 새 문서 생성 시 DocumentList 영역의 깜빡임 문제 해결
  - DocumentContext의 createDocument 함수에 silent 옵션 추가하여 로딩 상태 변경 제어
  - useTableData의 handleAddRow에서 silent 옵션 사용하여 DocumentList 깜빡임 방지
  - 임시 ID를 사용한 낙관적 업데이트로 즉시 UI 반영 후 실제 문서로 교체하는 방식으로 사용자 경험 개선
- 사이드바 부모 문서 꺾쇠 버튼 클릭 시 DocumentList 영역의 깜빡임 문제 해결
  - DocumentContext의 fetchChildDocuments 함수에 silent 옵션 추가하여 로딩 상태 변경 제어
  - DocumentList의 handleToggle에서 silent 옵션 사용하여 자식 문서 조회 시 깜빡임 방지

## 2025-09-22 (테이블뷰 스크롤 시 태그 옵션 팝오버 위치 조정)
- 테이블 뷰에서 스크롤 후 태그 팝오버 위치 문제 해결: TagPopover 컴포넌트의 position을 'absolute'에서 'fixed'로 변경하고, DocumentTableView에서 스크롤 이벤트 리스너를 추가하여 팝오버 위치를 실시간으로 업데이트하도록 수정함.
## 2025-09-22 (문서 복원 시 사이드바 목록 자식 문서 포함 갱신)
- VersionHistoryPanel에서 버전 복원 시 사이드바의 문서 목록과 자식 문서들도 즉시 새로고침되도록 개선. DocumentContext에 refreshAllChildDocuments 함수를 추가하여 모든 문서 정보를 최신화.

## 2025-09-23 (신규 가입 시 기본 워크스페이스 생성 기능 구현)
- **백엔드**: AuthController의 register 메서드에 기본 워크스페이스 생성 로직 추가
  - 사용자 이름 + "의 워크스페이스" 형태로 기본 워크스페이스 자동 생성
  - 워크스페이스 생성 실패 시에도 회원가입은 성공으로 처리
  - Google 로그인 시에도 기본 워크스페이스 생성 로직 추가
  - 신규 Google 사용자 가입 시 동일하게 기본 워크스페이스 자동 생성
- **결과**: 신규 사용자가 가입하면 자동으로 개인 워크스페이스가 생성되어 바로 서비스 이용 가능

## 2025-09-23 (DocumentList 깜빡임 및 스크롤 문제 해결)
- **신규 문서 생성 시 DocumentList 깜빡임 현상 해결**
  - DocumentList.jsx의 handleCreateDocument에서 createDocument 호출 시 silent 옵션 사용
  - DocumentContext의 createDocument 함수가 이미 silent 옵션을 지원하므로 깜빡임 방지
- **신규 문서 생성 후 스크롤을 맨 아래로 이동하는 기능 구현**
  - scrollContainerRef를 사용하여 스크롤 컨테이너 참조
  - scrollToBottom 함수로 DOM 업데이트 후 100ms 지연하여 스크롤을 맨 아래로 이동
  - 새 문서 생성 후 자동으로 스크롤이 맨 아래로 이동하여 새로 생성된 문서를 확인 가능
- **결과**: 신규 문서 생성 시 깜빡임 없이 부드러운 사용자 경험 제공 및 새 문서 위치 자동 확인 가능

## 2025-09-24 (DocumentHeader 모달 배경색 문제 해결)
- **문제**: VersionHistoryPanel, SettingsPanel, NotificationModal 띄울 때 DocumentHeader에 배경색이 하얗게 표시되는 현상
- **원인**: DocumentHeader의 고정 헤더가 `bg-white` 클래스로 하드코딩되어 있고, z-index가 모달들과 겹치는 문제
- **해결방법**:
  - 모달이 열려있을 때(`showVersions || showShareModal`) 배경색을 미적용하도록 변경
- **수정된 파일**:
  - `DocumentHeader.jsx`: 조건부 배경색 및 z-index 조정
- **결과**: 모달이 열려있을 때 DocumentHeader의 배경색이 미적용되어 시각적 간섭 없이 모달이 정상 표시됨

## 2025-09-24 (z-index 관리 시스템 구현)
- **목표**: 애플리케이션 전체의 z-index 값을 효율적으로 관리하고 일관성 있게 적용
- **구현 내용**:
  - **중앙화된 z-index 상수 파일 생성**: `constants/zIndex.js`
    - 레이어별 z-index 값 정의
    - 유틸리티 함수 제공 (동적 z-index 계산, 배경색 조건부 적용)
  - **모든 모달/팝오버 컴포넌트 z-index 상수 적용**:
- **z-index 레이어 시스템**:
- **유틸리티 함수**:
  - `ZIndexUtils.getTableToolbarZIndex(isModalOpen)`: 모달 상태에 따른 동적 z-index
  - `ZIndexUtils.getDocumentHeaderBackground(isModalOpen)`: 모달 상태에 따른 배경색
- **결과**: 
  - z-index 값의 중앙화된 관리로 일관성 확보
  - 모달 간 겹침 문제 해결
  - 유지보수성 향상 (z-index 변경 시 한 파일만 수정)
  - 동적 z-index 처리로 사용자 경험 개선
  - 타입 안전성 확보 (상수 사용으로 오타 방지)

## 2025-10-12
- AuthContext.jsx에서 `clearExistingTokens()` 함수 호출 오류 수정
  - `register`와 `loginWithGoogle` 함수에서 정의되지 않은 `clearExistingTokens()` 함수를 호출하던 문제를 `clearTokens()`로 수정
  - 런타임 ReferenceError 방지 및 일관된 토큰 정리 로직 적용
- JwtAuthenticationFilter에서 인증이 필요하지 않은 요청에 대한 401 응답 문제 수정
  - JWT 토큰이 없거나 유효하지 않을 때 무조건 401을 반환하던 문제를 해결
  - 토큰이 없거나 유효하지 않아도 필터 체인을 계속 진행하도록 수정하여 Spring Security가 인증 필요 여부를 판단하도록 개선
  - 공개 엔드포인트가 정상적으로 작동하도록 보장
- JwtAuthenticationFilter에서 사용자 검증 실패 및 세션 무효화 시 401 응답 문제 추가 수정
  - 사용자가 존재하지 않거나 세션이 무효화된 경우에도 401을 반환하고 요청을 조기 종료하던 문제를 해결
  - 사용자 검증 실패나 세션 무효화 시에도 필터 체인을 계속 진행하도록 수정
  - Spring Security가 인증 필요 여부를 올바르게 판단할 수 있도록 개선하여 공개 엔드포인트 접근 보장
- JwtAuthenticationFilter에서 로그 레벨 과다 사용 문제 수정
  - 모든 요청마다 log.info() 사용으로 인한 운영 환경 로그 파일 급증 문제 해결
  - JWT 검증 로그를 log.debug()로 변경하여 개발 환경에서만 상세 로그 출력
  - 운영 환경에서 불필요한 로그 출력 최소화로 성능 및 저장 공간 개선
- AuthController에서 동시 로그인 시 race condition 문제 해결
  - createTokenWithSession 메서드에 @Transactional 어노테이션 추가하여 동시성 제어
  - userRepository.save()를 saveAndFlush()로 변경하여 즉시 DB 반영으로 race condition 방지
  - 여러 브라우저에서 동시 로그인 시 세션 ID 충돌 및 데이터 일관성 문제 해결
- AuthController 비즈니스 로직 분리 및 아키텍처 개선
  - AuthService 클래스 생성하여 토큰 생성 및 DB 저장 로직을 컨트롤러에서 서비스 레이어로 이동
  - @Transactional을 서비스 레이어로 이동하여 트랜잭션 관리 일관성 확보
  - 단일 책임 원칙(SRP) 준수 및 관심사 분리로 코드 품질 향상
  - YAGNI 원칙 적용으로 불필요한 인터페이스 제거하여 코드 단순화
- AuthController와 UserController 구조 개선 및 중복 엔드포인트 제거
  - /api/auth/me 엔드포인트 제거하여 /api/users/me로 통합
  - AuthController는 순수 인증 기능만 담당 (login, register, google)
  - UserController는 사용자 관리 기능 담당 (profile 조회/수정, 비밀번호 변경)
  - RESTful API 설계 원칙 준수 및 책임 분리 명확화
- 프론트엔드 API 경로 변경 반영
  - frontend/src/services/auth.js에서 getCurrentUser 함수의 API 경로를 /api/auth/me에서 /api/users/me로 변경
  - 백엔드 API 구조 변경에 따른 프론트엔드 호출 경로 일관성 확보
  - 사용자 정보 조회 API 통합으로 클라이언트 코드 단순화
- JWT 토큰 보안 강화 및 민감한 정보 제거
  - JwtTokenProvider에서 userId를 JWT 토큰에서 제거하여 보안 강화
  - JWT는 base64 인코딩으로 누구나 디코딩 가능하므로 민감한 정보 포함 방지
  - createToken 메서드에서 userId 매개변수 제거 및 getUserIdFromToken 메서드 삭제
  - AuthService에서 JWT 생성 시 userId 전달 제거로 최소 권한 원칙 적용
- AuthContext에서 타입 불일치 문제 해결
  - userId(number)와 currentUserId(string) 타입 불일치로 인한 비교 오류 수정
  - String(userId) !== currentUserId로 타입 일치하여 정확한 사용자 ID 비교 보장
  - 세션 무효화 로직의 안정성 향상 및 예상치 못한 동작 방지
- JwtAuthenticationFilter에서 하위 호환성 문제 해결
  - 기존 사용자의 currentSessionId가 NULL인 경우 서비스 중단 위험 해결
  - user.getCurrentSessionId() == null 체크 추가로 NullPointerException 방지
  - 마이그레이션 전까지 기존 사용자들의 정상적인 서비스 이용 보장
  - 세션 기반 인증 시스템 도입 시 하위 호환성 확보
- API 에러 처리 로직 리팩토링 및 중복 제거
  - 401과 403 에러 처리 로직의 중복 코드를 handleAuthFailure 공통 함수로 통합
  - authSync.notifyLogout() 호출 의도를 명확히 주석으로 표시 (현재 비활성화)
  - 에러 처리 로직의 일관성 향상 및 유지보수성 개선
  - TOKEN_EXPIRED와 SESSION_INVALID 구분으로 에러 원인 명확화
- JwtAuthenticationFilter에서 filterChain.doFilter() 이중 실행 버그 수정
  - JWT 토큰이 null이거나 유효하지 않을 때 try 블록 내에서 filterChain.doFilter() 호출 후 return을 시도하던 문제 해결
  - 예외 발생 시 메서드 끝의 filterChain.doFilter()가 다시 실행되어 이중 실행되는 문제 방지
  - 모든 경우에 대해 메서드 끝에서 한 번만 filterChain.doFilter() 호출하도록 구조 개선
  - 예외 처리 안정성 향상 및 예상치 못한 동작 방지
- 프로덕션 환경 과도한 로깅 문제 해결
  - AuthService에서 log.info()를 log.debug()로 변경하여 로그인/로그아웃 시에만 상세 로그 출력
  - AuthController에서 회원가입 관련 log.info()를 log.debug()로 변경하여 중요한 이벤트만 로그
  - DocumentService에서 문서 조회 관련 log.info()를 log.debug()로 변경하여 성능 최적화
  - 프론트엔드 api.js에서 request interceptor의 log.info()를 log.debug()로 변경하여 API 호출 로그 최적화
  - application-prod.yml 생성으로 프로덕션 환경에서 WARN 레벨 이상만 로그 출력하도록 설정
  - 환경변수를 통한 로그 레벨 동적 설정으로 개발/운영 환경별 로깅 전략 분리
  - 프로덕션 환경에서 I/O 부하 감소 및 로그 파일 크기 최적화로 성능 향상

## 2025-10-12 (보안 취약점 수정)
- **심각한 보안 취약점 수정**: SecurityConfig.java에서 평문 패스워드 인코더를 BCryptPasswordEncoder로 즉시 복원
  - 문제: 89-100번 라인에서 평문으로 패스워드를 저장하고 비교하는 PasswordEncoder 사용
  - 위험성: 모든 사용자 패스워드가 암호화 없이 저장되어 데이터베이스 유출 시 심각한 보안 위험
  - 수정: BCryptPasswordEncoder로 복원하여 안전한 패스워드 해싱 적용
  - 영향: 기존 평문 패스워드는 재설정 필요, 향후 모든 패스워드는 안전하게 해싱되어 저장
- **인증 없는 관리자/더미 데이터 엔드포인트 제거**: SecurityConfig.java에서 보안 위험 엔드포인트 제거
  - 문제: `/api/admin/permission-migration/**`, `/api/dummy/**` 엔드포인트가 인증 없이 접근 가능
  - 위험성: 누구나 데이터베이스 마이그레이션 실행 및 더미 데이터 생성 가능, 프로덕션 데이터 조작 위험
  - 수정: 해당 엔드포인트를 permitAll 목록에서 제거하여 인증 필요하도록 변경
  - 영향: 관리자 기능은 적절한 인증 후에만 접근 가능, 보안 강화
- **Spring Profile 기반 환경별 보안 설정 구현**: 개발/프로덕션 환경에 따른 차별화된 보안 정책 적용
  - 개발 환경(`@Profile("dev")`): 관리자/더미 데이터 엔드포인트 허용으로 개발 편의성 확보
  - 프로덕션 환경(`@Profile("!dev")`): 보안 강화된 설정으로 관리자 엔드포인트 완전 차단
  - 환경별 SecurityFilterChain 분리로 명확한 보안 정책 구분
  - 영향: 개발 환경에서는 편리한 테스트 가능, 프로덕션에서는 보안 강화

## 2025-10-12 (JPA 모범 사례 및 코드 품질 개선)
- **JPA 모범 사례 위반 수정**: WorkspaceRoleService에서 ID만으로 User 엔티티 생성하는 문제 해결
  - 문제: `new User() {{ setId(userId); }}`로 불완전한 엔티티 생성
  - 수정: Repository에 `findByUserIdAndWorkspaceId(Long userId, Long workspaceId)` 메서드 추가
  - 영향: Lazy loading 이슈 및 예상치 못한 동작 방지, 안전한 JPA 사용
- **Spring Data JPA 자동 쿼리 생성 최적화**: 불필요한 @Query 어노테이션 제거
  - `findByWorkspaceIdAndIsActiveTrue`, `findByWorkspaceIdAndRoleAndIsActiveTrue`, `existsByUserAndWorkspaceIdAndIsActiveTrue` 메서드를 자동 쿼리 생성으로 변경
  - JOIN FETCH가 필요한 경우에만 @Query 유지
  - 영향: 코드 간소화, Spring Data JPA 표준 방식 적용
- **역할 할당 로직 일관성 개선**: 중복된 setRole 호출 제거 및 전략 문서화
  - 문제: 회원가입/Google 로그인에서 중복으로 `user.setRole(UserRole.USER)` 호출
  - 수정: User 엔티티의 기본값(`role = UserRole.USER`) 활용, 중복 호출 제거
  - User 엔티티에 역할 할당 전략 문서화 추가
  - 영향: 일관성 확보, 중복 코드 제거, 유지보수성 향상

## 2025-10-12 (DummyDataTestPanel z-index 정리)
- **DummyDataTestPanel.jsx의 Select 박스 z-index 정리 완료**
  - zIndex.js 상수 파일 import 추가
  - 모든 SelectContent에 Z_INDEX.POPOVER(1060) 적용
  - 하드코딩된 z-[2000] 값 제거하고 중앙화된 상수 사용
  - 팝오버 레이어에 맞는 적절한 z-index 값 적용으로 일관성 확보

## 2025-10-18 (더미 데이터 생성 시 부모 문서 속성 상속 기능 구현)
- **백엔드 DummyDataService 개선**
  - 부모 문서의 속성을 자식 문서들이 상속받도록 로직 구현
  - `getParentDocumentProperties()` 메서드 추가로 부모 문서 속성 조회
  - `createPropertiesForDocument()` 메서드 수정으로 부모 속성 상속 + 추가 속성 생성
  - DocumentPropertyRepository에 `findByDocumentOrderBySortOrder()` 메서드 추가
  - 상속된 속성 개수를 응답에 포함하여 프론트엔드에서 확인 가능
- **프론트엔드 DummyDataTestPanel 개선**
  - 선택된 경로 정보를 실시간으로 표시하는 UI 추가
  - 루트 경로와 특정 폴더 선택 시 다른 설명 메시지 제공
  - 부모 폴더 선택 시 "자식 문서들이 부모 폴더의 속성을 자동으로 상속받습니다" 안내
  - 테스트 결과에 상속된 속성 개수 표시

## 2025-11-06 (WorkspacePermission 엔티티 캡슐화 강화)
- **WorkspacePermission 엔티티 Builder 패턴 적용 및 명시적 상태 변경 메서드 추가**
  - 목적: 다른 엔티티들과 일관된 Builder 패턴 사용, 무분별한 setter 사용 방지
  - 적용 사항:
    - 롬복 `@Builder` 추가 (커스텀 생성자에 적용)
    - `@NoArgsConstructor(access = AccessLevel.PROTECTED)`로 기본 생성자 보호
    - 생성자에서 `isActive`와 `joinedAt` 기본값 처리
  - 추가된 상태 변경 메서드:
    - `activate()`: 권한 활성화
    - `deactivate()`: 권한 비활성화
    - `changeRole(WorkspaceRole)`: 역할 변경 (null 검증 포함)
    - `updateInvitedBy(Long)`: 초대자 업데이트
  - 영향: 엔티티 생성은 Builder 패턴으로 일관성 유지, 상태 변경은 명시적 메서드로 제어
- **WorkspaceRoleService 및 관련 서비스 리팩토링**
  - `WorkspacePermission.builder()` 사용으로 객체 생성 방식 통일
  - 모든 setter 호출을 명시적 업데이트 메서드로 교체
  - `inviteUser()`: Builder 사용 및 activate/changeRole/updateInvitedBy 적용
  - `changeUserRole()`: `changeRole()` 메서드 사용
  - `removeUser()`: `deactivate()` 메서드 사용
  - 영향: 엔티티 생성과 상태 변경의 명확한 분리, 코드 일관성 및 유지보수성 향상

## 2025-11-06 (RoleBasedAccessControlAspect ClassCastException 수정)
- **RoleBasedAccessControlAspect에서 UserPrincipal 캐스팅 오류 해결**
  - 문제: `authentication.getPrincipal()`을 `User` 엔티티로 직접 캐스팅하여 `ClassCastException` 발생
  - 원인: Spring Security의 `Authentication` 객체에는 `UserPrincipal`이 저장되어 있음
  - 해결:
    - `UserRepository` 의존성 추가하여 `User` 엔티티 조회 가능하도록 변경
    - `UserPrincipal`에서 `id`를 추출하여 `UserRepository.findById()`로 실제 엔티티 조회
    - `checkSystemRole()` 및 `checkWorkspaceRole()` 메서드 모두 수정
  - 영향: `PermissionExample.jsx` 접근 시 발생하던 `ClassCastException` 해결, 권한 체크 정상 동작

## 2025-11-06 (알림 기능 UI 개선)
- **Notifications.jsx 미확인 알림 개수 표시 기능 구현**
  - 미확인 알림 개수 계산: `notifications.filter(n => n.status === 'UNREAD').length`
  - 알림 버튼에 빨간색 배지로 미확인 알림 개수 표시 (99개 초과 시 '99+' 표시)
  - 미확인 알림이 있을 때만 배지 표시
  - NotificationContext에서 notifications 상태를 가져와 실시간으로 개수 업데이트
- **NotificationModal.jsx 확인/미확인 구분 표시 기능 구현**
  - 미확인 알림(UNREAD): 파란색 배경(`bg-blue-50`), 진한 테두리(`border-blue-200`), 굵은 폰트(`font-semibold`), "미확인" 배지 표시
  - 확인된 알림(READ 등): 회색 배경(`bg-gray-50`), 연한 테두리(`border-gray-200`), 일반 폰트(`font-normal`), 투명도 75% 적용
  - 각 알림 항목에 상태별 시각적 구분으로 사용자가 한눈에 확인/미확인 알림을 구분 가능
  - 영향: 사용자가 미확인 알림을 쉽게 식별하고 우선적으로 확인할 수 있는 UX 제공

## 2025-11-06 (문서 공유 재초대 방지 기능)
- **문서 공유 시 이미 초대된 사용자 재초대 방지 기능 구현**
  - 목적: 이미 초대된 사용자에게 다시 초대 메시지를 보내지 못하도록 막고, 사용자에게 이미 초대된 사용자임을 알려주는 기능
  - 구현 사항:
    - `isEmailAlreadyInvited` 함수 추가: `localPermissions`에서 이메일 중복 확인 (대소문자 무시)
    - `handleInvite` 함수에서 이미 초대된 이메일인지 확인 후 초대 차단
    - 이미 초대된 사용자일 때 "이미 초대된 사용자입니다." 메시지 표시 (amber 색상)
    - 초대 성공 후 문서를 다시 가져와서 권한 목록 자동 갱신
  - 깃헙 이슈: [#64 문서 공유 시 이미 초대된 사용자 재초대 방지 기능 추가](https://github.com/dschoi30/notion-clone/issues/64)
  - 영향: 중복 초대 방지 및 사용자 경험 개선

## 2025-11-09 (에디터 붙여넣기 빈 줄 문제 해결)
- **Editor.jsx 외부 복사 붙여넣기 시 빈 줄 과다 표시 문제 해결**
  - 문제: 외부에서 복사한 내용을 붙여넣을 때 개행 문자가 없는데도 각 줄 사이에 공백인 줄이 3개씩 표시되는 현상
  - 원인: HTML의 빈 `<p>` 태그나 연속된 `<br>` 태그가 과도하게 포함되어 렌더링됨
  - 해결:
    - `cleanPastedHTML` 함수 추가: 붙여넣은 HTML을 정리하는 유틸리티 함수 구현
      - 빈 `<p>` 태그 제거 (공백, `&nbsp;`, `<br>`만 있는 경우 포함)
      - 연속된 `<br>` 태그를 최대 2개로 제한
      - `<p>` 태그 내부의 연속된 `<br>` 태그 정리
      - 빈 `<div>` 태그 제거
      - 연속된 빈 줄 정리
    - `handlePaste` 함수에서 HTML 처리 후 `cleanPastedHTML` 함수 적용
  - 영향: 외부에서 복사한 내용을 붙여넣을 때 불필요한 빈 줄이 제거되어 깔끔한 문서 작성 가능

## 2025-11-09 (구글 로그인 버튼 첫 클릭 미동작 문제 해결)
- **GoogleAuth.jsx 구글 로그인 버튼 첫 번째 클릭 미동작 문제 해결**
  - 문제: 구글 로그인 버튼이 첫 번째 클릭에서는 동작하지 않고 두 번째 클릭에서만 동작하는 현상
  - 원인:
    - `handleGoogleLogin` 함수가 매 렌더링마다 새로 생성되어 `useEffect`의 의존성 배열에 포함되어 있음
    - `useEffect`가 매번 재실행되며 Google 스크립트가 중복 로드되고 버튼이 재렌더링됨
    - 첫 번째 클릭 시 스크립트가 아직 완전히 로드되지 않았거나 버튼이 제대로 렌더링되지 않음
  - 해결:
    - `handleGoogleLogin`을 `useCallback`으로 메모이제이션하여 불필요한 재생성 방지
    - `useRef`를 사용하여 초기화 상태(`isInitialized`)와 버튼 컨테이너(`buttonContainerRef`) 참조 관리
    - 스크립트가 이미 로드되어 있는지 확인하고, 로드되어 있으면 바로 초기화
    - 버튼이 이미 렌더링되었는지 확인하고, 중복 렌더링 방지
    - 기존 버튼이 있으면 제거 후 새로 렌더링하여 중복 방지
  - 영향: 구글 로그인 버튼이 첫 번째 클릭부터 정상적으로 동작하며, 스크립트 중복 로드 및 버튼 중복 렌더링 문제 해결

## 2025-11-09 (VersionHistoryPanel 권한 체크 기능 추가)
- **VersionHistoryPanel 읽기 권한 사용자 복원 버튼 비활성화 기능 구현**
  - 목적: 읽기 권한만 가진 사용자는 문서를 복원할 수 없도록 제한
  - 구현 사항:
    - `useAuth` 훅을 통해 현재 사용자 정보 가져오기
    - `DocumentEditor.jsx`와 동일한 권한 체크 로직 적용
      - 문서 소유자 확인: `isOwner = String(currentDocument?.userId) === String(user?.id)`
      - 사용자별 권한 확인: `myPermission = currentDocument?.permissions?.find(...)`
      - 쓰기 권한 확인: `hasWritePermission = isOwner || myPermission?.permissionType === 'WRITE' || myPermission?.permissionType === 'OWNER'`
    - 복원 버튼에 `disabled={restoring || !canRestore}` 적용
    - 기존 Tooltip 컴포넌트를 활용하여 읽기 권한만 있는 경우 툴팁으로 안내 메시지 표시: "문서의 쓰기 권한을 가진 사용자만 복원이 가능합니다"
    - 툴팁 지연 시간 300ms로 설정하여 빠른 피드백 제공
  - 영향: 읽기 권한만 가진 사용자는 버전 기록을 조회할 수 있지만 복원은 불가능하며, 명확한 안내 메시지 제공

## 2025-11-09 (휴지통 권한 관리 기능 추가)
- **휴지통 목록 조회 및 삭제 권한 체크 기능 구현**
  - 목적: 읽기 권한 사용자는 휴지통 목록을 조회할 수 있지만, 복원/삭제는 쓰기 권한이 필요하도록 제한
  - 백엔드 구현:
    - 기존 권한 체크 로직 재사용 (신규 메서드 추가 없이)
      - `getTrashedDocuments`: `getDocument`와 동일한 읽기 권한 체크 로직 재사용
      - `restoreDocument`: `deleteDocument`와 동일한 쓰기 권한 체크 로직 재사용
      - `deleteDocumentPermanently`: `deleteDocument`와 동일한 쓰기 권한 체크 로직 재사용
      - `emptyTrash`: `deleteDocument`와 동일한 쓰기 권한 체크 로직 재사용하여 필터링
    - `DocumentController`의 모든 휴지통 API에 `@CurrentUser` 추가
  - 프론트엔드 구현:
    - `TrashModal`에 권한 체크 로직 추가
    - 각 문서별로 쓰기 권한 확인하여 복원/삭제 버튼 표시/비활성화
    - 읽기 권한만 있는 경우 버튼 비활성화 및 툴팁 표시 (VersionHistoryPanel과 동일한 스타일)
    - "모두 비우기" 버튼: 쓰기 권한이 있는 문서가 하나라도 있을 때만 활성화
  - 영향: 읽기 권한 사용자는 휴지통 목록을 조회할 수 있지만 복원/삭제는 불가능하며, 쓰기 권한 사용자만 복원/삭제 가능

## 2025-11-09 (권한 체크 로직 공통 유틸 분리)
- **문서 권한 체크 로직 공통 유틸리티 함수로 분리**
  - 목적: 여러 컴포넌트에서 중복 사용되는 권한 체크 로직을 공통 유틸로 분리하여 코드 중복 제거 및 유지보수성 향상
  - 구현 사항:
    - `frontend/src/utils/permissionUtils.js` 생성
      - `isDocumentOwner(document, user)`: 문서 소유자인지 확인
      - `getUserPermission(document, user)`: 사용자의 문서 권한 가져오기
      - `hasWritePermission(document, user)`: 쓰기 권한 확인 (소유자 또는 WRITE/OWNER 권한)
      - `hasReadPermission(document, user)`: 읽기 권한 확인 (소유자 또는 READ/WRITE/OWNER 권한)
    - 다음 컴포넌트에서 유틸 함수 사용으로 변경:
      - `DocumentEditor.jsx`: `hasWritePermission` 유틸 사용
      - `VersionHistoryPanel.jsx`: `hasWritePermission` 유틸 사용
      - `TrashModal.jsx`: `hasWritePermission` 유틸 사용
      - `DocumentSharePopover.jsx`: `isDocumentOwner` 유틸 사용
      - `DocumentTableView.jsx`: `isDocumentOwner` 유틸 사용
  - 영향: 권한 체크 로직의 일관성 확보, 코드 중복 제거, 향후 권한 체크 로직 변경 시 한 곳만 수정하면 됨
- 문서 잠금 기능 구현
  - 백엔드:
    - `Document` 엔티티에 `isLocked` 필드 추가 (기본값: false)
    - `UpdateDocumentRequest`에 `isLocked` 필드 추가
    - `DocumentResponse`에 `isLocked` 필드 추가 및 매핑
    - `DocumentService.updateDocument`에서 `isLocked` 상태 업데이트 처리
    - DB 스키마 자동 업데이트 (JPA ddl-auto: update 사용)
  - 프론트엔드:
    - `DocumentHeader.jsx`에 잠금/잠금 해제 버튼 추가 (문서 경로 우측)
    - `DocumentEditor.jsx`에서 잠금 상태에 따라 `isReadOnly` 적용
    - 잠금 토글 핸들러 구현 (`handleLockToggle`)
    - 잠금 상태는 DB에 저장되어 재방문 시에도 유지됨
  - 동작:
    - 기본 상태: 잠금 해제
    - 잠금 버튼 클릭 시: 모든 내용이 readOnly로 변경, 버튼 텍스트는 "잠금 해제"로 변경
    - 잠금 해제 버튼 클릭 시: 원상 복구

## 2025-11-09 (사용자 관리 기능 추가)
- **사용자 관리 패널 구현**
  - 목적: SUPER_ADMIN 권한 사용자가 시스템의 모든 사용자를 조회하고 관리할 수 있는 기능 제공
  - 백엔드 구현:
    - `UserController`에 사용자 목록 조회 API 추가 (`GET /api/users`)
      - 페이지네이션 지원 (page, size, sort 파라미터)
      - 정렬 기능 지원 (기본값: id 오름차순)
    - `UserService`에 `getAllUsers` 메서드 추가
    - `UserResponse` DTO에 `lastLoginAt` 필드 추가
  - 프론트엔드 구현:
    - `UserManagementPanel.jsx` 컴포넌트 생성
      - 사용자 목록 테이블 뷰 (ID, 이메일, 이름, 역할, 생성일시, 마지막 로그인)
      - 검색 기능 (이메일, 이름 검색)
      - 정렬 기능 (드롭다운 및 SortManager 지원)
      - 무한 스크롤 지원
    - `SettingsPanel.jsx`에 사용자 관리 메뉴 추가 (SUPER_ADMIN만 표시)
    - `useUserTableData.js`, `useUserTableSearch.js`, `useUserTableFilters.js`, `useUserTableSort.js` 훅 생성
    - `userApi.js`에 사용자 목록 조회 API 함수 추가
  - UI 개선:
    - `AccountBasicForm.jsx`에서 중복 id 경고 해결 (SettingsPanel 중복 렌더링 제거)
    - `SortManager.jsx`, `SortDropdown.jsx`에 `autoAddNameProperty` prop 추가
      - 문서 테이블용 "이름" 속성 자동 추가 기능을 사용자 관리 화면에서는 비활성화
    - `utils.jsx`에 SELECT 타입 아이콘 추가 (Shield 아이콘)
    - 정렬 드롭다운 메뉴를 좌측에 표시하도록 개선
  - 알려진 이슈:
    - [ ] `SortManager` 위치 계산 문제: 초기에는 올바른 위치에 표시되다가 브라우저 좌상단으로 이동하는 현상
      - 원인: `useLayoutEffect`에서 위치 계산이 여러 번 실행되면서 잘못된 값으로 덮어씌워지는 것으로 추정
      - 추후 처리 과제로 기록
## 2025-11-11 (환경 변수 전달 개선)
- Docker 프로덕션 프론트엔드 이미지 빌드시 Vite 환경 변수를 build args로 전달하도록 개선
  - `frontend/Dockerfile.prod`에 `ARG/ENV` 추가 (`VITE_API_BASE_URL`, `VITE_BACKEND_ORIGIN`, `VITE_SENTRY_DSN`)
  - `docker-compose.yml` 프론트 서비스에 build args 설정 및 기본 `VITE_API_BASE_URL=/api`
  - 개발용 compose에서도 기본 API base를 `/api`로 지정하여 dev/prod 요청 경로 일관성 확보
- 프론트 nginx에 `/sentry-api/` 프록시를 추가하여 Sentry self-hosted로 터널링 요청을 전달 (`proxy_pass http://sentry-web:9000/api/`)

## 2025-11-13 (오픈소스 로깅 시스템 도입 완료)
  - 백엔드: logstash-logback-encoder를 사용한 JSON 구조화 로깅, LoggingFilter를 통한 MDC 기반 요청 추적 ID 생성
  - 프론트엔드: loglevel 기반 브라우저 호환 로깅, Sentry 통합을 통한 에러 추적 및 모니터링
  - 환경별 로깅 설정 개선 (dev/prod), logback-spring.xml을 통한 JSON 포맷 및 파일 로깅 관리
  - Winston을 loglevel로 교체하여 브라우저 호환성 문제 해결

## 2025-11-15 (Loki + Promtail 로그 수집 시스템 연동 완료)
  - **목적**: 백엔드 로그를 중앙화하여 수집하고 시각화하기 위한 로그 수집 시스템 구축
  - **구현 사항**:
    - `docker-compose.yml`에 Loki, Promtail, Grafana 서비스 추가
      - Loki: 로그 저장소 (포트 3100)
      - Promtail: 로그 수집 에이전트 (백엔드 로그 파일 모니터링)
      - Grafana: 로그 시각화 대시보드 (포트 3000, 기본 비밀번호: admin)
    - `promtail-config.yml` 생성: 백엔드 로그 파일 수집 설정
      - `/var/log/backend/*.log` 경로의 로그 파일 모니터링
      - JSON 형식 로그 파싱 (timestamp, level, logger, message, traceId, requestMethod, requestUri, userId)
      - 파싱된 필드를 라벨로 추가하여 Loki에서 필터링 및 검색 가능
    - 백엔드 로그 디렉토리 마운트: `./backend/logs` → `/var/log/backend` (읽기 전용)
  - **사용 방법**:
    1. `docker-compose up -d`로 서비스 시작
    2. Grafana 접속: `http://localhost:3000` (admin/admin)
    3. Configuration → Data Sources → Add data source → Loki 선택
    4. URL: `http://loki:3100` 입력 후 Save & Test
    5. Explore 메뉴에서 LogQL 쿼리로 로그 조회 가능
  - **LogQL 쿼리 예시**:
    - 에러 로그만 조회: `{job="notion-clone-backend"} |= "ERROR"`
    - 특정 traceId로 요청 추적: `{job="notion-clone-backend"} | json | traceId="abc123def456"`
    - 특정 사용자의 로그: `{job="notion-clone-backend"} | json | userId="123"`
    - 특정 엔드포인트의 로그: `{job="notion-clone-backend"} | json | requestUri=~"/api/documents.*"`
  - **영향**: 백엔드 로그를 중앙화하여 수집하고 시각화할 수 있어 디버깅 및 모니터링 효율성 향상

## 2025-11-15 (Prometheus 모니터링 및 알림 시스템 구축 완료)
  - **목적**: CPU/메모리 등 시스템 리소스 모니터링 및 임계치 초과 시 알림 기능 제공
  - **구현 사항**:
    - `docker-compose.yml`에 모니터링 서비스 추가
      - **Prometheus**: 메트릭 수집 및 저장 (포트 9090)
      - **Node Exporter**: 호스트 시스템 메트릭 수집 (포트 9100)
      - **cAdvisor**: Docker 컨테이너 메트릭 수집 (포트 8081)
    - `prometheus.yml` 생성: Prometheus 설정 파일
      - Node Exporter, cAdvisor, Prometheus 자체 메트릭 수집 설정
      - 15초 간격으로 메트릭 수집
    - `docs/monitoring_alerting_guide.md` 생성: 모니터링 및 알림 설정 가이드
      - Grafana에 Prometheus 데이터 소스 추가 방법
      - CPU/메모리 대시보드 생성 방법
      - 알림 규칙 설정 방법 (CPU 80%, 메모리 85% 임계치)
      - 이메일/Slack 알림 채널 설정 방법
      - 유용한 PromQL 쿼리 예제
  - **사용 방법**:
    1. `docker-compose up -d prometheus node-exporter cadvisor`로 서비스 시작
    2. Grafana 접속: `http://localhost:3000`
    3. Configuration → Data Sources → Prometheus 추가 (URL: `http://prometheus:9090`)
    4. Alerting → Alert rules에서 CPU/메모리 알림 규칙 생성
    5. Notification channels에서 이메일/Slack 알림 채널 설정
  - **기능**:
    - 호스트 CPU/메모리/디스크 사용률 모니터링
    - 컨테이너별 리소스 사용률 모니터링
    - 임계치 초과 시 자동 알림 (이메일/Slack)
    - Grafana 대시보드를 통한 시각화
  - **영향**: 시스템 리소스 사용률을 실시간으로 모니터링하고 문제 발생 시 즉시 알림을 받을 수 있어 운영 안정성 향상

## 2025-11-15 (PR #72 리뷰 대응)
- **GitHub PR #72 리뷰 이슈 해결 완료**
  - **Critical: CONSOLE_TEXT Appender 참조 추가**
    - `logback-spring.xml`에서 정의되었지만 사용되지 않던 `CONSOLE_TEXT` appender를 dev 프로파일의 root logger에 참조 추가
    - 개발 환경에서 읽기 쉬운 텍스트 형식 로그 출력 활성화
  - **Security: Sentry DSN 보안 강화**
    - DSN 마스킹 기능 추가 (로그에 전체 DSN 노출 방지)
    - 개발 환경에서만 마스킹된 DSN 로그 출력
    - 프로덕션 환경에서는 DSN 관련 로그 출력 제거
  - **Performance: Logger Namespace 필터링 최적화**
    - `logger.js`의 `getNamespaceFilter()` 함수를 모듈 로드 시 한 번만 계산하도록 메모이제이션
    - 런타임 필터 갱신 함수(`updateRuntimeNamespaceFilter`) 추가로 URL/localStorage 변경 시에만 갱신
    - 불필요한 URLSearchParams 파싱 및 localStorage 접근 최소화
  - **Code Quality: Logger 에러 핸들링 개선**
    - 에러 발생 시 개발 환경에서만 경고 로그 출력
    - 명시적인 기본값 반환 (`runtimeNs = []`)
    - 에러 메시지 포함하여 디버깅 용이성 향상
  - **Configuration: 환경 변수 기본값 문서화**
    - `README.md`에 환경 변수 기본값 명확히 문서화
    - 필수/선택 환경 변수 구분
    - 각 환경 변수의 기본값 및 가능한 값 명시
  - **Sentry 환경 변수 값 수정**
    - `sentry.js`에서 환경 변수 비교 로직을 Vite의 MODE 값과 일치하도록 수정
    - `development` → `dev`, `production` → `prod`로 변경하여 Vite 환경 변수와 일관성 확보
  - **영향**: 코드 품질 향상, 성능 최적화, 보안 강화, 문서화 개선, 환경 변수 일관성 확보

## 2025-11-16: PR #74 리뷰 이슈 조치

### 변경 사항
- **Critical: Promtail 타임스탬프 필드 및 포맷 불일치 수정**
  - `promtail-config.yml`에서 `"@timestamp"` 필드를 찾던 문제 수정
  - 실제 로그는 `timestamp` 필드로 출력되므로 JSON 파싱 단계에서 `timestamp` 필드 추출하도록 변경
  - regex 단계 제거하고 JSON 파싱 단계에서 직접 추출하도록 수정
  - 타임스탬프 포맷 불일치 수정: `RFC3339Nano` → `2006-01-02 15:04:05.000` (logback-spring.xml의 `yyyy-MM-dd HH:mm:ss.SSS` 포맷과 일치)
  - 타임스탬프 기반 필터링 및 정렬 기능 정상화
- **Critical: Prometheus 메트릭 엔드포인트 보안 강화**
  - 프로덕션 환경에서 `/actuator/prometheus` 엔드포인트를 `permitAll()`에서 제거
  - 별도 포트(9091)로 Actuator 관리 엔드포인트 노출 (보안 강화)
  - `application.yml`에 `management.server.port` 설정 추가 (기본값: 9091)
  - 개발 환경에서는 `management.server.port` 설정 제거하여 기본 서버 포트(8080) 사용
  - 빈 포트 기본값으로 인한 런타임 오류 방지
  - `docker-compose.yml`에 관리 포트(9091) 노출 추가
  - `prometheus.yml`에서 별도 포트(9091) 사용하도록 수정
- **보안: Grafana 비밀번호 환경 변수화**
  - `docker-compose.yml`에서 하드코딩된 `admin` 비밀번호를 환경 변수로 변경
  - `GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD:-admin}` 설정
  - 환경 변수로 비밀번호 관리 가능하도록 개선
- **보안: cAdvisor 권한 최소화**
  - `privileged: true` 대신 필요한 최소 권한만 `cap_add`로 추가
  - `SYS_TIME`, `SYS_ADMIN`, `NET_ADMIN` 권한만 추가하여 보안 강화
- **영향**: 보안 취약점 해결, 로그 수집 정확성 향상, 프로덕션 배포 준비 완료

## 2025-11-17 (사용자 관리 패널 고도화)
- **백엔드 관리자 API 정비**
  - `AdminController`/`UserService`에 역할 변경, 비밀번호 초기화, 계정 잠금/잠금 해제, 삭제용 SUPER_ADMIN 전용 엔드포인트를 구현하고 권한 검사를 강화했습니다.
  - `User` 엔티티와 `UserResponse` DTO에 `isActive`, `lastLoginAt`, `updatedAt` 필드를 추가해 계정 잠금 상태와 최신 활동 정보를 제공하도록 했습니다.
- **프론트엔드 UserManagementPanel UX 개선**
  - 체크박스 다중 선택 시 노션 스타일의 선택 상태 바와 `BulkUserActionPopover`가 버튼 기준 우측에 정확히 정렬되도록 위치 계산 로직을 추가했습니다.
  - 개별 `UserActionPopover`도 버튼 우측에 고정되며 외부 클릭, 다이얼로그, 드롭다운 상태를 고려해 자연스럽게 닫히도록 개선했습니다.
  - 역할/계정 잠금 토글 후 `fetchTableData()`를 호출해 그리드를 즉시 새로고침하고, 계정 잠금 상태(예/아니오)와 `수정일시` 컬럼을 추가해 최신 정보를 보여줍니다.
  - 이메일/이름/프로필 열에 말줄임(`truncate`) 처리와 `overflow-hidden`을 적용하고, UserBadge 옆에는 텍스트만 노출해 긴 문구가 인접 열을 침범하지 않도록 했습니다.
- **Bulk 액션 UX**
  - 일괄 역할 변경/계정 잠금/비밀번호 초기화 버튼이 선택 개수와 사용자의 잠금 상태에 따라 문구와 버튼 구성이 동적으로 바뀌도록 구현했습니다.
- **토스트/모달 레이어링 정리**
  - `Z_INDEX.TOAST`를 1200으로 상향하고 ToastViewport에도 동일 값을 적용해 SettingsPanel 등 모든 패널 위에 표시되도록 했으며, Popover 내부 Dialog도 상단 레이어에서 렌더링되도록 조정했습니다.
- **정렬 드롭다운 위치 보정**
  - `SortDropdown`이 트리거와 떨어진 곳에 렌더링되던 문제를 해결하기 위해 버튼 ref 기준으로 좌표를 계산해 버튼 바로 아래에서 열리도록 직접 포지셔닝했습니다.
  - 사용자 관리 화면에서는 문서용 “이름” 속성이 자동으로 추가되지 않도록 `autoAddNameProperty` 옵션을 추가했습니다.
- **버그 픽스 및 기타**
  - `useUserTableData` 훅이 `fetchTableData`를 `refetch`라는 이름으로만 반환하던 문제를 수정해 Bulk 액션 완료 후 새로고침 오류를 제거했습니다.
  - 선택 상태 바의 절대 위치를 조정(`top: -50`)해 SortManager가 표시될 때도 UI가 겹치지 않도록 했습니다.

## 2025-11-22 (React Query 도입 필요성 분석)
- **React Query 도입 필요성 분석 문서 작성 완료**
  - `docs/react_query_adoption_analysis.md` 생성
  - 현재 상태 분석: Context API 기반 데이터 페칭, 수동 로딩/에러 상태 관리, 중복 코드 문제 확인
  - 문제점 정리: 코드 중복, 캐싱 부재, 데이터 동기화 어려움, 상태 관리 복잡도
  - React Query 도입 시 기대 효과: 코드 라인 수 60-70% 감소, 네트워크 요청 50-70% 감소, 개발 생산성 향상
  - 도입 우선순위 및 마이그레이션 전략 수립 (Phase 1-3 단계별 계획)
  - 비용 대비 효과 분석: 초기 투자 30-46시간, 중기 ROI 200-300% 예상
  - 결론: React Query 도입 강력 권장, 점진적 마이그레이션 전략 제안

## 2025-11-23 (React Query 마이그레이션 완료)
- **Phase 1: 핵심 기능 React Query 마이그레이션 완료**
  - React Query 기본 설정 및 Provider 구성
    - `@tanstack/react-query` 및 `@tanstack/react-query-devtools` 설치
    - `QueryClient` 설정 (staleTime: 5분, cacheTime: 30분, retry: 1)
    - `App.jsx`에 `QueryClientProvider` 및 `ReactQueryDevtools` 추가
  - 문서 목록 조회: `DocumentContext`에서 `useQuery` 사용
    - `fetchDocuments`를 React Query로 변환
    - `createDocument`, `updateDocument`, `deleteDocument`에서 캐시 업데이트
    - 페이지네이션 지원 유지
  - 사용자 목록 조회: `useUserTableData`를 `useInfiniteQuery`로 변환
    - 무한 스크롤 페이지네이션 지원
    - 정렬 파라미터를 쿼리 키에 포함하여 자동 리페칭
  - 워크스페이스 목록 조회: `WorkspaceContext`에서 `useQuery` 사용
    - `fetchWorkspaces`를 React Query로 변환
    - `createWorkspace`, `updateWorkspace`, `deleteWorkspace`에서 캐시 업데이트
  - 에러 처리: 모든 `console.error/warn`을 `logger.js`의 `createLogger`로 변경

- **Phase 2: 테이블 데이터 및 속성 값 조회 React Query 마이그레이션 완료**
  - 테이블 데이터 조회: `useTableData`를 React Query로 변환
    - `properties`: `useQuery`로 조회
    - `rows`: `useInfiniteQuery`로 무한 스크롤 페이지네이션 지원
    - `propertyValues`: `useQuery`로 조회 (properties와 rows가 있을 때만 enabled)
    - 정렬 파라미터를 쿼리 키에 포함하여 자동 리페칭
    - `handleAddProperty`, `handleDeleteProperty`, `handleCellValueChange`에서 캐시 업데이트
  - 속성 값 조회: `usePageData`를 React Query로 변환
    - `getPropertyValuesByDocument`를 `useQuery`로 변환
    - `handleValueChange`에서 낙관적 업데이트 지원
    - zustand store와 React Query 통합

- **Phase 3: 알림, 문서 버전, 기타 조회 API React Query 마이그레이션 완료**
  - 알림 조회: `NotificationContext`를 React Query로 변환
    - `getNotifications`를 `useQuery`로 변환
    - `acceptNotification`, `rejectNotification`, `markAsRead`를 `useMutation`으로 변환
    - 5분마다 자동 리페칭 설정
  - 문서 버전 조회: `VersionHistoryPanel`을 React Query로 변환
    - `getDocumentVersions`를 `useInfiniteQuery`로 무한 스크롤 페이지네이션 지원
    - `getDocumentVersion`을 `useQuery`로 변환 (selectedId가 있을 때만 enabled)
    - `restoreDocumentVersion`을 `useMutation`으로 변환
    - `getProperties`를 `useQuery`로 변환 (태그 옵션용)
  - 기타 단순 조회 API 마이그레이션
    - `useTrash`: `getTrashedDocuments`를 `useQuery`로 변환
    - `useTrash`: `restoreDocument`, `deleteDocumentPermanently`, `emptyTrash`를 `useMutation`으로 변환
    - `useWorkspacePermissions`: 권한 조회를 `useQuery`로 변환
    - `console.log`를 `logger.js`의 `createLogger`로 변경

- **UX 개선: alert를 toast로 변경**
  - `VersionHistoryPanel`: 문서 복구 성공/실패 메시지를 toast로 변경
  - `DocumentSharePopover`: 권한 변경/제거 실패 메시지를 toast로 변경
  - `AccountBasicForm`: 프로필 업데이트 및 비밀번호 변경 성공 메시지를 toast로 변경
  - 모든 toast는 적절한 variant(success/destructive)를 사용하여 사용자 경험 개선

- **마이그레이션 결과**
  - 모든 주요 데이터 페칭 로직이 React Query로 전환 완료
  - 코드 중복 제거 및 일관된 에러 처리 적용
  - 자동 캐싱 및 리페칭으로 네트워크 요청 최적화
  - 기존 API와 호환되도록 점진적 마이그레이션 방식 적용
  - 관련 이슈: #79, #80, #81, #82, #83, #84, #85, #86

## 2025-11-17 (워크스페이스 변경 시 문서 로드 에러 수정 및 최근 문서 자동 로드)
- **워크스페이스 변경 시 이전 워크스페이스 문서 로드 에러 수정**
  - 문제: 워크스페이스 변경 시 이전 워크스페이스의 문서를 로드하려고 시도하여 "문서가 현재 워크스페이스에 속하지 않습니다" 에러 발생
  - 해결:
    - `DocumentContext.jsx`: 워크스페이스 변경 시 이전 문서 초기화 로직 개선 (`prevWorkspaceIdRef`로 변경 감지)
    - `DocumentEditor.jsx`: 워크스페이스 불일치 문서 로드 차단 및 홈으로 리다이렉트
    - `selectDocument` 함수: 워크스페이스 검증 강화 (문서 목록 확인 추가, 에러 로그 레벨: error → warn)
    - 초기화 순서 문제 해결 (ref를 통한 selectDocument 접근)
- **워크스페이스 변경 시 최근 문서 자동 로드 기능 추가**
  - 워크스페이스 변경 시 해당 워크스페이스의 최근 문서 ID를 로컬 스토리지에서 조회
  - 최근 문서가 있으면 자동 선택, 없으면 첫 번째 문서 선택
  - `lastDocumentId:${workspaceId}` 형식으로 워크스페이스별 최근 문서 저장
  - `selectDocumentRef`를 통한 안전한 함수 접근으로 초기화 순서 문제 해결
- **수정된 파일**:
  - `frontend/src/contexts/DocumentContext.jsx`
  - `frontend/src/components/documents/DocumentEditor.jsx`
- **관련 이슈**: #92

## 2025-11-17
- **NotificationContext useEffect import 누락 수정**
  - `NotificationContext.jsx`에서 `useEffect`를 사용하지만 import하지 않아 발생한 ReferenceError 수정
  - React hooks import에 `useEffect` 추가
- **문서 수정 권한 체크 강화**
  - `DocumentEditor.jsx`: `handleSave` 및 `triggerAutoSave` 함수에 권한 체크 추가
    - 쓰기 권한이 없거나 읽기 전용 모드일 때 저장 시도 방지
    - 403 에러 발생 시 상세 로깅 추가
  - `DocumentContext.jsx`: 403 에러에 대한 구체적인 에러 메시지 제공
    - "이 문서를 수정할 권한이 없습니다." 메시지 표시
- **영향**: 
  - 권한이 없는 사용자의 불필요한 API 호출 방지

## 2025-11-18
- **로그아웃 시 워크스페이스 상태 초기화 버그 수정**
  - 문제: 기존 유저 로그아웃 후 다른 유저로 로그인 시 이전 유저의 워크스페이스가 workspacelist에 표시되는 문제
  - 해결:
    - `authStore.js`의 `logout()` 함수에 워크스페이스 관련 상태 초기화 로직 추가
      - 워크스페이스 store의 persist storage 제거 (`workspace-storage`)
      - `selectedWorkspace` localStorage 항목 제거
      - 워크스페이스별 문서 관련 localStorage 항목 제거 (`lastDocumentId:*` 패턴)
      - React Query 캐시 전체 초기화 (`queryClient.clear()`)
    - `authSync.js`의 `handleAutoLogout()` 및 `handleLoginSuccess()` 함수에도 동일한 초기화 로직 추가
      - 다른 탭에서 로그아웃/로그인 발생 시에도 워크스페이스 상태가 올바르게 초기화되도록 보장
  - **수정 파일**:
    - `frontend/src/stores/authStore.js`
    - `frontend/src/utils/authSync.js`
  - **영향**: 
    - 로그아웃 후 다른 유저로 로그인 시 이전 유저의 워크스페이스가 표시되지 않음
    - 브라우저 탭 간 인증 상태 동기화 시에도 워크스페이스 상태가 올바르게 초기화됨

## 2025-11-18 (추가)
- **사용자별 마지막 페이지 저장 및 복원 기능 구현**
  - 문제: 로그아웃 후 재로그인 시 마지막에 봤던 페이지를 보게 하고 싶음
  - 해결:
    - `DocumentContext.jsx`의 `selectDocument` 함수에서 사용자별 마지막 문서 ID 저장
      - 저장 형식: `lastDocumentId:${userId}:${workspaceId}`
      - 문서 선택 시 자동으로 저장됨
    - `AppRouter.jsx`에서 사용자별 마지막 문서 ID 조회 및 리다이렉트
      - 로그인 후 `/` 경로 접근 시 저장된 마지막 문서로 자동 이동
      - URL 검증 실패 시에도 마지막 문서로 리다이렉트
    - 로그아웃 시 현재 사용자의 `lastDocumentId`만 삭제하도록 수정
      - `authStore.js`와 `authSync.js`의 `clearWorkspaceData` 함수에 `userId` 파라미터 추가
      - 로그아웃 시 `lastDocumentId:${userId}:*` 패턴만 삭제하여 다른 사용자의 데이터 보존
  - **수정 파일**:
    - `frontend/src/contexts/DocumentContext.jsx`
    - `frontend/src/components/layout/AppRouter.jsx`
    - `frontend/src/stores/authStore.js`
    - `frontend/src/utils/authSync.js`
  - **영향**: 
    - 사용자별로 마지막에 본 문서가 저장되어 재로그인 시 해당 문서로 자동 이동
    - 여러 사용자가 같은 브라우저를 사용해도 각자의 마지막 페이지가 유지됨
    - 로그아웃 시 현재 사용자의 데이터만 삭제되어 다른 사용자 데이터 보존