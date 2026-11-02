import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "../services/api";

// Loads a paginated list from a service and exposes filter/page/reload helpers.
export default function useList(service, initial = {}) {
  const [params, setParams] = useState({ page: 1, limit: 15, ...initial });
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    if (hasLoadedRef.current) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    service
      .list(params)
      .then(({ data: res }) => {
        if (cancelled) return;
        hasLoadedRef.current = true;
        // Skip setState if data is unchanged to prevent layout re-render loops
        setData((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(res.data)) return prev;
          return res.data;
        });
        setPagination((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(res.pagination)) return prev;
          return res.pagination;
        });
        setError("");
      })
      .catch((e) => {
        if (!cancelled) setError(errorMessage(e));
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setIsRefreshing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [service, params, tick]);

  const filter = useCallback((patch) => {
    setParams((p) => {
      let changed = false;
      for (const [k, v] of Object.entries(patch)) {
        if (p[k] !== v) {
          changed = true;
          break;
        }
      }
      if (!changed) return p;
      return { ...p, page: 1, ...patch };
    });
  }, []);

  const setPage = useCallback((page) => {
    setParams((p) => {
      if (p.page === page) return p;
      return { ...p, page };
    });
  }, []);

  const reload = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  return { data, pagination, loading, isRefreshing, error, params, filter, setPage, reload };
}