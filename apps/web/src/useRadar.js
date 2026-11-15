import { useEffect, useState } from 'react';

export function useRadar() {
  const [radar, setRadar] = useState({ status: 'loading', signals: [], history: {} });
  useEffect(() => {
    const controller = new AbortController();
    const base = window.location.origin + window.location.pathname.replace(/\/?$/, '/');
    const refresh = async () => {
      try {
        const response = await fetch(new URL('api/radar', base), { signal: controller.signal });
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (!controller.signal.aborted) setRadar(data);
      } catch {
        if (!controller.signal.aborted) setRadar(previous => ({ ...previous, status: 'unavailable', signals: [] }));
      }
    };
    void refresh();
    const timer = setInterval(refresh, 60000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, []);
  return radar;
}
