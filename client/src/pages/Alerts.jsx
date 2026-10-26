import { useState } from "react";
import { insightService } from "../services";
import useFetch from "../hooks/useFetch";
import Pill from "../components/Pill";
import PageHeader from "../components/PageHeader";
import ProductCell from "../components/ProductCell";
import { PRIORITY_ORDER, humanize } from "../utils/format";
import { exportCsv } from "../utils/exportCsv";

const ALERT_COLS = [
  { header: "Product Code", key: "code" },
  { header: "Product Name", key: "name" },
  { header: "Highest Priority", key: "highestPriority" },
  { header: "Alert Count", key: "count" },
  { header: "Messages", key: "messages", format: (_, row) => row.alerts.map((a) => `[${a.priority}] ${humanize(a.type)}: ${a.message}`).join(" | ") },
];

const fetchFull = () => insightService.list({ full: 1 });

export default function Alerts() {
  const { data, loading, error } = useFetch(fetchFull);
  const [priority, setPriority] = useState("");
  const [type, setType] = useState("");
  const [showLowMedium, setShowLowMedium] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());

  const toggleRow = (code) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const rawProducts = (data?.data ?? [])
    .map((i) => ({
      code: i.productCode,
      name: i.data?.name || i.productCode,
      product: { code: i.productCode, name: i.data?.name },
      alerts: i.data?.alerts ?? [],
    }))
    .filter((p) => p.alerts.length > 0);

  const allTypes = [...new Set(rawProducts.flatMap((p) => p.alerts.map((a) => a.type)))];

  const groupedRows = rawProducts
    .map((p) => {
      const matchingAlerts = p.alerts.filter((a) => {
        if (priority && a.priority !== priority) return false;
        if (type && a.type !== type) return false;
        return true;
      });
      if (matchingAlerts.length === 0) return null;

      const sortedAlerts = [...matchingAlerts].sort(
        (a, b) => (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99)
      );
      const highestPriority = sortedAlerts[0]?.priority || "Low";

      return {
        code: p.code,
        name: p.name,
        product: p.product,
        alerts: sortedAlerts,
        highestPriority,
        count: sortedAlerts.length,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (PRIORITY_ORDER[a.highestPriority] ?? 99) - (PRIORITY_ORDER[b.highestPriority] ?? 99));

  const totalAlerts = groupedRows.reduce((acc, r) => acc + r.count, 0);

  return (
    <div>
      <PageHeader title="Alerts" subtitle="Products with stock, delivery, or supplier conditions that need review." />
      <div className="toolbar">
        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="">All priorities</option>
          {["Critical", "High", "Medium", "Low"].map((p) => <option key={p}>{p}</option>)}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          {allTypes.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}
        </select>
        <label className="inline" style={{ cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={showLowMedium}
            onChange={(e) => setShowLowMedium(e.target.checked)}
          />
          Expand all Low/Medium alerts
        </label>
        <span className="muted">{totalAlerts} alerts ({groupedRows.length} products)</span>
        <button className="btn" onClick={() => exportCsv("alerts", ALERT_COLS, groupedRows)} disabled={!groupedRows.length}>
          Export CSV
        </button>
      </div>
      {error && <div className="alert">{error}</div>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Priority</th>
              <th>Product</th>
              <th>Count</th>
              <th>Alert Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="center">Loading...</td></tr>
            ) : groupedRows.length === 0 ? (
              <tr><td colSpan={4} className="center">No alerts found. Refresh insights on the dashboard if this looks wrong.</td></tr>
            ) : (
              groupedRows.map((row) => {
                const urgent = row.alerts.filter((a) => a.priority === "Critical" || a.priority === "High");
                const lowMed = row.alerts.filter((a) => a.priority === "Medium" || a.priority === "Low");
                const isExpanded = showLowMedium || priority === "Medium" || priority === "Low" || expandedRows.has(row.code);
                const displayedAlerts = isExpanded ? row.alerts : (urgent.length ? urgent : lowMed.slice(0, 1));
                const hiddenCount = row.alerts.length - displayedAlerts.length;

                return (
                  <tr key={row.code}>
                    <td style={{ verticalAlign: "top" }}>
                      <Pill value={row.highestPriority} />
                    </td>
                    <td style={{ verticalAlign: "top" }}>
                      <ProductCell product={row.product} size="sm" imageList={rawProducts.map((p) => p.product)} />
                    </td>
                    <td style={{ verticalAlign: "top" }}>
                      <span className="badge">{row.count} {row.count === 1 ? "alert" : "alerts"}</span>
                    </td>
                    <td className="wrap" style={{ verticalAlign: "top" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {displayedAlerts.map((a, idx) => (
                          <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "8px", lineHeight: "1.45" }} title={a.message}>
                            <Pill value={a.priority} />
                            <span className="badge muted" style={{ fontSize: "11px", whiteSpace: "nowrap" }}>
                              {humanize(a.type)}
                            </span>
                            <span style={{ whiteSpace: "normal", wordBreak: "break-word" }}>
                              {a.message}
                            </span>
                          </div>
                        ))}
                        {hiddenCount > 0 && (
                          <button
                            type="button"
                            className="btn small"
                            style={{ alignSelf: "flex-start", fontSize: "11px", padding: "2px 8px", marginTop: "2px" }}
                            onClick={() => toggleRow(row.code)}
                          >
                            + {hiddenCount} more {hiddenCount === 1 ? "alert" : "alerts"} (Low/Medium)
                          </button>
                        )}
                        {!showLowMedium && isExpanded && hiddenCount === 0 && lowMed.length > 0 && urgent.length > 0 && (
                          <button
                            type="button"
                            className="btn small"
                            style={{ alignSelf: "flex-start", fontSize: "11px", padding: "2px 8px", marginTop: "2px" }}
                            onClick={() => toggleRow(row.code)}
                          >
                            Collapse Low/Medium
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
