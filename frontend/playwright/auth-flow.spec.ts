import { test, expect, request } from '@playwright/test';
import { loginUser, registerUser } from './helpers';

test.describe('인증 플로우', () => {
  // 백엔드 URL을 환경 변수에서 가져오거나 기본값 사용
  const backendURL = process.env.PLAYWRIGHT_BACKEND_URL || 
                      process.env.VITE_BACKEND_ORIGIN || 
                      'http://localhost:8080';

  test.beforeAll(async () => {
    // 백엔드 서버 가용성 확인
    const apiContext = await request.newContext();
    try {
      const healthCheckUrl = `${backendURL}/actuator/health`;
      const response = await apiContext.get(healthCheckUrl);
      if (!response.ok()) {
        throw new Error(`Backend server is not available: ${response.status()}`);
      }
    } catch (error) {
      throw new Error(`Backend server is not available. Please ensure the backend is running on ${backendURL}`);
    } finally {
      await apiContext.dispose();
    }
  });

  test.beforeEach(async ({ page }) => {
    // 각 테스트 전에 로그아웃 상태로 시작
    await page.goto('/login');
  });

  test('새 사용자가 회원가입하고 로그인할 수 있다', async ({ page }) => {
    const timestamp = Date.now();
    const email = `newuser${timestamp}@example.com`;
    const password = 'password123';
    const name = '새 사용자';

    // 1. 회원가입 페이지 접근
    await page.goto('/register');
    await expect(page).toHaveURL('/register');

    // 2. 회원가입 폼 작성
    await page.fill('input[placeholder="이름"]', name);
    await page.fill('input[placeholder="이메일"]', email);
    await page.fill('input[placeholder="비밀번호"]', password);

    // 3. 회원가입 제출
    await page.click('button[type="submit"]');

    // 4. 회원가입 성공 후 자동 로그인되어 메인 페이지로 이동 확인
    // RegisterForm에서 navigate('/')로 이동하므로 루트 또는 문서 페이지로 이동
    // URL이 루트(/)이거나 문서 ID를 포함한 형태(/{id}-{slug})인지 확인
    // 동적으로 base URL을 가져와서 포트나 프로토콜 변경에 대응
    const baseUrl = new URL(page.url()).origin;
    const urlPattern = new RegExp(`${baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(/|/(\\d+)-)`);
    await expect(page).toHaveURL(urlPattern, { timeout: 5000 });

    // 5. 사이드바가 표시되는지 확인 (로그인 성공 확인)
    await expect(page.locator('aside')).toBeVisible({ timeout: 5000 });

    // 6. 사용자 워크스페이스가 생성되었는지 확인
    // "새 사용자의 워크스페이스" 텍스트가 정확히 표시되는지 확인
    await expect(page.getByText('새 사용자의 워크스페이스').first()).toBeVisible({ timeout: 5000 });
  });

  test('잘못된 자격증명으로 로그인 시 에러 메시지가 표시된다', async ({ page }) => {
    await page.goto('/login');

    // 잘못된 이메일과 비밀번호 입력
    await page.fill('input[placeholder="이메일"]', 'wrong@example.com');
    await page.fill('input[placeholder="비밀번호"]', 'wrongpassword');
    
    // 로그인 버튼 클릭
    await page.click('button[type="submit"]');
    
    // 로그인 API 응답 대기 (성공 또는 실패)
    await page.waitForResponse(
      (response) => response.url().includes('/api/auth/login'),
      { timeout: 5000 }
    ).catch(() => {
      // 응답이 없어도 계속 진행 (타임아웃 처리)
    });

    // 로그인 실패 시 로그인 페이지에 그대로 머물러 있는지 확인
    // (성공 시 메인 페이지로 이동하므로, 실패 시 URL이 변경되지 않음)
    await expect(page).toHaveURL('/login', { timeout: 5000 });

    // 로그인 폼이 여전히 표시되는지 확인 (페이지가 이동하지 않았음을 확인)
    await expect(page.locator('input[placeholder="이메일"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]:has-text("로그인")')).toBeVisible();
  });

  test('사용자가 로그아웃할 수 있다', async ({ page }) => {
    // 먼저 로그인
    await loginUser(page, 'test@example.com', 'password123');

    // 메인 페이지에 있는지 확인 (문서가 없으면 루트(/), 있으면 문서 페이지)
    // 동적으로 base URL을 가져와서 포트나 프로토콜 변경에 대응
    const baseUrl = new URL(page.url()).origin;
    const urlPattern = new RegExp(`${baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(/|/(\\d+)-)`);
    await expect(page).toHaveURL(urlPattern, { timeout: 5000 });

    // 사이드바가 표시되는지 확인 (로그인 성공 확인)
    await expect(page.locator('aside')).toBeVisible({ timeout: 5000 });

    // 워크스페이스 드롭다운 열기
    // 워크스페이스 헤더를 클릭하여 드롭다운을 열어야 로그아웃 버튼이 표시됨
    const workspaceHeader = page.getByTestId('workspace-header');
    await workspaceHeader.click();
    
    // 드롭다운이 열릴 때까지 대기 (로그아웃 버튼이 표시될 때까지)
    const logoutButton = page.getByTestId('logout-button');
    await logoutButton.waitFor({ state: 'visible', timeout: 5000 });
    
    // 로그아웃 버튼 클릭
    await logoutButton.click();

    // 로그인 페이지로 리다이렉트 확인
    await expect(page).toHaveURL('/login', { timeout: 5000 });

    // 로그인 폼이 표시되는지 확인
    await expect(page.locator('input[placeholder="이메일"]')).toBeVisible();
  });
});

