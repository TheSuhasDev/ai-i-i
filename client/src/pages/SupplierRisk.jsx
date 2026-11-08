import { useState, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { insightService, supplierService } from "../services";
import useAnalysis from "../hooks/useAnalysis";
import useFetch from "../hooks/useFetch";
import useToast from "../context/useToast";
import Pill from "../components/Pill";
import MetricCard from "../components/MetricCard";
import { humanize, num, pct } from "../utils/format";
import PageHeader from "../components/PageHeader";
import { exportCsv } from "../utils/exportCsv";
import { AnalysisButton, AnalysisIdle, AnalysisLoader, AnalysisReveal } from "../components/analysis";
import { ChartCard, ChartTooltip, CHART_GRID_PROPS, X_AXIS_PROPS, Y_AXIS_PROPS } from "../components/charts";

const fetchRisk = () => insightService.supplierRisk();
const fetchSuppliers = () => supplierService.list({ limit: 100, sort: "code" });
const PREFERRED = [
  "reliability_score",
  "risk_level",
  "on_time_rate",
  "quality_issue_rate",
  "avg_delay_days",
  "delay_std_days",
  "delivered_pos",
];

const COL_HEADERS = {
  reliability_score: "Reliability Score",
  risk_level: "Risk Level",
  on_time_rate: "On-Time Rate",
  quality_issue_rate: "Quality Issue Rate",
  avg_delay_days: "Avg Delay (Days)",
  delay_std_days: "Delay Std (Days)",
  delivered_pos: "Delivered POs",
};

const COL_DESCRIPTIONS = {
  reliability_score: "Composite performance rating (0–100, higher is better) weighting on-time delivery (40%), delay magnitude (25%), delay variance (20%), and defect rates (15%).",
  risk_level: "Risk tier derived from reliability: Low (≥80), Medium (60–79), High (<60).",
  on_time_rate: "Percentage of delivered orders arriving on or before the expected delivery date.",
  quality_issue_rate: "Percentage of delivered orders flagged with defect or quality issues.",
  avg_delay_days: "Average delay in days for late shipments.",
  delay_std_days: "Standard deviation of shipment delivery variance in days.",
  delivered_pos: "Total number of completed purchase orders evaluated.",
};

function cell(key, v) {
  if (key === "risk_level") return <Pill value={v} />;
  if (key === "on_time_rate" || key === "quality_issue_rate") return pct(v, 1);
  if (key === "delivered_pos") return num(v, 0);
  if (typeof v === "number") return num(v, 1);
  return v ?? "-";
}

export default function SupplierRisk() {
  const navigate = useNavigate();
  const toast = useToast();
  const sup = useFetch(fetchSuppliers);
  const { state, data, error, analyzedAt, run } = useAnalysis(fetchRisk, {
    cacheKey: "supplier-risk",
    onSuccess: () => toast.success("Supplier risk analysis complete"),
  });
  const [showLoader, setShowLoader] = useState(false);
  const [sortBy, setSortBy] = useState("reliability_score");
  const [sortDirection, setSortDirection] = useState("asc");

  const handleAnalyze = useCallback(async () => {
    setShowLoader(true);
    try {
      await run();
    } catch {
      // Handled in useAnalysis
    }
  }, [run]);

  const rows = useMemo(() => data?.data ?? [], [data]);
  const supList = useMemo(() => sup.data?.data ?? [], [sup.data]);
  const names = useMemo(() => Object.fromEntries(supList.map((s) => [s.code, s.name])), [supList]);
  const supMap = useMemo(() => Object.fromEntries(supList.map((s) => [s.code, s])), [supList]);
  
  const cols = useMemo(() => {
    // Exclude redundant risk_score (since risk_level and reliability_score already convey this clearly)
    const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))].filter(
      (k) => k !== "supplier_id" && k !== "risk_score"
    );
    return [...PREFERRED.filter((k) => keys.includes(k)), ...keys.filter((k) => !PREFERRED.includes(k))];
  }, [rows]);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      if (sortBy === "supplier") {
        aVal = `${a.supplier_id} ${names[a.supplier_id] || ""}`.trim();
        bVal = `${b.supplier_id} ${names[b.supplier_id] || ""}`.trim();
        return aVal.localeCompare(bVal) * (sortDirection === "asc" ? 1 : -1);
      }
      if (sortBy === "risk_level") {
        const rank = { High: 0, Medium: 1, Low: 2 };
        aVal = rank[a.risk_level] ?? 99;
        bVal = rank[b.risk_level] ?? 99;
      }
      const aMissing = aVal == null || Number.isNaN(Number(aVal));
      const bMissing = bVal == null || Number.isNaN(Number(bVal));
      if (aMissing !== bMissing) return aMissing ? 1 : -1;
      if (typeof aVal === "string") {
        return aVal.localeCompare(String(bVal)) * (sortDirection === "asc" ? 1 : -1);
      }
      return (Number(aVal) - Number(bVal)) * (sortDirection === "asc" ? 1 : -1);
    });
  }, [rows, sortBy, sortDirection, names]);

  const chartData = useMemo(() => {
    return rows.map((r) => ({
      supplier_id: r.supplier_id,
      name: `${r.supplier_id} ${names[r.supplier_id] || ""}`.trim(),
      onTimePct: Math.round((r.on_time_rate || 0) * 100),
      reliability: Math.round(r.reliability_score || 0),
      risk: r.risk_level,
    }));
  }, [rows, names]);
  const avgReliability = rows.length ? Math.round(rows.reduce((s, r) => s + (r.reliability_score || 0), 0) / rows.length) : 0;
  const avgOnTime = rows.length ? Math.round((rows.reduce((s, r) => s + (r.on_time_rate || 0), 0) / rows.length) * 100) : 0;
  const highRiskCount = rows.filter((r) => r.risk_level === "High").length;
  const belowTargetCount = rows.filter((r) => Math.round((r.on_time_rate || 0) * 100) < 80).length;

  return (
    <div>
      <PageHeader
        title="Supplier Risk"
        subtitle="Supplier reliability scores and delivery performance. Reliability Score (0–100) measures performance; Risk Level categorizes risk. Click a supplier to view delivery history."
        actions={state === "done" && !showLoader && (
          <AnalysisButton onClick={handleAnalyze} isRunning={state === "running"} isDone={true} size="small" />
        )}
      />

      {showLoader ? (
        <AnalysisLoader
          steps={[
            "Fetching purchase order history",
            "Evaluating lead-time variance",
            "Calculating defect rates",
            "Generating reliability scores",
          ]}
          isComplete={state === "done" || state === "error"}
          onComplete={() => setShowLoader(false)}
        />
      ) : state === "error" ? (
        <div className="card" style={{ textAlign: "center", padding: "40px 20px", maxWidth: 640, margin: "32px auto" }}>
          <div className="alert" style={{ marginBottom: 16 }}>Failed to evaluate supplier risk: {error}</div>
          <AnalysisButton onClick={handleAnalyze} label="Retry Analysis" isRunning={state === "running"} />
        </div>
      ) : state === "idle" ? (
        <AnalysisIdle
          icon="🚚"
          title="Analyze Supplier Reliability & Risk"
          description="Evaluate historical lead time consistency, on-time delivery rates, and defect frequencies across all registered vendors."
          buttonLabel="Analyze Supplier Risk"
          onAnalyze={handleAnalyze}
          isRunning={state === "running"}
        />
      ) : (
        <AnalysisReveal analyzedAt={analyzedAt} onRerun={handleAnalyze} isRunning={state === "running"}>
          <div className="cards" style={{ marginBottom: "18px" }}>
            <MetricCard label="Active Suppliers" value={rows.length} sub="Monitored in catalog" tone="tone-healthy" />
            <MetricCard
              label="Average Reliability"
              value={`${avgReliability}/100`}
              sub="Composite rating"
              tone={avgReliability >= 80 ? "tone-healthy" : avgReliability >= 60 ? "tone-warning" : "tone-critical"}
            />
            <MetricCard
              label="Average On-Time Rate"
              value={`${avgOnTime}%`}
              sub="Delivered orders on-time"
              tone={avgOnTime >= 80 ? "tone-healthy" : "tone-warning"}
            />
            <MetricCard
              label="High-Risk Suppliers"
              value={highRiskCount}
              sub="Reliability below 60%"
              tone={highRiskCount ? "tone-critical" : "tone-healthy"}
            />
          </div>

          {rows.length > 0 && (
            <ChartCard
              title="On-Time Delivery Rate by Supplier"
              subtitle="Which suppliers consistently deliver purchase orders before the promised ETA?"
              takeaway={
                belowTargetCount > 0
                  ? `${belowTargetCount} supplier${belowTargetCount > 1 ? "s" : ""} fall below the 80% on-time target. Click any bar to inspect delivery delays.`
                  : "All monitored suppliers meet or exceed the 80% on-time target."
              }
              takeawayTone={belowTargetCount > 0 ? "warning" : "healthy"}
              className="mb-4"
            >
              <div style={{ width: "100%", height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 20, left: 0, bottom: 25 }}
                    onClick={(entry) => {
                      const supplierId = entry?.activePayload?.[0]?.payload?.supplier_id;
                      if (supplierId) {
                        const s = supMap[supplierId];
                        navigate(`/supplier-risk/${s?._id || supplierId}/deliveries`);
                      }
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <CartesianGrid {...CHART_GRID_PROPS} />
                    <XAxis dataKey="name" {...X_AXIS_PROPS} interval={0} angle={-15} textAnchor="end" height={45} tick={{ fontSize: 11 }} />
                    <YAxis {...Y_AXIS_PROPS} unit="%" domain={[0, 100]} width={45} />
                    <Tooltip content={<ChartTooltip formatter={(v) => [`${v}%`, "On-Time Rate"]} />} />
                    <ReferenceLine y={80} stroke="var(--muted)" strokeDasharray="4 4" label={{ value: "80% Target", fill: "var(--muted)", position: "insideTopRight", fontSize: 11 }} />
                    <Bar dataKey="onTimePct" name="On-Time Rate" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                      <LabelList dataKey="onTimePct" position="top" formatter={(v) => `${v}%`} fontSize={10} fill="var(--text)" />
                      {chartData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={entry.risk === "High" ? "var(--danger)" : entry.risk === "Medium" ? "var(--warning)" : "var(--success)"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          )}

          <div className="toolbar">
            <button className="btn" disabled={!rows.length} onClick={() => {
              const supCols = [
                { header: "Supplier", key: "supplier_id", format: (v) => `${v} ${names[v] || ""}`.trim() },
                ...cols.map((c) => ({
                  header: COL_HEADERS[c] || humanize(c),
                  key: c,
                  format: (v) => (
                    c === "on_time_rate" || c === "quality_issue_rate"
                      ? pct(v, 1)
                      : c === "delivered_pos"
                      ? num(v, 0)
                      : typeof v === "number"
                      ? num(v, 1)
                      : v
                  ),
                })),
              ];
              exportCsv("supplier-risk", supCols, sortedRows);
            }}>Export CSV</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>
                    <button
                      type="button"
                      className="sort-button"
                      onClick={() => {
                        if (sortBy === "supplier") setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
                        else {
                          setSortBy("supplier");
                          setSortDirection("asc");
                        }
                      }}
                    >
                      Supplier {sortBy === "supplier" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                    </button>
                  </th>
                  {cols.map((c) => {
                    const isSorted = sortBy === c;
                    return (
                      <th key={c} title={COL_DESCRIPTIONS[c] || COL_HEADERS[c] || humanize(c)} style={{ cursor: COL_DESCRIPTIONS[c] ? "help" : "default" }}>
                        <button
                          type="button"
                          className="sort-button"
                          onClick={() => {
                            if (sortBy === c) setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
                            else {
                              setSortBy(c);
                              setSortDirection(c === "reliability_score" || c === "on_time_rate" ? "asc" : "desc");
                            }
                          }}
                        >
                          {COL_HEADERS[c] || humanize(c)} {isSorted ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                        </button>
                        {COL_DESCRIPTIONS[c] && <span style={{ opacity: 0.5, marginLeft: 4, fontSize: "0.8em" }}>ℹ</span>}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {sortedRows.length === 0 ? (
                  <tr><td colSpan={cols.length + 1} className="center">No supplier risk data is available yet.</td></tr>
                ) : (
                  sortedRows.map((r) => {
                    const s = supMap[r.supplier_id];
                    const targetId = s?._id || r.supplier_id;
                    return (
                      <tr
                        key={r.supplier_id}
                        onClick={() => navigate(`/supplier-risk/${targetId}/deliveries`)}
                        style={{ cursor: "pointer" }}
                        title="Click to view delivery history"
                      >
                        <td>
                          <Link
                            to={`/supplier-risk/${targetId}/deliveries`}
                            onClick={(e) => e.stopPropagation()}
                            style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}
                          >
                            {r.supplier_id} {names[r.supplier_id]}
                          </Link>
                        </td>
                        {cols.map((c) => <td key={c}>{cell(c, r[c])}</td>)}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </AnalysisReveal>
      )}
    </div>
  );
}
