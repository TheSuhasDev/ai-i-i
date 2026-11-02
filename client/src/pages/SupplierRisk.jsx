import { useNavigate, Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { insightService, supplierService } from "../services";
import useFetch from "../hooks/useFetch";
import Pill from "../components/Pill";
import MetricCard from "../components/MetricCard";
import { humanize, num, pct } from "../utils/format";
import PageHeader from "../components/PageHeader";
import { exportCsv } from "../utils/exportCsv";

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

const COL_DESCRIPTIONS = {
  reliability_score: "Composite performance rating (0–100, higher is better) based on lead time consistency and defect rates.",
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
  if (typeof v === "number") return num(v, 1);
  return v ?? "-";
}

export default function SupplierRisk() {
  const navigate = useNavigate();
  const risk = useFetch(fetchRisk);
  const sup = useFetch(fetchSuppliers);

  const rows = risk.data?.data ?? [];
  const supList = sup.data?.data ?? [];
  const names = Object.fromEntries(supList.map((s) => [s.code, s.name]));
  const supMap = Object.fromEntries(supList.map((s) => [s.code, s]));
  // Exclude redundant risk_score (since risk_level and reliability_score already convey this clearly)
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))].filter(
    (k) => k !== "supplier_id" && k !== "risk_score"
  );
  const cols = [...PREFERRED.filter((k) => keys.includes(k)), ...keys.filter((k) => !PREFERRED.includes(k))];

  const chartData = rows.map((r) => ({
    name: `${r.supplier_id} ${names[r.supplier_id] || ""}`,
    onTimePct: Math.round((r.on_time_rate || 0) * 100),
    reliability: Math.round(r.reliability_score || 0),
    risk: r.risk_level,
  }));
  const avgReliability = rows.length ? Math.round(rows.reduce((s, r) => s + (r.reliability_score || 0), 0) / rows.length) : 0;
  const highRiskCount = rows.filter((r) => r.risk_level === "High").length;

  return (
    <div>
      <PageHeader
        title="Supplier Risk"
        subtitle="Supplier reliability scores and delivery performance. Reliability Score (0–100) measures performance; Risk Level categorizes risk. Click a supplier to view delivery history."
      />

      <div className="cards" style={{ marginBottom: "18px" }}>
        <MetricCard label="Active Suppliers" value={rows.length} sub="Monitored in catalog" tone="tone-healthy" />
        <MetricCard label="Average Reliability" value={`${avgReliability}/100`} sub="Composite score" tone="tone-healthy" />
        <MetricCard label="High-Risk Suppliers" value={highRiskCount} sub="Reliability below 60%" tone={highRiskCount ? "tone-critical" : "tone-healthy"} />
      </div>

      {rows.length > 0 && (
        <section className="card" style={{ marginBottom: "18px" }}>
          <h3>On-Time Delivery Rate by Supplier (%)</h3>
          <div style={{ width: "100%", height: 220, marginTop: "12px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="name" interval={0} angle={-15} textAnchor="end" height={45} tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => [`${value}%`, "On-Time Rate"]} />
                <Bar dataKey="onTimePct" name="On-Time Rate %" radius={[4, 4, 0, 0]}>
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
        </section>
      )}

      {risk.error && <div className="alert">{risk.error}</div>}
      <div className="toolbar">
        <button className="btn" disabled={!rows.length} onClick={() => {
          const supCols = [
            { header: "Supplier", key: "supplier_id", format: (v) => `${v} ${names[v] || ""}`.trim() },
            ...cols.map((c) => ({
              header: humanize(c),
              key: c,
              format: (v) => (c === "on_time_rate" || c === "quality_issue_rate" ? pct(v, 1) : v),
            })),
          ];
          exportCsv("supplier-risk", supCols, rows);
        }}>Export CSV</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Supplier</th>
              {cols.map((c) => (
                <th key={c} title={COL_DESCRIPTIONS[c] || humanize(c)} style={{ cursor: COL_DESCRIPTIONS[c] ? "help" : "default" }}>
                  {humanize(c)}
                  {COL_DESCRIPTIONS[c] && <span style={{ opacity: 0.5, marginLeft: 4, fontSize: "0.8em" }}>ℹ</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {risk.loading ? (
              <tr><td colSpan={cols.length + 1} className="center">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={cols.length + 1} className="center">No supplier risk data is available yet.</td></tr>
            ) : (
              rows.map((r) => {
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
    </div>
  );
}
