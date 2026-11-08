import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { insightService } from "../services";
import useFetch from "../hooks/useFetch";
import Pill from "../components/Pill";
import PageHeader from "../components/PageHeader";
import ProductCell from "../components/ProductCell";
import ProductThumb from "../components/ProductThumb";
import MetricCard from "../components/MetricCard";
import { PRIORITY_ORDER, humanize, formatMarginChip, formatMarginSigned } from "../utils/format";
import { exportCsv } from "../utils/exportCsv";

const ALERT_COLS = [
  { header: "Product Code", key: "code" },
  { header: "Product Name", key: "name" },
  { header: "Highest Priority", key: "highestPriority" },
  { header: "Margin Days", key: "marginDays", format: (v) => (v != null ? formatMarginSigned(v) : "-") },
  { header: "Alert Count", key: "count" },
  { header: "Messages", key: "messages", format: (_, row) => row.alerts.map((a) => `[${a.priority}] ${humanize(a.type)}: ${a.message}`).join(" | ") },
];

const fetchFull = () => insightService.list({ full: 1 });

export default function Alerts() {
  const { data, loading, error } = useFetch(fetchFull);
  const [priority, setPriority] = useState("");
  const [type, setType] = useState("");
  const [viewMode, setViewMode] = useState("cards");
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

  const rawProducts = useMemo(() => {
    return (data?.data ?? [])
      .map((i) => {
        const alerts = i.data?.alerts ?? [];
        const highestPriority = alerts.length
          ? [...alerts].sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99))[0]?.priority
          : "Low";
        return {
          code: i.productCode,
          name: i.data?.name || i.productCode,
          product: { code: i.productCode, name: i.data?.name },
          alerts,
          highestPriority,
          marginDays: i.marginDays ?? i.data?.stockout?.margin_days,
          daysOfCover: i.daysOfCover ?? i.data?.stockout?.days_of_cover,
          daysToDelivery: i.data?.stockout?.days_to_delivery,
          leadTimeSource: i.data?.stockout?.leadTimeSource || i.data?.inputs?.leadTimeSource || "configured",
        };
      })
      .filter((p) => p.alerts.length > 0);
  }, [data]);

  const severityCounts = useMemo(() => {
    if (data?.kpi) {
      return {
        critical: { alerts: data.kpi.critical?.alerts ?? 0, products: data.kpi.critical?.products ?? 0 },
        high: { alerts: data.kpi.high?.alerts ?? 0, products: data.kpi.high?.products ?? 0 },
        medium: { alerts: data.kpi.medium?.alerts ?? 0, products: data.kpi.medium?.products ?? 0 },
        low: { alerts: data.kpi.low?.alerts ?? 0, products: data.kpi.low?.products ?? 0 },
      };
    }
    const counts = {
      critical: { alerts: 0, products: 0 },
      high: { alerts: 0, products: 0 },
      medium: { alerts: 0, products: 0 },
      low: { alerts: 0, products: 0 },
    };
    const productsByPrio = {
      critical: new Set(),
      high: new Set(),
      medium: new Set(),
      low: new Set(),
    };
    for (const p of rawProducts) {
      for (const a of p.alerts) {
        const k = (a.priority || "").toLowerCase();
        if (counts[k]) {
          counts[k].alerts++;
          productsByPrio[k].add(p.code);
        }
      }
    }
    for (const k of ["critical", "high", "medium", "low"]) {
      counts[k].products = productsByPrio[k].size;
    }
    return counts;
  }, [data, rawProducts]);

  const allTypes = [...new Set(rawProducts.flatMap((p) => p.alerts.map((a) => a.type)))];

  const groupedRows = useMemo(() => {
    return rawProducts
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
          ...p,
          alerts: sortedAlerts,
          highestPriority,
          count: sortedAlerts.length,
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        // 1. Severity tier
        const pA = PRIORITY_ORDER[a.highestPriority] ?? 99;
        const pB = PRIORITY_ORDER[b.highestPriority] ?? 99;
        if (pA !== pB) return pA - pB;

        // Within severity tier: urgency
        const isOverstockA = a.alerts.some((x) => x.type === "overstock") && !a.alerts.some((x) => (x.type || "").includes("margin") || (x.type || "").includes("stockout"));
        const isOverstockB = b.alerts.some((x) => x.type === "overstock") && !b.alerts.some((x) => (x.type || "").includes("margin") || (x.type || "").includes("stockout"));

        if (isOverstockA && isOverstockB) {
          // Overstock by days of cover descending
          const covA = a.daysOfCover ?? 0;
          const covB = b.daysOfCover ?? 0;
          if (covB !== covA) return covB - covA;
        } else if (!isOverstockA && !isOverstockB) {
          // Smallest margin / largest days-short first
          const marA = a.marginDays ?? 999;
          const marB = b.marginDays ?? 999;
          if (marA !== marB) return marA - marB;
        } else {
          return isOverstockA ? 1 : -1;
        }

        // Tie-break by alert count descending
        if (b.count !== a.count) return b.count - a.count;

        // Tie-break by SKU ascending
        return a.code.localeCompare(b.code);
      });
  }, [rawProducts, priority, type]);

  return (
    <div className="alerts-page" style={{ paddingBottom: "100px" }}>
      <PageHeader title="Alerts" subtitle="Critical inventory bottlenecks and supplier anomalies needing review." />

      <div className="cards" style={{ marginBottom: "16px" }}>
        <div style={{ cursor: "pointer" }} onClick={() => setPriority((p) => (p === "Critical" ? "" : "Critical"))}>
          <MetricCard
            label="Critical Alerts"
            value={severityCounts.critical.alerts}
            sub={`${severityCounts.critical.alerts} alerts - ${severityCounts.critical.products} products`}
            tone="tone-critical"
          />
        </div>
        <div style={{ cursor: "pointer" }} onClick={() => setPriority((p) => (p === "High" ? "" : "High"))}>
          <MetricCard
            label="High Priority"
            value={severityCounts.high.alerts}
            sub={`${severityCounts.high.alerts} alerts - ${severityCounts.high.products} products`}
            tone="tone-warning"
          />
        </div>
        <div style={{ cursor: "pointer" }} onClick={() => setPriority((p) => (p === "Medium" ? "" : "Medium"))}>
          <MetricCard
            label="Medium Priority"
            value={severityCounts.medium.alerts}
            sub={`${severityCounts.medium.alerts} alerts - ${severityCounts.medium.products} products`}
            tone="tone-healthy"
          />
        </div>
        <div style={{ cursor: "pointer" }} onClick={() => setPriority((p) => (p === "Low" ? "" : "Low"))}>
          <MetricCard
            label="Low Priority"
            value={severityCounts.low.alerts}
            sub={`${severityCounts.low.alerts} alerts - ${severityCounts.low.products} products`}
            tone="tone-healthy"
          />
        </div>
      </div>

      <div className="toolbar" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px" }}>
        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="">All priorities</option>
          {["Critical", "High", "Medium", "Low"].map((p) => <option key={p}>{p}</option>)}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          {allTypes.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}
        </select>
        <label className="inline" style={{ cursor: "pointer" }} title="Show or collapse Low/Medium alerts on cards with higher priority alerts">
          <input
            type="checkbox"
            checked={showLowMedium}
            onChange={(e) => setShowLowMedium(e.target.checked)}
          />
          Show hidden Low/Med alerts
        </label>
        <div style={{ display: "inline-flex", borderRadius: "6px", border: "1px solid var(--border)", overflow: "hidden", marginLeft: "auto" }}>
          <button
            type="button"
            className={`btn small ${viewMode === "cards" ? "primary" : ""}`}
            onClick={() => setViewMode("cards")}
            title="Card View"
          >
            ⊞ Cards
          </button>
          <button
            type="button"
            className={`btn small ${viewMode === "table" ? "primary" : ""}`}
            onClick={() => setViewMode("table")}
            title="Table View"
          >
            ☰ Table
          </button>
        </div>
        <button className="btn small" onClick={() => exportCsv("alerts", ALERT_COLS, groupedRows)} disabled={!groupedRows.length}>
          Export CSV
        </button>
      </div>

      {priority && (
        <div style={{ margin: "8px 0 14px", display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="muted small">Active filter:</span>
          <span className="pill status-info" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
            {priority} Priority
            <button type="button" onClick={() => setPriority("")} style={{ background: "transparent", border: "none", cursor: "pointer", color: "inherit", padding: "0 2px" }}>✕</button>
          </span>
        </div>
      )}

      {error && <div className="alert">{error}</div>}

      {viewMode === "cards" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px", margin: "16px 0" }}>
          {loading ? (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", color: "var(--muted, #475569)" }}>Loading alerts...</div>
          ) : groupedRows.length === 0 ? (
            <div className="card" style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px" }}>
              <h4>✅ No alerts found</h4>
              <p className="muted small">All systems normal or filter criteria did not match any active alert.</p>
              {priority && <button type="button" className="btn small" onClick={() => setPriority("")} style={{ marginTop: "10px" }}>Clear Filter</button>}
            </div>
          ) : (
            groupedRows.map((row) => {
              const borderColor = row.highestPriority === "Critical" ? "var(--danger)" : row.highestPriority === "High" ? "var(--warning)" : "var(--accent)";
              const urgent = row.alerts.filter((a) => a.priority === "Critical" || a.priority === "High");
              const lowMed = row.alerts.filter((a) => a.priority === "Medium" || a.priority === "Low");
              const isExpanded = showLowMedium || priority === "Medium" || priority === "Low" || expandedRows.has(row.code);
              const displayedAlerts = isExpanded ? row.alerts : (urgent.length ? urgent : lowMed.slice(0, 1));
              const hiddenAlerts = row.alerts.filter((a) => !displayedAlerts.includes(a));
              const hiddenCount = hiddenAlerts.length;
              const hiddenTooltip = `Hidden alerts: ${hiddenAlerts.map((a) => `[${a.priority}] ${humanize(a.type)}`).join(", ")}`;

              return (
                <div
                  key={row.code}
                  className="card"
                  style={{
                    borderLeft: `4px solid ${borderColor}`,
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    borderRadius: "10px",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: "1 1 auto" }}>
                        <ProductThumb product={row.product} size="md" imageList={rawProducts.map((p) => p.product)} />
                        <div style={{ minWidth: 0, flex: "1 1 auto" }}>
                          <Link to={`/products/${row.code}`} style={{ fontWeight: 600, fontSize: "14px", textDecoration: "none", color: "var(--text, #111827)", display: "block", wordBreak: "break-word" }}>
                            {row.name}
                          </Link>
                          <div style={{ fontSize: "11px", color: "var(--muted, #475569)", fontWeight: 500, display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                            <span>{row.code}</span>
                            {row.leadTimeSource && (
                              <span
                                className="badge muted"
                                title={`Lead time source: ${row.leadTimeSource} (from supplier delivery records or catalog default)`}
                                style={{ fontSize: "9px", padding: "1px 4px", textTransform: "capitalize", cursor: "help", flexShrink: 0 }}
                              >
                                {row.leadTimeSource} LT
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div style={{ flexShrink: 0, marginLeft: "8px" }}>
                        <Pill value={row.highestPriority} />
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", margin: "12px 0" }}>
                      {displayedAlerts.map((a, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: "8px 10px",
                            borderRadius: "6px",
                            background: "var(--surface-raised, rgba(255,255,255,0.04))",
                            fontSize: "12px",
                            lineHeight: 1.45,
                            border: "1px solid var(--border, #e2e8f0)",
                            color: "var(--text, #1f2937)",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                              <span className="badge" style={{ fontSize: "10px", textTransform: "uppercase" }}>{humanize(a.type)}</span>
                              {(a.margin_chip || (((a.type || "").includes("margin") || (a.type || "").includes("stockout")) && a.margin_days != null)) && (
                                <span
                                  className="badge"
                                  style={{
                                    fontSize: "10px",
                                    fontWeight: 600,
                                    textTransform: "none",
                                    letterSpacing: "normal",
                                  }}
                                >
                                  {a.margin_chip || formatMarginChip(a.margin_days)}
                                </span>
                              )}
                              {a.leadTimeSource && (
                                <span
                                  className="badge muted"
                                  title={`Lead time source: ${a.leadTimeSource}`}
                                  style={{ fontSize: "9px", padding: "1px 4px", cursor: "help" }}
                                >
                                  {a.leadTimeSource}
                                </span>
                              )}
                            </div>
                            <Pill value={a.priority} />
                          </div>
                          <span>{a.message}</span>
                        </div>
                      ))}
                      {hiddenCount > 0 && (
                        <button
                          type="button"
                          className="btn small"
                          title={hiddenTooltip}
                          style={{ alignSelf: "flex-start", fontSize: "11px", padding: "4px 8px" }}
                          onClick={() => toggleRow(row.code)}
                        >
                          + {hiddenCount} more alert{hiddenCount === 1 ? "" : "s"} (Low/Med)
                        </button>
                      )}
                      {!showLowMedium && isExpanded && hiddenCount === 0 && lowMed.length > 0 && urgent.length > 0 && (
                        <button
                          type="button"
                          className="btn small"
                          style={{ alignSelf: "flex-start", fontSize: "11px", padding: "4px 8px" }}
                          onClick={() => toggleRow(row.code)}
                        >
                          Collapse Low/Med
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", paddingTop: "10px", borderTop: "1px solid var(--border)" }}>
                    <span className="muted small" style={{ color: "var(--muted, #475569)" }}>{row.count} {row.count === 1 ? "alert" : "alerts"}</span>
                    <Link className="btn small primary" to={`/products/${row.code}`}>View Intelligence →</Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Priority</th>
                <th>Product</th>
                <th>Margin Days</th>
                <th>Count</th>
                <th>Alert Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="center">Loading...</td></tr>
              ) : groupedRows.length === 0 ? (
                <tr><td colSpan={5} className="center">No alerts found.</td></tr>
              ) : (
                groupedRows.map((row) => {
                  const urgent = row.alerts.filter((a) => a.priority === "Critical" || a.priority === "High");
                  const lowMed = row.alerts.filter((a) => a.priority === "Medium" || a.priority === "Low");
                  const isExpanded = showLowMedium || priority === "Medium" || priority === "Low" || expandedRows.has(row.code);
                  const displayedAlerts = isExpanded ? row.alerts : (urgent.length ? urgent : lowMed.slice(0, 1));
                  const hiddenAlerts = row.alerts.filter((a) => !displayedAlerts.includes(a));
                  const hiddenCount = hiddenAlerts.length;
                  const hiddenTooltip = `Hidden alerts: ${hiddenAlerts.map((a) => `[${a.priority}] ${humanize(a.type)}`).join(", ")}`;

                  return (
                    <tr key={row.code}>
                      <td style={{ verticalAlign: "top" }}>
                        <Pill value={row.highestPriority} />
                      </td>
                      <td style={{ verticalAlign: "top" }}>
                        <ProductCell product={row.product} size="sm" imageList={rawProducts.map((p) => p.product)} />
                      </td>
                      <td style={{ verticalAlign: "top" }}>
                        {row.alerts.some((a) => (a.type || "").includes("margin") || (a.type || "").includes("stockout")) && row.marginDays != null ? (
                          <span className="badge" style={{ fontWeight: 600, textTransform: "none", letterSpacing: "normal" }}>
                            {formatMarginChip(row.marginDays)}
                          </span>
                        ) : (
                          <span className="muted">—</span>
                        )}
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
                              {(a.margin_chip || (((a.type || "").includes("margin") || (a.type || "").includes("stockout")) && a.margin_days != null)) && (
                                <span
                                  className="badge"
                                  style={{
                                    fontSize: "10px",
                                    fontWeight: 600,
                                    textTransform: "none",
                                    letterSpacing: "normal",
                                  }}
                                >
                                  {a.margin_chip || formatMarginChip(a.margin_days)}
                                </span>
                              )}
                              {a.leadTimeSource && (
                                <span
                                  className="badge muted"
                                  title={`Lead time source: ${a.leadTimeSource}`}
                                  style={{ fontSize: "10px", padding: "1px 4px", cursor: "help" }}
                                >
                                  {a.leadTimeSource}
                                </span>
                              )}
                              <span style={{ color: "var(--text, #1f2937)" }}>{a.message}</span>
                            </div>
                          ))}
                          {hiddenCount > 0 && (
                            <button
                              type="button"
                              className="btn small"
                              title={hiddenTooltip}
                              style={{ alignSelf: "flex-start", fontSize: "11px", padding: "2px 8px", marginTop: "2px" }}
                              onClick={() => toggleRow(row.code)}
                            >
                              + {hiddenCount} more alert{hiddenCount === 1 ? "" : "s"}
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
      )}
    </div>
  );
}
