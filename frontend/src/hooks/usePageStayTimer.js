import { useEffect, useRef, useState } from 'react';

// 누적 체류 시간을 ms로 계산. 문서가 보일 때만 카운트
export default function usePageStayTimer({ enabled = true, onReachMs = () => {}, targetMs = 10 * 60 * 1000 }) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const lastTickRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const handleVisibility = () => {
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
                onReachMs(next);
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
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [enabled, targetMs, onReachMs]);

  return { elapsedMs };
}


