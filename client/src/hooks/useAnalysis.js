import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "../services/api";

// In-memory session cache so navigating between pages does not lose completed analysis
const analysisSessionCache = new Map();

export default function useAnalysis(fetchFn, options = {}) {
  const { cacheKey, onSuccess, onError } = options;
  const cached = cacheKey ? analysisSessionCache.get(cacheKey) : null;

  const [state, setState] = useState(cached ? "done" : "idle"); // "idle" | "running" | "done" | "error"
  const [data, setData] = useState(cached?.data || null);
  const [error, setError] = useState("");
  const [analyzedAt, setAnalyzedAt] = useState(cached?.analyzedAt || null);

  const reqIdRef = useRef(0);
  const fetchFnRef = useRef(fetchFn);

  useEffect(() => {
    fetchFnRef.current = fetchFn;
  }, [fetchFn]);

  const run = useCallback(async (...args) => {
    const currentId = ++reqIdRef.current;
    setState("running");
    setError("");

    try {
      const res = await fetchFnRef.current(...args);
      if (currentId !== reqIdRef.current) return;
      const resData = res?.data ?? res;
      const now = new Date();

      setData(resData);
      setState("done");
      setAnalyzedAt(now);

      if (cacheKey) {
        analysisSessionCache.set(cacheKey, { data: resData, analyzedAt: now });
      }

      onSuccess?.(resData);
      return resData;
    } catch (err) {
      if (currentId !== reqIdRef.current) return;
      const msg = errorMessage(err);
      setError(msg);
      setState("error");
      onError?.(msg);
      throw err;
    }
  }, [cacheKey, onSuccess, onError]);

  const reset = useCallback(() => {
    reqIdRef.current++;
    setState("idle");
    setError("");
    if (cacheKey) {
      analysisSessionCache.delete(cacheKey);
    }
  }, [cacheKey]);

  return {
    state,
    data,
    error,
    analyzedAt,
    run,
    reset,
    isRunning: state === "running",
    isDone: state === "done",
    isIdle: state === "idle",
    isError: state === "error",
  };
}
