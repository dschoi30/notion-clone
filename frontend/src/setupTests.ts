import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, beforeAll, afterAll } from 'vitest';
import { server } from './mocks/server';

// MSW 서버 시작
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// 각 테스트 후 정리
afterEach(() => {
  cleanup();
  server.resetHandlers();
});

// 모든 테스트 후 서버 종료
afterAll(() => server.close());

