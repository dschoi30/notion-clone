// src/lib/logger.js

export function createLogger(namespace) {
  const isDev = Boolean(import.meta?.env?.DEV);
  const envFlag = String(import.meta?.env?.VITE_DEBUG ?? '').toLowerCase() === 'true';

  // Namespace whitelist from env
  const envNs = String(import.meta?.env?.VITE_DEBUG_NS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // Runtime toggles (no rebuild): URL ?debug=foo,* or localStorage.DEBUG="foo,bar"
  let runtimeNs = [];
  try {
    const params = new URLSearchParams(window.location.search);
    const queryNs = String(params.get('debug') ?? '');
    const storageNs = String(localStorage.getItem('DEBUG') ?? '');
    runtimeNs = (queryNs + ',' + storageNs)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  } catch (_) {
    // ignore URL/localStorage errors in non-browser contexts
  }

  const nsEnabled =
    envNs.length === 0 ||
    envNs.includes(namespace) ||
    runtimeNs.includes(namespace) ||
    runtimeNs.includes('*');

  // Enabled if: (dev AND env flag AND ns match) OR any runtime toggle exists
  const enabled = ((isDev && envFlag && nsEnabled) || runtimeNs.length > 0);
  const prefix = `[${namespace}]`;

  const wrap = (fn) => (...args) => {
    if (enabled) fn(prefix, ...args);
  };

  return {
    enabled,
    debug: wrap(console.debug.bind(console)),
    info: wrap(console.info.bind(console)),
    warn: wrap(console.warn.bind(console)),
    error: wrap(console.error.bind(console)),
  };
}


