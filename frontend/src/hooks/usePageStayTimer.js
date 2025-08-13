import { useEffect, useRef, useState } from 'react';

// 누적 체류 시간을 ms로 계산. 문서가 보일 때만 카운트
export default function usePageStayTimer({ enabled = true, onReachMs = () => {}, targetMs = 10 * 60 * 1000, debug = false, countWhenHidden = false }) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const lastTickRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const handleVisibility = () => {
      if (document.hidden && !countWhenHidden) {
        // stop
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        lastTickRef.current = null;
        if (debug) console.debug('[stayTimer] paused (hidden)');
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
              if (debug) console.debug(`[stayTimer] +${Math.round(delta)}ms -> ${Math.round(next)} / target ${targetMs}`);
              if (prev < targetMs && next >= targetMs) {
                if (debug) console.debug('[stayTimer] target reached');
                onReachMs(next);
              }
              return next;
            });
          }, 1000);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    if (debug) console.debug('[stayTimer] start, targetMs=', targetMs);
    handleVisibility();
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (debug) console.debug('[stayTimer] cleanup');
    };
  }, [enabled, targetMs, onReachMs, debug, countWhenHidden]);

  return { elapsedMs };
}


