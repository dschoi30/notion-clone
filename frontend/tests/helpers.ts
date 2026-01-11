import { Page } from '@playwright/test';

/**
 * 사용자 로그인 헬퍼 함수
 * @param page Playwright Page 객체
 * @param email 로그인 이메일 (기본값: 'test@example.com')
 * @param password 로그인 비밀번호 (기본값: 'password123')
 */
export async function loginUser(
  page: Page,
  email: string = 'test@example.com',
  password: string = 'password123'
) {
  await page.goto('/login');
  await page.fill('input[placeholder="이메일"]', email);
  await page.fill('input[placeholder="비밀번호"]', password);
  await page.click('button[type="submit"]');
  
  // 로그인 성공 후 메인 페이지로 리다이렉트 대기
  // 문서가 있으면 /{id}-{slug} 형태, 없으면 루트(/)로 이동
  // 동적으로 base URL을 가져와서 포트나 프로토콜 변경에 대응
  const baseUrl = new URL(page.url()).origin;
  const urlPattern = new RegExp(`${baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(/|/(\\d+)-)`);
  await page.waitForURL(urlPattern, { timeout: 5000 });
  
  // 사이드바가 표시되는지 확인하여 로그인 성공 확인
  await page.waitForSelector('aside', { timeout: 5000 });
}

/**
 * 사용자 회원가입 헬퍼 함수
 * @param page Playwright Page 객체
 * @param email 회원가입 이메일
 * @param password 비밀번호
 * @param name 이름
 */
export async function registerUser(
  page: Page,
  email: string,
  password: string,
  name: string
) {
  await page.goto('/register');
  await page.fill('input[placeholder="이름"]', name);
  await page.fill('input[placeholder="이메일"]', email);
  await page.fill('input[placeholder="비밀번호"]', password);
  await page.click('button[type="submit"]');
  
  // 회원가입 성공 후 로그인 페이지로 리다이렉트 대기
  await page.waitForURL('/login', { timeout: 5000 });
}

/**
 * 문서 생성 헬퍼 함수
 * @param page Playwright Page 객체
 * @param title 문서 제목
 * @returns 생성된 문서의 ID와 제목
 */
export async function createDocument(page: Page, title: string) {
  // 새 문서 버튼 클릭
  await page.click('button:has-text("새 문서")');
  
  // 제목 입력 필드가 나타날 때까지 대기
  const titleInput = page.locator('input[placeholder="제목 없음"]');
  await titleInput.waitFor({ state: 'visible', timeout: 5000 });
  
  // 제목 입력
  await titleInput.fill(title);
  await titleInput.press('Enter');
  
  // 문서가 생성되고 URL이 변경될 때까지 대기
  await page.waitForURL(/\/(\d+)-/, { timeout: 5000 });
  
  // URL에서 문서 ID 추출
  const url = page.url();
  const match = url.match(/\/(\d+)-/);
  const id = match ? parseInt(match[1]) : null;
  
  return { id, title };
}

/**
 * 폴더 생성 헬퍼 함수
 * @param page Playwright Page 객체
 * @param name 폴더 이름
 * @returns 생성된 폴더 정보
 */
export async function createFolder(page: Page, name: string) {
  // 폴더 추가 버튼 클릭 (사이드바에서)
  // 우선순위: data-testid > aria-label > 텍스트 기반 셀렉터
  const addFolderButton = page.getByTestId('add-folder-button')
    .or(page.locator('[aria-label="폴더 추가"]'))
    .or(page.locator('button:has-text("폴더")'))
    .first();
  await addFolderButton.click();
  
  // 폴더 이름 입력 필드 대기 및 입력
  // 우선순위: data-testid > placeholder 기반 셀렉터
  const nameInput = page.getByTestId('folder-name-input')
    .or(page.locator('input[placeholder*="폴더"]'))
    .or(page.locator('input[placeholder*="이름"]'))
    .first();
  await nameInput.waitFor({ state: 'visible', timeout: 5000 });
  await nameInput.fill(name);
  
  // 생성 버튼 클릭
  // 우선순위: data-testid > 텍스트 기반 셀렉터
  const createButton = page.getByTestId('create-folder-button')
    .or(page.locator('button:has-text("생성")'))
    .or(page.locator('button[type="submit"]'))
    .first();
  await createButton.click();
  
  return { name };
}

/**
 * 문서 공유 헬퍼 함수
 * @param page Playwright Page 객체
 * @param documentId 문서 ID
 * @param email 공유할 사용자 이메일
 * @param permission 권한 ('READ' | 'WRITE')
 */
export async function shareDocument(
  page: Page,
  documentId: number,
  email: string,
  permission: 'READ' | 'WRITE'
) {
  // 공유 버튼 클릭
  // 우선순위: data-testid > aria-label > 텍스트 기반 셀렉터
  const shareButton = page.getByTestId('share-document-button')
    .or(page.locator('[aria-label="공유"]'))
    .or(page.locator('button:has-text("공유")'))
    .first();
  await shareButton.click();
  
  // 공유 다이얼로그가 나타날 때까지 대기
  // 우선순위: data-testid > placeholder/type 기반 셀렉터
  const emailInput = page.getByTestId('share-email-input')
    .or(page.locator('input[placeholder*="이메일"]'))
    .or(page.locator('input[type="email"]'))
    .first();
  await emailInput.waitFor({ state: 'visible', timeout: 5000 });
  
  // 이메일 입력
  await emailInput.fill(email);
  
  // 권한 선택
  // 우선순위: data-testid > name 속성 기반 셀렉터
  const permissionSelect = page.getByTestId('share-permission-select')
    .or(page.locator('select[name="permission"]'))
    .or(page.locator('select').first());
  if (await permissionSelect.count() > 0) {
    await permissionSelect.selectOption(permission);
  }
  
  // 공유 버튼 클릭
  // 우선순위: data-testid > 텍스트 기반 셀렉터
  const confirmButton = page.getByTestId('confirm-share-button')
    .or(page.locator('button:has-text("공유")'))
    .or(page.locator('button[type="submit"]'))
    .first();
  await confirmButton.click();
  
  // 공유 성공 메시지 대기
  await page.waitForSelector('text=/공유되었습니다|공유 완료/', { timeout: 5000 });
}

