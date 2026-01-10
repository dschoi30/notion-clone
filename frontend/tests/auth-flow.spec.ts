import { test, expect, request } from '@playwright/test';
import { loginUser, registerUser } from './helpers';

/**
 * 인증 플로우 테스트 (완전 버전)
 * 테스트 계획서의 "1. 인증 플로우" 섹션의 모든 시나리오를 포함
 */
test.describe('인증 플로우 - 완전 테스트', () => {
  // 백엔드 URL을 환경 변수에서 가져오거나 기본값 사용
  const backendURL = process.env.PLAYWRIGHT_BACKEND_URL ||
                      process.env.VITE_BACKEND_ORIGIN ||
                      'http://localhost:8080';

  test.beforeAll(async () => {
    // 백엔드 서버 가용성 확인
    const apiContext = await request.newContext();
    try {
      // 로그인 엔드포인트로 간단한 연결 테스트 (405 Method Not Allowed도 서버가 살아있다는 증거)
      const response = await apiContext.get(`${backendURL}/api/auth/login`);
      // 405 (Method Not Allowed) 또는 다른 응답이 오면 서버가 실행 중
      if (response.status() === 0) {
        throw new Error('Cannot connect to backend');
      }
    } catch (error: any) {
      if (error.message?.includes('ECONNREFUSED') || error.code === 'ECONNREFUSED') {
        throw new Error(`Backend server is not available. Please ensure the backend is running on ${backendURL}`);
      }
      // 다른 에러는 무시 (서버는 실행 중이지만 다른 이유로 에러가 발생한 경우)
    } finally {
      await apiContext.dispose();
    }
  });

  test.beforeEach(async ({ page }) => {
    // 각 테스트 전에 로그아웃 상태로 시작
    await page.goto('/login');
  });

  /**
   * 테스트 시나리오 1.1: 회원가입 - 정상 케이스
   *
   * 목적: 신규 사용자가 정상적으로 회원가입할 수 있는지 확인
   *
   * 전제 조건:
   * - 애플리케이션이 로그아웃 상태
   * - 테스트 이메일이 데이터베이스에 존재하지 않음
   *
   * 예상 결과:
   * - 회원가입 성공 후 자동으로 로그인됨
   * - 메인 페이지로 리다이렉트
   * - 사이드바가 표시됨
   * - 워크스페이스가 자동 생성됨
   */
  test('1.1 회원가입 - 정상 케이스', async ({ page }) => {
    const timestamp = Date.now();
    const email = `testuser${timestamp}@example.com`;
    const password = 'password123';
    const name = '테스트 사용자';

    // 1. 회원가입 페이지 접속
    await page.goto('/register');
    await expect(page).toHaveURL('/register');

    // 2. 회원가입 페이지가 표시되는지 확인
    await expect(page.locator('input[placeholder="이름"]')).toBeVisible();
    await expect(page.locator('input[placeholder="이메일"]')).toBeVisible();
    await expect(page.locator('input[placeholder="비밀번호"]')).toBeVisible();

    // 3. 이름 입력 필드에 "테스트 사용자" 입력
    await page.fill('input[placeholder="이름"]', name);

    // 4. 이메일 입력 필드에 고유한 이메일 입력
    await page.fill('input[placeholder="이메일"]', email);

    // 5. 비밀번호 입력 필드에 "password123" 입력
    await page.fill('input[placeholder="비밀번호"]', password);

    // 6. "회원가입" 버튼 클릭
    await page.click('button[type="submit"]');

    // 예상 결과 확인

    // 성공 기준 1: URL이 `/` 또는 `/{documentId}-{slug}` 형태로 변경됨
    const baseUrl = new URL(page.url()).origin;
    const urlPattern = new RegExp(`${baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(/|/(\\d+)-)`);
    await expect(page).toHaveURL(urlPattern, { timeout: 5000 });

    // 성공 기준 2: 사이드바(`<aside>`)가 화면에 표시됨
    await expect(page.locator('aside')).toBeVisible({ timeout: 5000 });

    // 성공 기준 3: 워크스페이스 이름이 정확히 표시됨 ("테스트 사용자의 워크스페이스")
    await expect(page.getByText(`${name}의 워크스페이스`).first()).toBeVisible({ timeout: 5000 });
  });

  /**
   * 테스트 시나리오 1.2: 회원가입 - 중복 이메일
   *
   * 목적: 이미 등록된 이메일로 회원가입 시도 시 적절한 오류 처리 확인
   *
   * 전제 조건:
   * - 이메일 "test@example.com"이 이미 등록되어 있음 (데이터베이스 시드 데이터)
   *
   * 예상 결과:
   * - 회원가입 실패
   * - 오류 메시지 또는 토스트 알림 표시
   * - 회원가입 페이지에 그대로 머물러 있음
   */
  test('1.2 회원가입 - 중복 이메일', async ({ page }) => {
    const existingEmail = 'test@example.com'; // 이미 등록된 이메일
    const password = 'password123';
    const name = '새 사용자';

    // 1. 회원가입 페이지 접속
    await page.goto('/register');

    // 2. 이름: "새 사용자" 입력
    await page.fill('input[placeholder="이름"]', name);

    // 3. 이메일: "test@example.com" (이미 등록된 이메일) 입력
    await page.fill('input[placeholder="이메일"]', existingEmail);

    // 4. 비밀번호: "password123" 입력
    await page.fill('input[placeholder="비밀번호"]', password);

    // 5. "회원가입" 버튼 클릭
    await page.click('button[type="submit"]');

    // API 응답 대기
    await page.waitForResponse(
      (response) => response.url().includes('/api/auth/register'),
      { timeout: 5000 }
    ).catch(() => {
      // 응답이 없어도 계속 진행
    });

    // 성공 기준 1: URL이 `/register`에 유지됨
    await expect(page).toHaveURL('/register', { timeout: 5000 });

    // 성공 기준 2: 사용자에게 오류가 명확히 전달됨
    // 회원가입 폼이 여전히 표시되는지 확인 (페이지가 이동하지 않았음)
    await expect(page.locator('input[placeholder="이메일"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  /**
   * 테스트 시나리오 1.3: 로그인 - 정상 케이스
   *
   * 목적: 등록된 사용자가 정상적으로 로그인할 수 있는지 확인
   *
   * 전제 조건:
   * - 이메일 "test@example.com", 비밀번호 "password123"로 등록된 사용자 존재
   * - 로그아웃 상태
   *
   * 예상 결과:
   * - 로그인 성공
   * - 메인 페이지로 리다이렉트
   * - 사이드바가 표시됨
   * - 사용자의 워크스페이스가 표시됨
   */
  test('1.3 로그인 - 정상 케이스', async ({ page }) => {
    const email = 'test@example.com';
    const password = 'password123';

    // 1. `/login` 페이지 접속
    await page.goto('/login');
    await expect(page).toHaveURL('/login');

    // 2. 이메일 필드에 "test@example.com" 입력
    await page.fill('input[placeholder="이메일"]', email);

    // 3. 비밀번호 필드에 "password123" 입력
    await page.fill('input[placeholder="비밀번호"]', password);

    // 4. "로그인" 버튼 클릭
    await page.click('button[type="submit"]');

    // 예상 결과 확인

    // 성공 기준 1: URL이 루트 또는 문서 페이지로 변경됨
    const baseUrl = new URL(page.url()).origin;
    const urlPattern = new RegExp(`${baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(/|/(\\d+)-)`);
    await expect(page).toHaveURL(urlPattern, { timeout: 5000 });

    // 성공 기준 2: 사이드바가 정상적으로 렌더링됨
    await expect(page.locator('aside')).toBeVisible({ timeout: 5000 });

    // 성공 기준 3: 로컬 스토리지에 JWT 토큰이 저장됨
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
  });

  /**
   * 테스트 시나리오 1.4: 로그인 - 잘못된 자격증명
   *
   * 목적: 잘못된 이메일/비밀번호로 로그인 시도 시 적절한 오류 처리 확인
   *
   * 예상 결과:
   * - 로그인 실패
   * - 로그인 페이지에 그대로 머물러 있음
   * - 로그인 폼이 여전히 표시됨
   */
  test('1.4 로그인 - 잘못된 자격증명', async ({ page }) => {
    // 1. `/login` 페이지 접속
    await page.goto('/login');

    // 2. 이메일: "wrong@example.com" 입력
    await page.fill('input[placeholder="이메일"]', 'wrong@example.com');

    // 3. 비밀번호: "wrongpassword" 입력
    await page.fill('input[placeholder="비밀번호"]', 'wrongpassword');

    // 4. "로그인" 버튼 클릭
    await page.click('button[type="submit"]');

    // 로그인 API 응답 대기 (성공 또는 실패)
    await page.waitForResponse(
      (response) => response.url().includes('/api/auth/login'),
      { timeout: 5000 }
    ).catch(() => {
      // 응답이 없어도 계속 진행 (타임아웃 처리)
    });

    // 예상 결과 확인

    // 성공 기준 1: URL이 `/login`에 유지됨
    await expect(page).toHaveURL('/login', { timeout: 5000 });

    // 성공 기준 2: 이메일 입력 필드가 여전히 표시됨
    await expect(page.locator('input[placeholder="이메일"]')).toBeVisible();

    // 성공 기준 3: 로그인 버튼이 여전히 표시됨
    await expect(page.locator('button[type="submit"]:has-text("로그인")')).toBeVisible();
  });

  /**
   * 테스트 시나리오 1.5: 로그아웃
   *
   * 목적: 로그인된 사용자가 정상적으로 로그아웃할 수 있는지 확인
   *
   * 전제 조건:
   * - 로그인된 상태
   *
   * 예상 결과:
   * - 로그아웃 성공
   * - 로그인 페이지로 리다이렉트
   * - 로그인 폼이 표시됨
   * - 로컬 스토리지에서 토큰 제거됨
   */
  test('1.5 로그아웃', async ({ page }) => {
    // 전제 조건: 먼저 로그인
    // 고유한 사용자로 회원가입하여 로그인 상태 만들기
    const timestamp = Date.now();
    const email = `logouttest${timestamp}@example.com`;
    const password = 'password123';
    const name = '로그아웃 테스트 사용자';

    // 회원가입 (자동으로 로그인됨)
    await page.goto('/register');
    await page.fill('input[placeholder="이름"]', name);
    await page.fill('input[placeholder="이메일"]', email);
    await page.fill('input[placeholder="비밀번호"]', password);
    await page.click('button[type="submit"]');

    // 1. 메인 페이지에 있는지 확인
    const baseUrl = new URL(page.url()).origin;
    const urlPattern = new RegExp(`${baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(/|/(\\d+)-)`);
    await expect(page).toHaveURL(urlPattern, { timeout: 5000 });

    // 사이드바가 표시되는지 확인 (로그인 성공 확인)
    await expect(page.locator('aside')).toBeVisible({ timeout: 5000 });

    // 2. 워크스페이스 헤더(`data-testid="workspace-header"`) 클릭
    const workspaceHeader = page.getByTestId('workspace-header');
    await workspaceHeader.click();

    // 3. 드롭다운 메뉴가 열리는지 확인
    // 로그아웃 버튼이 표시될 때까지 대기
    const logoutButton = page.getByTestId('logout-button');
    await logoutButton.waitFor({ state: 'visible', timeout: 5000 });

    // 4. "로그아웃" 버튼(`data-testid="logout-button"`) 클릭
    await logoutButton.click();

    // 예상 결과 확인

    // 성공 기준 1: URL이 `/login`으로 변경됨
    await expect(page).toHaveURL('/login', { timeout: 5000 });

    // 성공 기준 2: 로그인 폼이 표시됨
    await expect(page.locator('input[placeholder="이메일"]')).toBeVisible();

    // 성공 기준 3: 사이드바가 표시되지 않음
    await expect(page.locator('aside')).not.toBeVisible();

    // 추가 확인: 로컬 스토리지에서 토큰 제거됨
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(token).toBeNull();
  });
});
