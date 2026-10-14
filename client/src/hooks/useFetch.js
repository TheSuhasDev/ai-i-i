import { useCallback, useEffect, useState } from "react";
import { errorMessage } from "../services/api";

export default function useFetch(fn) {
  const [state, setState] = useState({ data: null, loading: true, error: "" });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fn()
      .then((r) => !cancelled && setState({ data: r.data, loading: false, error: "" }))
      .catch((e) => !cancelled && setState({ data: null, loading: false, error: errorMessage(e) }));
    return () => {
      cancelled = true;
    };
  }, [fn, tick]);

  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true }));
    setTick((t) => t + 1);
  }, []);

  return { ...state, reload };
}