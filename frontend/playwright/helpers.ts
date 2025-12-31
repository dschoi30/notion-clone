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
  // 두 경우 모두 허용하도록 정규식 수정
  await page.waitForURL(/localhost:5173\/$|localhost:5173\/(\d+)-/, { timeout: 10000 });
  
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
  await page.waitForURL('/login', { timeout: 10000 });
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
  await page.click('[aria-label="폴더 추가"], button:has-text("폴더")');
  
  // 폴더 이름 입력 필드 대기 및 입력
  const nameInput = page.locator('input[placeholder*="폴더"], input[placeholder*="이름"]');
  await nameInput.waitFor({ state: 'visible', timeout: 5000 });
  await nameInput.fill(name);
  
  // 생성 버튼 클릭
  await page.click('button:has-text("생성"), button[type="submit"]');
  
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
  await page.click('[aria-label="공유"], button:has-text("공유")');
  
  // 공유 다이얼로그가 나타날 때까지 대기
  await page.waitForSelector('input[placeholder*="이메일"], input[type="email"]', { timeout: 5000 });
  
  // 이메일 입력
  await page.fill('input[placeholder*="이메일"], input[type="email"]', email);
  
  // 권한 선택
  const permissionSelect = page.locator('select[name="permission"], select');
  if (await permissionSelect.count() > 0) {
    await permissionSelect.selectOption(permission);
  }
  
  // 공유 버튼 클릭
  await page.click('button:has-text("공유"), button[type="submit"]');
  
  // 공유 성공 메시지 대기
  await page.waitForSelector('text=/공유되었습니다|공유 완료/', { timeout: 5000 });
}

