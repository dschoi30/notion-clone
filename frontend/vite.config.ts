import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // frontend 디렉토리에서 .env 파일 로드
  const envDir = __dirname;
  const env = loadEnv(mode, envDir, 'VITE_');

  // 프로세스 환경 변수도 확인 (Docker에서 전달된 환경 변수)
  const backendOrigin = env.VITE_BACKEND_ORIGIN || process.env.VITE_BACKEND_ORIGIN || 'http://localhost:8080';

  return {
    envDir,
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '0.0.0.0',
      watch: {
        usePolling: true,
        interval: 100,
      },
      proxy: {
        // 백엔드 API 프록시
        '/api': {
          target: backendOrigin,
          changeOrigin: true,
        },
        // WebSocket 프록시: /ws 경로는 백엔드로 프록시됨
        '/ws': {
          target: backendOrigin,
          ws: true,
          changeOrigin: true,
        }
      }
    },
    define: {
      global: 'window',
    },
  };
});
