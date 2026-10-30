import { useCallback, useEffect, useRef, useState } from 'react';
import { readSnapshot, REFRESH_MS, type SqueekSnapshot } from './squeek';

export interface SqueekFeed {
  data: SqueekSnapshot | undefined;
  /** Message from the last failed read; cleared by the next successful one. */
  error: string | undefined;
  loading: boolean;
  /** Epoch ms of the last successful read. */
  updatedAt: number | undefined;
  /** Epoch ms of the next scheduled read, or undefined while a read runs or the tab is hidden. */
  nextAt: number | undefined;
  refresh: () => void;
}

/** Polls SqueekCore every REFRESH_MS while the tab is visible. */
export function useSqueek(): SqueekFeed {
  const [data, setData] = useState<SqueekSnapshot>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<number>();
  const [nextAt, setNextAt] = useState<number>();
  const timer = useRef<number | undefined>(undefined);
  const inFlight = useRef(false);

  const read = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    window.clearTimeout(timer.current);
    setLoading(true);
    setNextAt(undefined);
    try {
      const snapshot = await readSnapshot();
      setData(snapshot);
      setError(undefined);
      setUpdatedAt(Date.now());
    } catch (err) {
      console.warn('SqueekCore read failed', err);
      setError('Unable to reach a Sepolia RPC.');
    } finally {
      inFlight.current = false;
      setLoading(false);
      if (document.visibilityState === 'visible') {
        setNextAt(Date.now() + REFRESH_MS);
        timer.current = window.setTimeout(() => void read(), REFRESH_MS);
      }
    }
  }, []);

  useEffect(() => {
    void read();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void read();
      } else {
        window.clearTimeout(timer.current);
        setNextAt(undefined);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearTimeout(timer.current);
    };
  }, [read]);

  return { data, error, loading, updatedAt, nextAt, refresh: () => void read() };
}

/** Current time, re-rendered once per second for relative labels. */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}
