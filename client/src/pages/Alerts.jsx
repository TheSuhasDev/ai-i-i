import { useState } from "react";
import { Link } from "react-router-dom";
import { insightService } from "../services";
import useFetch from "../hooks/useFetch";
import Pill from "../components/Pill";
import { PRIORITY_ORDER, humanize } from "../utils/format";

const fetchFull = () => insightService.list({ full: 1 });

export default function Alerts() {
  const { data, loading, error } = useFetch(fetchFull);
  const [priority, setPriority] = useState("");
  const [type, setType] = useState("");

  const all = (data?.data ?? [])
    .flatMap((i) => (i.data?.alerts ?? []).map((a) => ({ code: i.productCode, name: i.data.name, ...a })))
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  const types = [...new Set(all.map((a) => a.type))];
  const rows = all.filter((a) => (!priority || a.priority === priority) && (!type || a.type === type));

  return (
    <div>
      <div className="page-head"><h2>Alerts</h2></div>
      <div className="toolbar">
        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="">All priorities</option>
          {["Critical", "High", "Medium", "Low"].map((p) => <option key={p}>{p}</option>)}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          {types.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}
        </select>
        <span className="muted">{rows.length} alerts</span>
      </div>
      {error && <div className="alert">{error}</div>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>Priority</th><th>Product</th><th>Type</th><th>Message</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="center">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={4} className="center">No alerts. Refresh insights on the dashboard if this looks wrong.</td></tr>
            ) : (
              rows.map((a, idx) => (
                <tr key={`${a.code}-${a.type}-${idx}`}>
                  <td><Pill value={a.priority} /></td>
                  <td><Link to={`/product/${a.code}`}>{a.code} {a.name}</Link></td>
                  <td>{humanize(a.type)}</td>
                  <td className="wrap">{a.message}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}