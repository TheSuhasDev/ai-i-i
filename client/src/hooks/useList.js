import { useEffect, useState } from "react";
import { errorMessage } from "../services/api";

// Loads a paginated list from a service and exposes filter/page/reload helpers.
export default function useList(service, initial = {}) {
  const [params, setParams] = useState({ page: 1, limit: 15, ...initial });
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    service
      .list(params)
      .then(({ data: res }) => {
        if (cancelled) return;
        setData(res.data);
        setPagination(res.pagination);
        setError("");
      })
      .catch((e) => !cancelled && setError(errorMessage(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [service, params, tick]);

  const filter = (patch) => {
    setLoading(true);
    setParams((p) => ({ ...p, page: 1, ...patch }));
  };
  const setPage = (page) => {
    setLoading(true);
    setParams((p) => ({ ...p, page }));
  };
  const reload = () => {
    setLoading(true);
    setTick((t) => t + 1);
  };

  return { data, pagination, loading, error, params, filter, setPage, reload };
}