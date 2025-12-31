import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E 테스트 설정
 * 
 * 실행 방법:
 * - pnpm test:e2e - 모든 테스트 실행
 * - pnpm exec playwright test --ui - UI 모드로 실행
 * - pnpm exec playwright test auth-flow.spec.ts - 특정 파일만 실행
 */
export default defineConfig({
  testDir: './playwright',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // CI에서는 chromium만 실행 (속도 향상)
    // 로컬에서는 모든 브라우저 테스트 가능
    ...(process.env.CI ? [] : [
      {
        name: 'firefox',
        use: { ...devices['Desktop Firefox'] },
      },
      {
        name: 'webkit',
        use: { ...devices['Desktop Safari'] },
      },
    ]),
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});

