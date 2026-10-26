import { useCallback, useState } from "react";
import { anomalyService } from "../services";
import useFetch from "../hooks/useFetch";
import { formatDate, humanize } from "../utils/format";
import PageHeader from "../components/PageHeader";
import Pill from "../components/Pill";
import ProductCell from "../components/ProductCell";
import Pagination from "../components/Pagination";
import { exportCsv } from "../utils/exportCsv";

const ANOMALY_COLS = [
  { header: "Date", key: "date", format: formatDate },
  { header: "Product", key: "product_id" },
  { header: "Name", key: "name" },
  { header: "Type", key: "type", format: humanize },
  { header: "Message", key: "message" },
  { header: "Score", key: "score" },
];

/**
 * Groups anomaly rows by (product_id, type), keeping the latest date and a count.
 * Returns array of groups sorted by latest date descending.
 */
function groupAnomalies(rows) {
  const map = new Map();
  for (const a of rows) {
    const key = `${a.product_id}||${a.type}`;
    if (!map.has(key)) {
      map.set(key, { product_id: a.product_id, name: a.name, type: a.type, count: 0, latestDate: "", rows: [] });
    }
    const g = map.get(key);
    g.count += 1;
    if (!g.latestDate || a.date > g.latestDate) g.latestDate = a.date;
    g.rows.push(a);
  }
  return [...map.values()].sort((a, b) => b.latestDate.localeCompare(a.latestDate));
}

export default function Anomalies() {
  const [days, setDays] = useState(30);
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [expandedKeys, setExpandedKeys] = useState(new Set());

  const limit = 50;
  const fetchIt = useCallback(
    () => anomalyService.list({ days, limit, type: type || undefined, page }),
    [days, type, page]
  );
  const { data, loading, error } = useFetch(fetchIt);

  const res = data?.data;
  const rows = res?.anomalies ?? [];
  const pagination = res?.pagination ?? null;
  const types = Object.keys(res?.by_type ?? {});
  const grouped = groupAnomalies(rows);

  const toggleExpand = (key) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleDaysChange = (v) => { setDays(Number(v)); setPage(1); };
  const handleTypeChange = (v) => { setType(v); setPage(1); };

  return (
    <div>
      <PageHeader title="Anomalies" subtitle="Unusual sales, stock counts, and supplier delays found in the selected period." />
      <p className="muted small">
        Sales and stock anomalies detected by Isolation Forest; supplier delays flagged when a single PO arrives 15+ days late.
        Zero-sales are suppressed on out-of-stock days (lost demand, not an anomaly).
        Stock count errors are detected one day late. <strong>Supplier delay shows few entries</strong> because the rule
        triggers per individual PO (≥15 days late), not per supplier average — use Supplier Risk to see chronic delay patterns.
      </p>

      <div className="cards">
        {types.map((t) => (
          <button key={t} className={`card stat${type === t ? " active" : ""}`} onClick={() => handleTypeChange(type === t ? "" : t)} style={{ cursor: "pointer", textAlign: "left" }}>
            <h4>{humanize(t)}</h4>
            <p className="big">{res.by_type[t]}</p>
          </button>
        ))}
      </div>

      <div className="toolbar">
        <select value={days} onChange={(e) => handleDaysChange(e.target.value)}>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last year</option>
          <option value={730}>All (2 years)</option>
        </select>
        <select value={type} onChange={(e) => handleTypeChange(e.target.value)}>
          <option value="">All types</option>
          {types.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}
        </select>
        <span className="muted">{res ? `${res.total ?? res.count} total` : ""}</span>
        <button className="btn" onClick={() => exportCsv("anomalies", ANOMALY_COLS, rows)} disabled={!rows.length}>Export CSV</button>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Latest date</th>
              <th>Product</th>
              <th>Type</th>
              <th>Occurrences</th>
              <th>Latest message</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="center">Loading...</td></tr>
            ) : grouped.length === 0 ? (
              <tr><td colSpan={6} className="center">No anomalies in this period</td></tr>
            ) : (
              grouped.map((g) => {
                const key = `${g.product_id}||${g.type}`;
                const expanded = expandedKeys.has(key);
                const latestRow = g.rows[0];
                return [
                  <tr key={key} className="group-row" style={{ cursor: "pointer" }} onClick={() => toggleExpand(key)}>
                    <td style={{ width: "20px", userSelect: "none" }}>{expanded ? "▾" : "▸"}</td>
                    <td>{formatDate(g.latestDate)}</td>
                    <td><ProductCell product={{ code: g.product_id, name: g.name }} size="md" imageList={rows} /></td>
                    <td><Pill value={humanize(g.type)} /></td>
                    <td className="numeric">{g.count}</td>
                    <td className="wrap">
                      <div style={{ lineHeight: "1.4" }}>
                        <div style={{ wordBreak: "break-word", whiteSpace: expanded ? "normal" : "normal" }}>
                          {latestRow?.message}
                        </div>
                        {g.count > 1 && !expanded && (
                          <span className="muted small" style={{ fontSize: "11px", display: "inline-block", marginTop: "3px" }}>
                            +{g.count - 1} earlier occurrences (click to view)
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>,
                  expanded && g.rows.map((a, i) => (
                    <tr key={`${key}-detail-${i}`} className="detail-row" style={{ background: "var(--surface-raised)" }}>
                      <td></td>
                      <td style={{ paddingLeft: "28px", color: "var(--muted)", fontSize: ".85em" }}>{formatDate(a.date)}</td>
                      <td></td>
                      <td></td>
                      <td className="numeric">{a.score != null ? a.score : "-"}</td>
                      <td className="wrap" style={{ fontSize: ".85em", lineHeight: "1.45", wordBreak: "break-word" }}>{a.message}</td>
                    </tr>
                  )),
                ];
              })
            )}
          </tbody>
        </table>
      </div>
      {pagination && (
        <Pagination pagination={pagination} onPage={(p) => setPage(p)} />
      )}
    </div>
  );
}
