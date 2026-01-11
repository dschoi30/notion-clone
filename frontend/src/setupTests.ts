import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeAll, afterAll } from 'vitest';
import { server } from './mocks/server';

// MSW 서버 시작
// onUnhandledRequest를 'warn'으로 설정하여 관련 없는 요청이 있어도 테스트가 실패하지 않도록 함
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));

// 각 테스트 후 정리
afterEach(() => {
  cleanup();
  server.resetHandlers();
});

// 모든 테스트 후 서버 종료
afterAll(() => server.close());

