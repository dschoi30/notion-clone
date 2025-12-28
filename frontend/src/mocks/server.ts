import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Node.js 환경용 MSW 서버 설정
export const server = setupServer(...handlers);

