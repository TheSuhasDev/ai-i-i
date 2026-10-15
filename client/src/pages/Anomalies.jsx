import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { anomalyService } from "../services";
import useFetch from "../hooks/useFetch";
import { humanize } from "../utils/format";

export default function Anomalies() {
  const [days, setDays] = useState(730);
  const [type, setType] = useState("");
  const fetchIt = useCallback(() => anomalyService.list({ days, limit: 500, type: type || undefined }), [days, type]);
  const { data, loading, error } = useFetch(fetchIt);

  const res = data?.data;
  const rows = (res?.anomalies ?? []).filter((a) => !type || a.type === type);
  const types = Object.keys(res?.by_type ?? {});

  return (
    <div>
      <div className="page-head"><h2>Anomalies</h2></div>
      <p className="muted">
        Unusual sales, stock counts and supplier delays found by Isolation Forest and a delay rule.
        Stock count errors are detected one day late, so the latest day is not checked yet.
      </p>

      <div className="cards">
        {types.map((t) => (
          <div key={t} className="card stat">
            <h4>{humanize(t)}</h4>
            <p className="big">{res.by_type[t]}</p>
          </div>
        ))}
      </div>

      <div className="toolbar">
        <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last year</option>
          <option value={730}>All (2 years)</option>
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          {types.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}
        </select>
        <span className="muted">{rows.length} shown{res ? ` of ${res.count}` : ""}</span>
      </div>

      {error && <div className="alert">{error}</div>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Product</th><th>Type</th><th>What happened</th><th>Score</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="center">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="center">No anomalies in this period</td></tr>
            ) : (
              rows.map((a, i) => (
                <tr key={`${a.date}-${a.product_id}-${a.type}-${i}`}>
                  <td>{a.date}</td>
                  <td><Link to={`/product/${a.product_id}`}>{a.product_id} {a.name}</Link></td>
                  <td><span className="pill">{humanize(a.type)}</span></td>
                  <td className="wrap">{a.message}</td>
                  <td>{a.score ?? "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}