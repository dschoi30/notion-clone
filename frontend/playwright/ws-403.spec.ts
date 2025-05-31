import { test, expect } from '@playwright/test';

test('WebSocket handshake info endpoint should not return 403', async ({ request }) => {
  const url = 'http://localhost:8080/api/ws/document/info?t=playwright-test';
  const response = await request.get(url);
  console.log(`응답 코드: ${response.status()}`);
  // 403이 오면 실패, 200 또는 404 등만 허용
  expect(response.status()).not.toBe(403);
}); 