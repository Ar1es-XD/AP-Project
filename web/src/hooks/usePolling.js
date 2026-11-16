import { useState, useEffect, useRef, useCallback } from 'react';

//  In a hospital OPD or ICU, data changes constantly: new patients take tokens, doctors finish consultations, beds become dirty or available.

// If we don't refresh the page, doctors and patients would be looking at outdated numbers. usePolling.js is an automatic timer hook. It calls a fetch function every 5 seconds.

// Most importantly, it has an isStale safety feature: if the hospital Wi-Fi drops for 3 seconds, instead of crashing the screen or showing a blank page, it keeps the existing queue on screen and flags it as "stale" (cached) so doctors can keep working!


export function usePolling(fetchFunction, intervalMs = 5000, isEnabled = true) {
  // 1. Five state variables to track everything the screen needs to know
  const [data, setData] = useState(null);               // The latest successful data
  const [error, setError] = useState(null);             // Any error message if something broke
  const [isLoading, setIsLoading] = useState(true);     // True only on the very first load
  const [isStale, setIsStale] = useState(false);         // True if the latest background refresh failed
  const [lastUpdated, setLastUpdated] = useState(null); // Timestamp of the last successful update

  const fetchFunctionRef = useRef(fetchFunction);
  // Update ref inside an effect to support React 18 concurrent rendering cleanly
  useEffect(() => {
    fetchFunctionRef.current = fetchFunction;
  }, [fetchFunction]);
  // 3. Defines the async function that runs the network call. Wrapped in useCallback so its reference never changes unnecessarily.
  const executePoll = useCallback(async () => {
    try {
      // Call the fetch function
      const result = await fetchFunctionRef.current();

      // We got fresh data! Update state and clear errors
      setData(result);
      setError(null);
      setIsStale(false);
      setLastUpdated(new Date());
    } catch (err) {
      // A poll failed (maybe temporary hospital Wi-Fi jitter)
      setError(err);

      // CLINICAL SAFETY RULE: Do NOT wipe the screen!
      // Keep showing the old data, but mark it as stale so the UI can show a warning
      setIsStale(true);
    } finally {
      // The initial load is done
      setIsLoading(false);
    }
  }, []);

  // 4. Setup the timer when the component appears, and clean it up when it leaves
  useEffect(() => {
    // If polling is disabled, do nothing
    if (!isEnabled) return;

    // Run once immediately so the user doesn't wait 5 seconds to see data
    executePoll();

    // Set a recurring timer to run every intervalMs (5 seconds)
    const timerId = setInterval(executePoll, intervalMs);

    // CLEANUP: When the doctor leaves the page, destroy the timer to prevent memory leaks
    return () => clearInterval(timerId);
  }, [intervalMs, isEnabled, executePoll]);

  // 5. Return everything the UI needs
  return {
    data,
    error,
    isLoading,
    isStale,
    lastUpdated,
    refetch: executePoll, // We return executePoll under the name refetch. This gives the UI a simple button: <button onClick={refetch}>Refresh Now</button>.
  };
}