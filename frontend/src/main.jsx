import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initSentry } from './lib/sentry';

// Sentry 초기화 (가장 먼저 실행)
initSentry();

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
);
