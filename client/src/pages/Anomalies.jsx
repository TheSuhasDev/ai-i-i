import { useCallback, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { anomalyService } from "../services";
import useAnalysis from "../hooks/useAnalysis";
import useToast from "../context/useToast";
import { formatDate, humanize } from "../utils/format";
import PageHeader from "../components/PageHeader";
import Pill from "../components/Pill";
import ProductCell from "../components/ProductCell";
import Pagination from "../components/Pagination";
import { exportCsv } from "../utils/exportCsv";
import { AnalysisButton, AnalysisIdle, AnalysisLoader, AnalysisReveal } from "../components/analysis";
import { ChartCard, ChartTooltip, CHART_GRID_PROPS, X_AXIS_PROPS, Y_AXIS_PROPS } from "../components/charts";

const ANOMALY_COLS = [
  { header: "Date", key: "date", format: formatDate },
  { header: "Product", key: "product_id" },
  { header: "Name", key: "name" },
  { header: "Type", key: "type", format: humanize },
  { header: "Score", key: "score", format: (v) => (v != null ? v : "Rule") },
  { header: "Message", key: "message" },
];

const STANDARD_TYPES = ["sales_spike", "zero_sales", "stock_mismatch", "supplier_delay"];

function anomalyTone(type) {
  if (type === "supplier_delay") return "status-critical";
  if (type === "stock_mismatch" || type === "zero_sales") return "status-warning";
  if (type === "sales_spike") return "status-info";
  return "status-info";
}

/**
 * Groups anomaly rows by (product_id, type), keeping the latest date and a count.
 * Returns array of groups sorted by latest date descending with rows sorted latest to earliest.
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
  const result = [...map.values()].sort((a, b) => b.latestDate.localeCompare(a.latestDate));
  for (const g of result) {
    g.rows.sort((a, b) => b.date.localeCompare(a.date));
  }
  return result;
}

export default function Anomalies() {
  const toast = useToast();
  const [days, setDays] = useState(30);
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [expandedKeys, setExpandedKeys] = useState(new Set());

  const fetchIt = useCallback(
    () => anomalyService.list({ days, limit: 1000 }),
    [days]
  );
  const { state, data, error, analyzedAt, run } = useAnalysis(fetchIt, {
    cacheKey: `anomalies-${days}`,
    onSuccess: () => toast.success("Anomaly detection analysis complete"),
  });
  const [showLoader, setShowLoader] = useState(false);

  const handleAnalyze = useCallback(async () => {
    setShowLoader(true);
    try {
      await run();
    } catch {
      // Handled in useAnalysis
    }
  }, [run]);

  // If user changes time horizon while already in done state, re-run analysis automatically
  const handleDaysChange = useCallback(
    async (v) => {
      const newDays = Number(v);
      setDays(newDays);
      setPage(1);
      setType("");
      setSearch("");
      if (state === "done") {
        setShowLoader(true);
        try {
          await run();
        } catch {
          // Handled in useAnalysis
        }
      }
    },
    [state, run]
  );

  const handleTypeChange = (v) => {
    setType(v);
    setPage(1);
  };

  const res = data?.data;
  const allRows = useMemo(() => res?.allAnomalies ?? res?.anomalies ?? [], [res]);

  const countsByType = useMemo(() => {
    const counts = { ...(res?.by_type || {}) };
    for (const t of STANDARD_TYPES) {
      if (counts[t] === undefined) counts[t] = 0;
    }
    return counts;
  }, [res]);

  const types = useMemo(() => {
    const rawKeys = Object.keys(countsByType);
    return [...STANDARD_TYPES, ...rawKeys.filter((k) => !STANDARD_TYPES.includes(k))];
  }, [countsByType]);

  const topType = useMemo(() => {
    const entries = Object.entries(countsByType);
    if (!entries.length) return null;
    return entries.reduce(
      (top, [t, count]) => (!top || count > top.count ? { type: t, count } : top),
      null
    )?.type;
  }, [countsByType]);

  const filteredRows = useMemo(() => {
    let result = allRows;
    if (type) {
      result = result.filter((r) => r.type === type);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (r) =>
          (r.product_id && r.product_id.toLowerCase().includes(q)) ||
          (r.name && r.name.toLowerCase().includes(q)) ||
          (r.message && r.message.toLowerCase().includes(q))
      );
    }
    return result;
  }, [allRows, type, search]);

  const grouped = useMemo(() => groupAnomalies(filteredRows), [filteredRows]);

  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(grouped.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedGroups = useMemo(() => {
    return grouped.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [grouped, currentPage, pageSize]);

  const timelineData = useMemo(() => {
    if (!filteredRows.length) return [];
    const map = {};
    for (const r of filteredRows) {
      const d = r.date ? r.date.slice(0, 10) : "";
      if (!d) continue;
      const label = formatDate(d);
      if (!map[label]) {
        map[label] = { label, rawDate: d, total: 0 };
      }
      const tKey = humanize(r.type);
      map[label][tKey] = (map[label][tKey] || 0) + 1;
      map[label].total += 1;
    }
    return Object.values(map)
      .sort((a, b) => a.rawDate.localeCompare(b.rawDate))
      .slice(-30);
  }, [filteredRows]);

  const toggleExpand = (key) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div>
      <PageHeader
        title="Anomalies"
        subtitle="Unusual sales, stock counts, and supplier delays found in the selected period."
        actions={state === "done" && !showLoader && (
          <AnalysisButton onClick={handleAnalyze} isRunning={state === "running"} isDone={true} size="small" />
        )}
      />

      {showLoader ? (
        <AnalysisLoader
          steps={[
            "Querying transaction records across window",
            "Running Isolation Forest anomaly models",
            "Evaluating supplier delay thresholds",
            "Clustering & scoring detected anomalies",
          ]}
          isComplete={state === "done" || state === "error"}
          onComplete={() => setShowLoader(false)}
        />
      ) : state === "error" ? (
        <div className="card" style={{ textAlign: "center", padding: "40px 20px", maxWidth: 640, margin: "32px auto" }}>
          <div className="alert" style={{ marginBottom: 16 }}>Failed to detect anomalies: {error}</div>
          <AnalysisButton onClick={handleAnalyze} label="Retry Analysis" isRunning={state === "running"} />
        </div>
      ) : state === "idle" ? (
        <AnalysisIdle
          icon="⚠️"
          title="Scan for Supply Chain Anomalies"
          description="Run machine learning Isolation Forest models to detect abnormal sales spikes, sudden dropouts, inventory count deviations, and delivery delays."
          buttonLabel="Detect Anomalies"
          onAnalyze={handleAnalyze}
          isRunning={state === "running"}
          controls={
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <label className="inline">
                Time horizon:
                <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                  <option value={365}>Last year</option>
                  <option value={730}>All (2 years)</option>
                </select>
              </label>
            </div>
          }
        />
      ) : (
        <AnalysisReveal analyzedAt={analyzedAt} onRerun={handleAnalyze} isRunning={state === "running"}>
      <p className="muted small">
        Sales and stock anomalies detected by Isolation Forest; supplier delays flagged when a single PO arrives 15+ days late.
        Zero-sales are suppressed on out-of-stock days (lost demand, not an anomaly).
        Stock count errors are detected one day late. <strong>Supplier delay shows few entries</strong> because the rule
        triggers per individual PO (≥15 days late), not per supplier average — use Supplier Risk to see chronic delay patterns.
      </p>

      <div className="cards" style={{ marginBottom: "16px" }}>
        <button
          type="button"
          className={`card stat${type === "" ? " active" : ""}`}
          onClick={() => { setType(""); setPage(1); }}
          style={{ cursor: "pointer", textAlign: "left" }}
        >
          <h4>All Anomalies</h4>
          <p className="big">{allRows.length}</p>
        </button>
        {types.map((t) => (
          <button
            key={t}
            type="button"
            className={`card stat${type === t ? " active" : ""}`}
            onClick={() => handleTypeChange(type === t ? "" : t)}
            style={{ cursor: "pointer", textAlign: "left" }}
          >
            <h4>{humanize(t)}</h4>
            <p className="big">{countsByType[t] || 0}</p>
          </button>
        ))}
      </div>

      {timelineData.length > 0 && (
        <ChartCard
          title="Anomaly Timeline by Type"
          subtitle="When did unusual spikes, dropouts, or supplier delays occur?"
          takeaway={`${filteredRows.length} ${filteredRows.length === 1 ? "anomaly" : "anomalies"} across ${days} days${topType ? `, mostly in ${humanize(topType)} (${countsByType[topType] || 0})` : ""}.`}
          className="my-4"
        >
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timelineData} margin={{ top: 15, right: 15, bottom: 20, left: 0 }}>
                <CartesianGrid {...CHART_GRID_PROPS} />
                <XAxis dataKey="label" {...X_AXIS_PROPS} angle={-20} textAnchor="end" height={45} tick={{ fontSize: 11 }} />
                <YAxis {...Y_AXIS_PROPS} allowDecimals={false} width={35} />
                <Tooltip content={<ChartTooltip />} />
                <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: 8, fontSize: 12 }} />
                {types.map((t, idx) => {
                  const hName = humanize(t);
                  const color = t.includes("sales")
                    ? "var(--chart-1)"
                    : t.includes("stock")
                    ? "var(--warning)"
                    : t.includes("delay")
                    ? "var(--danger)"
                    : `var(--chart-${(idx % 4) + 1})`;
                  return (
                    <Bar key={t} dataKey={hName} stackId="a" fill={color} isAnimationActive={false} />
                  );
                })}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      )}

      <div className="toolbar" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px" }}>
        <input
          type="search"
          placeholder="Filter by product or code..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{ maxWidth: "230px" }}
        />
        <select value={days} onChange={(e) => handleDaysChange(e.target.value)}>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last year</option>
          <option value={730}>All (2 years)</option>
        </select>
        <select value={type} onChange={(e) => handleTypeChange(e.target.value)}>
          <option value="">All types</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {humanize(t)} ({countsByType[t] || 0})
            </option>
          ))}
        </select>
        <span className="muted" style={{ marginLeft: "auto" }}>
          {filteredRows.length} {filteredRows.length === 1 ? "anomaly" : "anomalies"} ({grouped.length} {grouped.length === 1 ? "group" : "groups"})
        </span>
        <button className="btn" onClick={() => exportCsv("anomalies", ANOMALY_COLS, filteredRows)} disabled={!filteredRows.length}>
          Export CSV
        </button>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: "30px" }}></th>
              <th>Latest date</th>
              <th>Product</th>
              <th>Type</th>
              <th>Occurrences</th>
              <th>Latest message</th>
            </tr>
          </thead>
          <tbody>
            {paginatedGroups.length === 0 ? (
              <tr><td colSpan={6} className="center">No anomalies found</td></tr>
            ) : (
              paginatedGroups.map((g) => {
                const key = `${g.product_id}||${g.type}`;
                const expanded = expandedKeys.has(key);
                const latestRow = g.rows[0];
                return [
                  <tr key={key} className="group-row" style={{ cursor: "pointer" }} onClick={() => toggleExpand(key)}>
                    <td style={{ width: "30px", userSelect: "none", textAlign: "center" }}>{expanded ? "▾" : "▸"}</td>
                    <td>{formatDate(g.latestDate)}</td>
                    <td><ProductCell product={{ code: g.product_id, name: g.name }} size="md" imageList={filteredRows} /></td>
                    <td><Pill value={humanize(g.type)} tone={anomalyTone(g.type)} /></td>
                    <td className="numeric"><span className="badge" style={{ fontWeight: 600 }}>{g.count}</span></td>
                    <td className="wrap">
                      <div style={{ lineHeight: "1.4" }}>
                        <div style={{ wordBreak: "break-word" }}>
                          {latestRow?.message}
                        </div>
                        {g.count > 1 && !expanded && (
                          <span className="muted small" style={{ fontSize: "11px", display: "inline-block", marginTop: "3px" }}>
                            +{g.count - 1} earlier occurrences (click row to expand)
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>,
                  expanded && g.rows.map((a, i) => (
                    <tr key={`${key}-detail-${i}`} className="detail-row" style={{ background: "var(--surface-raised)" }}>
                      <td></td>
                      <td style={{ paddingLeft: "24px", color: "var(--muted)", fontSize: ".85em" }}>
                        ↳ {formatDate(a.date)}
                      </td>
                      <td></td>
                      <td></td>
                      <td className="numeric">
                        {a.score != null ? (
                          <span className="badge" title="Isolation Forest anomaly score" style={{ fontSize: "11px" }}>
                            Score {a.score}
                          </span>
                        ) : (
                          <span className="badge muted" style={{ fontSize: "11px" }}>Rule</span>
                        )}
                      </td>
                      <td className="wrap" style={{ fontSize: ".85em", lineHeight: "1.45", wordBreak: "break-word" }}>
                        {a.message}
                      </td>
                    </tr>
                  )),
                ];
              })
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <Pagination
          pagination={{ page: currentPage, limit: pageSize, total: grouped.length, pages: totalPages }}
          onPage={(p) => setPage(p)}
        />
      )}
        </AnalysisReveal>
      )}
    </div>
  );
}
