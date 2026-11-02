import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "../services/api";

export default function useFetch(fn) {
  const [state, setState] = useState({ data: null, loading: true, error: "" });
  const [tick, setTick] = useState(0);
  const fnRef = useRef(fn);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  useEffect(() => {
    let cancelled = false;
    if (!hasLoadedRef.current) {
      setState((s) => ({ ...s, loading: true }));
    }

    fnRef.current()
      .then((r) => {
        if (cancelled) return;
        hasLoadedRef.current = true;
        setState((prev) => {
          if (JSON.stringify(prev.data) === JSON.stringify(r.data)) {
            return { ...prev, loading: false, error: "" };
          }
          return { data: r.data, loading: false, error: "" };
        });
      })
      .catch((e) => {
        if (!cancelled) {
          setState((prev) => ({ ...prev, loading: false, error: errorMessage(e) }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [tick]);

  const reload = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  return { ...state, reload };
}