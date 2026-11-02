import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import useAuth from "../context/useAuth";
import useAnalysis from "../hooks/useAnalysis";
import useToast from "../context/useToast";
import { insightService } from "../services";
import ForecastChart from "../components/ForecastChart";
import Pill from "../components/Pill";
import { humanize, num } from "../utils/format";
import WhyPanel from "../components/WhyPanel";
import PageHeader from "../components/PageHeader";
import StaleDataBanner from "../components/StaleDataBanner";
import MetricCard from "../components/MetricCard";
import Icon from "../components/Icon";
import ProductThumb from "../components/ProductThumb";
import { AnalysisButton, AnalysisIdle, AnalysisLoader, AnalysisReveal } from "../components/analysis";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const DESCRIPTION = {
  stock: "Units currently available in inventory.",
  on_order: "Units on open purchase orders.",
  safety_stock: "Buffer units kept to reduce stockout risk.",
  days_of_cover: "Estimated days current stock can meet demand.",
  days_to_delivery: "Expected time until the next supplier delivery.",
  risk_pct: "Estimated chance of a stockout during the planning window.",
  supplier_reliability: "Historical share of supplier deliveries received on time.",
};
const unitFor = (key) => /days|lead_time/i.test(key) ? " days" : /qty|quantity|stock|units|demand|received|ordered/i.test(key) ? " units" : /pct|percent/i.test(key) ? "%" : "";
const val = (key, v) => (v == null ? "-" : typeof v === "object" ? JSON.stringify(v) : typeof v === "number" ? `${num(v, 2)}${unitFor(key)}` : String(v));

function KeyValues({ obj }) {
  return (
    <dl className="kv">
      {Object.entries(obj || {}).map(([k, v]) => (
        <div key={k}><dt title={DESCRIPTION[k] || `${humanize(k)} from the product inventory and supplier data.`}>{humanize(k)}</dt><dd>{val(k, v)}</dd></div>
      ))}
    </dl>
  );
}

function ScoreBar({ label, value }) {
  return (
    <div className="scorebar">
      <span>{label}</span>
      <div className="bar"><div style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }} /></div>
      <span>{num(value, 0)}</span>
    </div>
  );
}

function ProductInsight({ code }) {
  const { canWrite } = useAuth();
  const toast = useToast();
  const fetchAll = useCallback(async () => {
    const [ins, hist] = await Promise.all([
      insightService.get(code),
      insightService.history(code, 52).catch(() => ({ data: { data: [] } })),
    ]);
    return { insight: ins.data?.data, history: hist.data?.data?.weeks ?? [] };
  }, [code]);

  const { state, data, error, analyzedAt, run } = useAnalysis(fetchAll, {
    cacheKey: `product-insight-${code}`,
    onSuccess: () => toast.success(`Intelligence analysis for ${code} complete`),
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

  const d = data?.insight;
  const historyWeeks = data?.history ?? [];

  useEffect(() => {
    if (d?.name) {
      document.title = `${d.name} (${d.product_id}) · AI Inventory Intelligence`;
    }
  }, [d?.name, d?.product_id]);

  if (showLoader) {
    return (
      <div>
        <PageHeader title={code} subtitle="Product deep intelligence analysis" />
        <AnalysisLoader
          steps={[
            "Querying inventory balance & transit orders",
            "Running 4-week ARIMA/ML demand forecasts",
            "Calculating stockout risk & safety stock cover",
            "Synthesizing explainable AI drivers",
          ]}
          isComplete={state === "done" || state === "error"}
          onComplete={() => setShowLoader(false)}
        />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div>
        <PageHeader title={code} subtitle="Product deep intelligence analysis" />
        <div className="card" style={{ textAlign: "center", padding: "40px 20px", maxWidth: 640, margin: "32px auto" }}>
          <div className="alert" style={{ marginBottom: 16 }}>Failed to load product analysis: {error}</div>
          <AnalysisButton onClick={handleAnalyze} label="Retry Analysis" isRunning={state === "running"} />
          <div style={{ marginTop: 16 }}>
            <Link to="/" className="btn secondary small">Back to dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  if (state === "idle" || !d) {
    return (
      <div>
        <PageHeader title={code} subtitle="Product deep intelligence analysis" />
        <AnalysisIdle
          icon="🔍"
          title={`Deep Intelligence Analysis for ${code}`}
          description="Synthesize multi-horizon demand forecasting, stockout probability, buffer stock thresholds, and explainable AI risk factors for this SKU."
          buttonLabel="Analyze Product"
          onAnalyze={handleAnalyze}
          isRunning={state === "running"}
        />
      </div>
    );
  }

  const po = `/purchase-orders/new?productCode=${d.product_id}&supplierCode=${d.reorder.supplier_id}&qty=${d.reorder.order_qty}`;

  return (
    <div>
      <AnalysisReveal analyzedAt={analyzedAt} onRerun={handleAnalyze} isRunning={state === "running"}>
        <PageHeader title={<span className="product-detail-title"><ProductThumb product={d} size="xl" /><span>{d.name}</span></span>} subtitle={d.product_id} actions={
          <>
            <Pill value={d.priority} />
            <Pill value={d.health.status} />
            <Pill value={d.classification?.abc_xyz} title="ABC ranks value contribution; XYZ describes demand variability." />
            <Link className="btn small" to={`/simulator?product=${d.product_id}`}>What-if</Link>
            <AnalysisButton onClick={handleAnalyze} isRunning={state === "running"} isDone={true} size="small" />
          </>
        } />
      <StaleDataBanner date={d?.inputs?.data_as_of || d?.data_as_of || d?.as_of} daysOld={d?.inputs?.data_age_days} />

      <div className="cards">
        <MetricCard label="Health score" value={num(d.health.score, 0)} sub={`out of 100 · ${d.health.status}`} icon="shield" progress={d.health.score} tone={d.health.score < 40 ? "tone-critical" : d.health.score < 70 ? "tone-warning" : "tone-healthy"} />
        <MetricCard label="Stockout risk" value={`${num(d.risk.risk_pct, 0)}%`} sub={d.risk.risk_level} icon="alert" progress={d.risk.risk_pct} tone="tone-critical" />
        <MetricCard label="Days of stock left" value={num(d.stockout.days_of_cover, 1)} sub={`Delivery in ${num(d.stockout.days_to_delivery, 1)} days`} icon="clock" tone={d.stockout.days_of_cover < d.stockout.days_to_delivery ? "tone-critical" : "tone-healthy"} />
        <MetricCard label="Recommended order" value={d.reorder.order_qty} sub="units" icon="package" />
      </div>

      <div className="card comparison-card">
        <h3>Stock cover vs delivery time</h3>
        <div className={`cover-comparison ${d.stockout.days_of_cover < d.stockout.days_to_delivery ? "short" : "safe"}`}>
          <span>Stock: {num(d.stockout.days_of_cover, 1)} days</span><span>Delivery: {num(d.stockout.days_to_delivery, 1)} days</span>
          <div className="cover-track"><span style={{ width: `${Math.min(100, (d.stockout.days_of_cover / Math.max(d.stockout.days_to_delivery, 1)) * 100)}%` }} /></div>
        </div>
        <h4>Stock vs reorder point</h4>
        <div className="stock-point" title={`Current stock ${num(d.inputs.stock, 0)} units; reorder point ${num(d.reorder.reorder_point, 0)} units`}>
          <span style={{ width: `${Math.min(100, Math.max(0, (Number(d.inputs.stock || 0) / Math.max(Number(d.reorder.reorder_point || 0) * 1.5, 1)) * 100))}%` }} />
          <i style={{ left: `${Math.min(100, (d.reorder.reorder_point / Math.max(d.reorder.reorder_point * 1.5, 1)) * 100)}%` }} />
        </div>
        <p className="muted small">Current stock {num(d.inputs.stock, 0)} units · reorder point {num(d.reorder.reorder_point, 0)} units</p>
      </div>

      <div className="card">
        <h3>Forecast</h3>
        <ForecastChart history={historyWeeks} forecast={d.forecast.weeks} />
        <p className="muted small">
          Demand over the {d.forecast.lead_time_days}-day lead time: {num(d.forecast.lead_time_demand, 0)} units
          (cautious estimate {num(d.forecast.lead_time_demand_high, 0)}). Forecast assumes no promotions.
        </p>
      </div>

      <WhyPanel code={d.product_id} />

      <TrendSeasonality trend={d.trend} />

      <div className="grid2">
        <div className="card">
          <h3>Alerts</h3>
          {d.alerts.length === 0 ? <p className="muted">No active alerts.</p> : (
            <ul className="plain">
              {d.alerts.map((a, i) => (
                <li key={i}><Pill value={a.priority} /> {a.message}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <h3>Stock and delivery</h3>
          <KeyValues obj={{ ...d.inputs, ...d.stockout }} />
        </div>
        <div className="card">
          <h3>Health breakdown</h3>
          <ScoreBar label="Stock cover" value={d.health.components.cover} />
          <ScoreBar label="Low stockout risk" value={d.health.components.risk} />
          <ScoreBar label="Supplier reliability" value={d.health.components.supplier} />
          <ScoreBar label="Demand stability" value={d.health.components.stability} />
        </div>
        <div className="card">
          <h3>Risk signals</h3>
          <KeyValues obj={d.risk.signals} />
        </div>
        <div className="card">
          <h3>Reorder recommendation</h3>
          <KeyValues obj={d.reorder} />
          {canWrite && d.reorder.order_qty > 0 && <Link className="btn primary" to={po}>Create purchase order</Link>}
        </div>
        <div className="card">
          <h3>Supplier</h3>
          <KeyValues obj={d.supplier} />
        </div>
      </div>
      </AnalysisReveal>
    </div>
  );
}

export default function ProductInsightPage() {
  const { code } = useParams();
  return <ProductInsight key={code} code={code} />;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LONG_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function TrendSeasonality({ trend }) {
  if (!trend) {
    return (
      <section className="card trend-panel">
        <h3>Trend &amp; Seasonality</h3>
        <p className="muted">Trend data is not available yet. Refresh insights to compute it.</p>
      </section>
    );
  }

  const weekly = Array.isArray(trend.weekly_series) ? trend.weekly_series : [];
  const monthly = Array.isArray(trend.monthly_index)
    ? trend.monthly_index.map((index, i) => ({ month: MONTHS[i], index }))
    : [];
  const joinedPattern = trend.pattern?.includes("+ seasonal");
  const badgeLabel = joinedPattern ? "trend+seasonal" : trend.pattern || "unknown";
  const badgeClass = joinedPattern ? "trend-seasonal" : (trend.pattern || "unknown").replaceAll(" ", "-");
  const yoy = Number(trend.yoy_change_pct || 0);
  const signedYoy = `${yoy > 0 ? "+" : ""}${num(yoy, 1)}%`;
  const peakMonth = trend.peak_month
    ? LONG_MONTHS[MONTHS.indexOf(trend.peak_month)] || trend.peak_month
    : null;
  const peakUplift = trend.peak_uplift_pct == null ? null : `${num(trend.peak_uplift_pct, 1)}%`;
  const direction = trend.trend === "increasing" ? "rising" : trend.trend === "decreasing" ? "falling" : "broadly stable";
  const summary = trend.seasonal && peakMonth
    ? `Demand is ${direction} ${num(Math.abs(yoy), 1)}% year over year, peaking in ${peakMonth}${peakUplift ? ` (+${peakUplift})` : ""}.`
    : `Demand is ${direction} year over year (${signedYoy}), with no recurring seasonal peak detected.`;

  return (
    <section className="card trend-panel">
      <div className="trend-title-row">
        <h3>Trend &amp; Seasonality</h3>
        <span className={`trend-pattern trend-pattern-${badgeClass}`}><Icon name={trend.trend === "decreasing" ? "down" : trend.trend === "increasing" ? "trend" : trend.seasonal ? "layers" : "info"} size={13} />{badgeLabel}</span>
      </div>
      <div className="trend-highlights">
        <div><span className="muted small">Year over year</span><strong>{signedYoy}</strong></div>
        <div><span className="muted small">Seasonal peak</span><strong>{peakMonth ? `${peakMonth}${peakUplift ? ` · +${peakUplift}` : ""}` : "Not detected"}</strong></div>
      </div>
      <p className="trend-summary">{summary}</p>
      <div className="grid2 trend-charts">
        <div>
          <h4>Weekly demand · {weekly.length} weeks</h4>
          {weekly.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={weekly} margin={{ top: 10, right: 15, bottom: 20, left: 15 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="week_start" tickFormatter={(d) => d.slice(5)} minTickGap={28} stroke="var(--muted)" label={{ value: "Week (YYYY-MM-DD)", position: "insideBottom", offset: -12, fill: "var(--muted)", fontSize: 11 }} />
                <YAxis width={52} stroke="var(--muted)" unit=" u" label={{ value: "Demand (units)", angle: -90, position: "insideLeft", offset: 12, fill: "var(--muted)", fontSize: 11, textAnchor: "middle" }} />
                <Tooltip labelFormatter={(d) => `Week of ${d}`} formatter={(v) => [`${num(v, 0)} units`, "Demand"]} />
                <Legend verticalAlign="top" height={32} wrapperStyle={{ fontSize: 12 }} />
                <Line dataKey="units" name="Weekly Demand (units)" stroke="var(--chart-1)" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="muted">Weekly trend history is empty.</p>}
        </div>
        <div>
          <h4>Seasonality by month · index (1.0 = average)</h4>
          {monthly.length === 12 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthly} margin={{ top: 10, right: 15, bottom: 20, left: 15 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="month" stroke="var(--muted)" label={{ value: "Month", position: "insideBottom", offset: -12, fill: "var(--muted)", fontSize: 11 }} />
                <YAxis width={48} stroke="var(--muted)" label={{ value: "Index (1.0 = Average)", angle: -90, position: "insideLeft", offset: 12, fill: "var(--muted)", fontSize: 11, textAnchor: "middle" }} />
                <Tooltip formatter={(value) => [`${num(value, 2)} (ratio to avg)`, "Monthly Index"]} />
                <Legend verticalAlign="top" height={32} wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine y={1} stroke="var(--danger)" strokeDasharray="5 4" label="Average (1.0)" />
                <Bar dataKey="index" name="Monthly Seasonality Index" fill="var(--chart-1)" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="muted">Monthly seasonality data is empty or incomplete.</p>}
        </div>
      </div>
    </section>
  );
}
