/* eslint-env node */
// vite.config.js
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url'; // 추가

const __filename = fileURLToPath(import.meta.url); // 추가
const __dirname = path.dirname(__filename);       // 추가

// https://vitejs.dev/config/
export default ({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  const backendOrigin = env.VITE_BACKEND_ORIGIN || 'http://localhost:8080';

  return defineConfig({
    plugins: [react()],
    resolve: {
      alias: {
        // 이제 __dirname 사용 가능 
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
  });
};