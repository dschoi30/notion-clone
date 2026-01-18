import { useEffect, useRef, useState } from 'react';
import { createLogger } from '@/lib/logger';

interface UsePageStayTimerOptions {
  enabled?: boolean;
  onReachMs?: (elapsedMs: number) => void;
  targetMs?: number;
}

// 누적 체류 시간을 ms로 계산. 문서가 보일 때만 카운트
export default function usePageStayTimer({
  enabled = true,
  onReachMs = () => { },
  targetMs = 10 * 60 * 1000
}: UsePageStayTimerOptions = {}) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const lastTickRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const log = createLogger('stayTimer');
  const callbackRef = useRef(onReachMs);

  useEffect(() => {
    callbackRef.current = onReachMs;
  }, [onReachMs]);

  useEffect(() => {
    if (!enabled) {
      log.debug('[stayTimer] disabled');
      return;
    }

    const handleVisibility = (): void => {
      if (document.hidden) {
        // stop
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        lastTickRef.current = null;
      } else {
        // start
        lastTickRef.current = performance.now();
        if (!timerRef.current) {
          timerRef.current = window.setInterval(() => {
            if (lastTickRef.current == null) return;
            const now = performance.now();
            const delta = now - lastTickRef.current;
            lastTickRef.current = now;
            setElapsedMs((prev) => {
              const next = prev + delta;
              if (prev < targetMs && next >= targetMs) {
                log.debug('target reached');
                try { callbackRef.current(next); } catch (err) { log.error('[stayTimer] onReachMs error', err); }
              }
              return next;
            });
          }, 1000);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    handleVisibility();
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, targetMs]);

  return { elapsedMs };
}

