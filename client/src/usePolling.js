// Owner: Zi Ying – keeps a page "live" by re-fetching every few seconds.
// It pauses while the browser tab is hidden and refreshes straight away when you come back.
// (Sprint 3 idea: swap this for Supabase Realtime pushed through the server.)
import { useEffect, useRef } from 'react';

export function usePolling(load, intervalMs, enabled = true) {
  const latest = useRef(load);
  latest.current = load;

  useEffect(() => {
    if (!enabled) return undefined;
    const tick = () => {
      if (!document.hidden) latest.current();
    };
    tick();
    const id = setInterval(tick, intervalMs);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [intervalMs, enabled]);
}