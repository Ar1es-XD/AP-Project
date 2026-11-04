import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * usePolling Hook
 * Periodically executes an asynchronous fetcher function at a specified interval.
 * Features an `isStale` fallback flag so hospital screens never go completely blank
 * if a single network request drops.
 *
 * @param {Function} fetcherFn - Async function returning data
 * @param {number} intervalMs - Polling interval in milliseconds (default: 5000ms / 5s)
 * @param {boolean} enabled - Toggle flag to pause/resume polling
 */
export function usePolling(fetcherFn, intervalMs = 5000, enabled = true) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStale, setIsStale] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Store the latest fetcherFn in a ref to prevent interval recreation on re-renders
  const fetcherRef = useRef(fetcherFn);
  fetcherRef.current = fetcherFn;

}

const executePoll = useCallback(async () => {
    try {
      const result = await fetcherRef.current();
      setData(result);
      setError(null);
      setIsStale(false);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err);
      // Resilience rule: if previous data exists, keep it on screen but mark it stale
      setIsStale(true);
    } finally {
      setIsLoading(false);
    }
  }, []);


  useEffect(() => {
    if (!enabled) return;

    // Execute immediately on component mount
    executePoll();

    // Setup periodic polling interval
    const timerId = setInterval(executePoll, intervalMs);

    // Clean up timer on unmount or when dependencies change to avoid memory leaks
    return () => clearInterval(timerId);
  }, [intervalMs, enabled, executePoll]);

  return {
    data,
    error,
    isLoading,
    isStale,
    lastUpdated,
    refetch: executePoll,
  };
