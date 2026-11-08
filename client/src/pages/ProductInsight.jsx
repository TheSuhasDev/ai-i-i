import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import useAuth from "../context/useAuth";
import useAnalysis from "../hooks/useAnalysis";
import useToast from "../context/useToast";
import { insightService, productService } from "../services";
import ForecastChart from "../components/ForecastChart";
import Pill from "../components/Pill";
import {
  fmtDays,
  fmtPct,
  fmtRatio,
  fmtRatioAsPct,
  fmtRiskPct,
  fmtSupplierName,
  fmtUnits,
  fmtUnitsPerDay,
  formatDate,
  formatMarginSigned,
  formatWeekTick,
  money,
  num,
} from "../utils/format";
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
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartCard, ChartTooltip, CHART_GRID_PROPS, X_AXIS_PROPS, Y_AXIS_PROPS } from "../components/charts";

function HealthBreakdownCard({ health }) {
  const components = health?.components || {};
  const items = [
    { label: "Stock cover", key: "cover", weight: 55, score: components.cover ?? 0 },
    { label: "Stockout safety", key: "risk", weight: 15, score: components.risk ?? 0 },
    { label: "Supplier reliability", key: "supplier", weight: 15, score: components.supplier ?? 0 },
    { label: "Demand stability", key: "stability", weight: 15, score: components.stability ?? 0 },
  ];

  const totalScore = health?.score ?? 0;
  const status = health?.status || "Unknown";

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <h3 style={{ margin: 0 }}>Health breakdown</h3>
        <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Weighted score: <strong>{num(totalScore, 0)}/100</strong></span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {items.map((item) => {
          const weightedPts = ((item.score / 100) * item.weight).toFixed(1);
          const toneColor =
            item.score < 40 ? "var(--danger, #ef4444)" : item.score < 70 ? "var(--warning, #f59e0b)" : "var(--success, #10b981)";

          return (
            <div key={item.key} style={{ background: "var(--surface-raised, #171c27)", padding: "8px 12px", borderRadius: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", marginBottom: "4px" }}>
                <span>
                  <strong>{item.label}</strong>{" "}
                  <span className="muted" style={{ fontSize: "11px" }}>({item.weight}% weight)</span>
                </span>
                <span>
                  <strong>{num(item.score, 0)}/100</strong>{" "}
                  <span className="muted" style={{ fontSize: "11px" }}>({weightedPts} pts)</span>
                </span>
              </div>
              <div style={{ width: "100%", height: "6px", background: "var(--border, #252b39)", borderRadius: "3px", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${Math.min(100, Math.max(0, item.score))}%`,
                    height: "100%",
                    background: toneColor,
                    borderRadius: "3px",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "12px",
          paddingTop: "10px",
          borderTop: "1px solid var(--border)",
        }}
      >
        <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Total Health Score</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
          <strong style={{ fontSize: "1.1rem" }}>{num(totalScore, 0)}/100</strong>
          <Pill value={status} />
        </span>
      </div>
    </div>
  );
}

function ProductInsight({ code }) {
  const { canWrite } = useAuth();
  const toast = useToast();
  const [productInfo, setProductInfo] = useState(null);
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    productService
      .list({ search: code })
      .then((res) => {
        const list = res.data?.data || [];
        const match = list.find((p) => p.code?.toUpperCase() === code?.toUpperCase()) || list[0];
        if (match) setProductInfo(match);
      })
      .catch(() => {});
  }, [code]);

  const fetchAll = useCallback(async () => {
    const [ins, hist] = await Promise.all([
      insightService.get(code),
      insightService.history(code, 52).catch(() => ({ data: { data: [] } })),
    ]);
    return { insight: ins.data?.data, history: hist.data?.data?.weeks ?? [] };
  }, [code]);

  const { state, data, error, analyzedAt, run } = useAnalysis(fetchAll, {
    cacheKey: `product-insight-${code}`,
  });

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

  const handleLoaderComplete = useCallback(() => {
    setShowLoader(false);
    toast.success(`Intelligence analysis for ${d?.name || productInfo?.name || code} complete`);
  }, [code, d?.name, productInfo?.name, toast]);

  useEffect(() => {
    if (d?.name) {
      document.title = `${d.name} (${d.product_id}) · Replenix`;
    }
  }, [d?.name, d?.product_id]);

  if (showLoader) {
    const displayName = productInfo?.name || d?.name || code;
    return (
      <div>
        <PageHeader
          title={
            <div className="product-detail-header-block">
              <ProductThumb product={productInfo || d || { code, name: displayName }} size="xl" />
              <div className="product-detail-meta-col">
                <h2 className="product-detail-name">{displayName}</h2>
                <div className="product-detail-sku muted small">
                  Product Code: <strong>{code}</strong>
                </div>
              </div>
            </div>
          }
          subtitle=""
        />
        <AnalysisLoader
          steps={[
            "Querying inventory balance & transit orders",
            "Running Gradient-boosting demand forecast (1-3 weeks)",
            "Calculating stockout risk & safety stock cover",
            "Synthesizing explainable AI drivers",
          ]}
          isComplete={state === "done" || state === "error"}
          onComplete={handleLoaderComplete}
        />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div>
        <PageHeader title={code} subtitle="Product deep intelligence analysis" />
        <div className="card" style={{ textAlign: "center", padding: "40px 20px", maxWidth: 640, margin: "32px auto" }}>
          <div className="alert" style={{ marginBottom: 16 }}>
            Failed to load product analysis: {error}
          </div>
          <AnalysisButton onClick={handleAnalyze} label="Retry Analysis" isRunning={state === "running"} />
          <div style={{ marginTop: 16 }}>
            <Link to="/" className="btn secondary small">
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (state === "idle" || !d) {
    const idleName = productInfo?.name || code;
    return (
      <div>
        <PageHeader
          title={
            <div className="product-detail-header-block">
              <ProductThumb product={productInfo || { code, name: idleName }} size="xl" />
              <div className="product-detail-meta-col">
                <h2 className="product-detail-name">{idleName}</h2>
                <div className="product-detail-sku muted small">
                  Product Code: <strong>{code}</strong>
                </div>
              </div>
            </div>
          }
          subtitle=""
        />
        <AnalysisIdle
          icon="🔍"
          title={`Deep Intelligence Analysis for ${idleName}`}
          description="Synthesize multi-horizon demand forecasting, stockout probability, buffer stock thresholds, and explainable AI risk factors for this SKU."
          buttonLabel="Analyze Product"
          onAnalyze={handleAnalyze}
          isRunning={state === "running"}
        />
      </div>
    );
  }

  const primarySupId = d.supplier?.id || d.reorder?.supplier_id;
  const primarySupName = fmtSupplierName(primarySupId, d.supplier?.name || d.reorder?.supplier_name);
  const altSup = d.reorder?.alternate_supplier;
  const po = `/purchase-orders/new?productCode=${d.product_id}&supplierCode=${primarySupId}&qty=${d.reorder?.order_qty || 1}`;

  const leadTimeDemand = d.reorder?.demand_over_lead_time ?? d.forecast?.lead_time_demand;
  const onOrderQty = Number(d.inputs?.on_order || 0);
  const deliveryDateLabel = onOrderQty > 0 ? "Expected delivery date" : "Earliest delivery if ordered today";

  const marginDays = d.stockout?.margin_days;
  const isCoverShort =
    marginDays != null
      ? marginDays < 0
      : (d.stockout?.days_of_cover ?? 0) < (d.stockout?.days_to_delivery ?? 0);
  const isCoverTight =
    !isCoverShort &&
    (marginDays != null
      ? marginDays < 5
      : (d.stockout?.days_of_cover ?? 0) - (d.stockout?.days_to_delivery ?? 0) < 5);

  return (
    <div>
      <AnalysisReveal analyzedAt={analyzedAt} onRerun={handleAnalyze} isRunning={state === "running"}>
        <PageHeader
          title={
            <div className="product-detail-header-block">
              <ProductThumb product={d} size="xl" />
              <div className="product-detail-meta-col">
                <h2 className="product-detail-name">{d.name}</h2>
                <div className="product-detail-sku muted small">
                  Product Code: <strong>{d.product_id}</strong>
                  {d.sku ? <> · SKU: <strong>{d.sku}</strong></> : null}
                </div>
                <div className="product-detail-badges-row">
                  <span className="meta-item">
                    <span className="meta-label">Category:</span>{" "}
                    <span className="meta-value">{d.category || productInfo?.category || "-"}</span>
                  </span>
                  <span className="meta-item">
                    <span className="meta-label">Unit Price:</span>{" "}
                    <span className="meta-value">{money(d.price ?? d.unit_price ?? productInfo?.price)}</span>
                  </span>
                  <span className="meta-item">
                    <span className="meta-label">MOQ:</span>{" "}
                    <span className="meta-value">{fmtUnits(d.moq ?? d.reorder?.moq ?? 10)}</span>
                  </span>
                  <span className="meta-item">
                    <span className="meta-label">Lead Time:</span>{" "}
                    <span className="meta-value">
                      {fmtDays(
                        d.lead_time_days ??
                          d.inputs?.lead_time_days ??
                          d.forecast?.lead_time_days ??
                          productInfo?.leadTimeDays,
                        0
                      )}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          }
          subtitle=""
          actions={
            <>
              <Pill value={d.priority} label={`Priority: ${d.priority}`} />
              <Pill value={d.health?.status} label={`Health: ${d.health?.status}`} />
              <Pill
                value={d.classification?.abc_xyz}
                label={`Class ${d.classification?.abc_xyz || "-"}`}
                title="ABC ranks value contribution; XYZ describes demand variability."
              />
              <Link className="btn small" to={`/simulator?product=${d.product_id}`}>
                What-if
              </Link>
              {canWrite && d.reorder?.order_qty > 0 && (
                <Link className="btn primary small" to={po}>
                  Create purchase order
                </Link>
              )}
              <AnalysisButton onClick={handleAnalyze} isRunning={state === "running"} isDone={true} size="small" />
            </>
          }
        />

        <StaleDataBanner date={d?.dataAsOf || d?.data_as_of || d?.inputs?.data_as_of || d?.as_of} />

        <div className="cards">
          <MetricCard
            label="Health score"
            value={num(d.health?.score, 0)}
            sub={`out of 100 · ${d.health?.status || "-"}`}
            icon="shield"
            progress={d.health?.score}
            tone={d.health?.score < 40 ? "tone-critical" : d.health?.score < 70 ? "tone-warning" : "tone-healthy"}
          />
          <MetricCard
            label="Stockout risk"
            value={fmtRiskPct(d.risk?.risk_pct)}
            sub={d.risk?.risk_level || "-"}
            icon="alert"
            progress={d.risk?.risk_pct}
            tone="tone-critical"
          />
          <MetricCard
            label="Days of stock left"
            value={num(d.stockout?.days_of_cover, 1)}
            sub={
              d.stockout?.is_overdue
                ? `PO overdue by ${d.stockout.overdue_days}d`
                : `Delivery in ${num(d.stockout?.days_to_delivery, 1)} days`
            }
            icon="clock"
            tone={isCoverShort ? "tone-critical" : "tone-healthy"}
          />
          <MetricCard
            label="Recommended order"
            value={num(d.reorder?.order_qty, 0)}
            sub="units"
            icon="package"
          />
        </div>

        {/* Real Visual Gauge Bars: Stock Cover vs Delivery Time & Stock vs Reorder Point */}
        <div className="card comparison-card" style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "18px 20px" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 600 }}>Stock Cover vs Delivery Lead Time</h3>
              <span
                className={`pill ${isCoverShort ? "status-critical" : isCoverTight ? "status-warning" : "status-healthy"}`}
                style={{ fontSize: "12px", fontWeight: 600 }}
              >
                {isCoverShort
                  ? `${d.stockout?.days_of_cover ?? 0} days of stock vs ${d.stockout?.days_to_delivery ?? 0} days to delivery (Short)`
                  : isCoverTight
                  ? `${d.stockout?.days_of_cover ?? 0} days of stock vs ${d.stockout?.days_to_delivery ?? 0} days to delivery (Tight buffer)`
                  : `${d.stockout?.days_of_cover ?? 0} days of stock vs ${d.stockout?.days_to_delivery ?? 0} days to delivery (Safe buffer)`}
              </span>
            </div>
            <p className="muted small" style={{ margin: "0 0 10px 0" }}>
              {isCoverShort
                ? `Critical deficit: Stock will run out in ${fmtDays(d.stockout?.days_of_cover, 1)}, but replenishment arrives in ${fmtDays(d.stockout?.days_to_delivery, 1)} (short by ${fmtDays(Math.abs(d.stockout?.margin_days || 0), 1)}).`
                : isCoverTight
                ? `Tight buffer: Existing inventory sustains operations for ${fmtDays(d.stockout?.days_of_cover, 1)}, leaving only ${fmtDays(d.stockout?.margin_days, 1)} margin past the ${fmtDays(d.stockout?.days_to_delivery, 1)} delivery arrival.`
                : `Safe buffer: Existing inventory sustains operations for ${fmtDays(d.stockout?.days_of_cover, 1)}, well past the ${fmtDays(d.stockout?.days_to_delivery, 1)} delivery arrival.`}
            </p>
            <div
              style={{
                width: "100%",
                height: "14px",
                background: "var(--border, #252b39)",
                borderRadius: "7px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, Math.max(0, ((d.stockout?.days_of_cover || 0) / Math.max(d.stockout?.days_to_delivery || 1, 1)) * 100))}%`,
                  height: "100%",
                  background: isCoverShort ? "var(--danger, #ef4444)" : "var(--success, #10b981)",
                  borderRadius: "7px",
                  transition: "width 300ms ease",
                }}
              />
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600 }}>Stock on Hand vs Reorder Threshold</h4>
              <span
                className={`pill ${Number(d.inputs?.stock || 0) < Number(d.reorder?.reorder_point || 0) ? "status-warning" : "status-healthy"}`}
                style={{ fontSize: "11px", fontWeight: 600 }}
              >
                {Number(d.inputs?.stock || 0) < Number(d.reorder?.reorder_point || 0) ? "Below reorder point" : "Sufficient stock"}
              </span>
            </div>
            <p className="muted small" style={{ margin: "0 0 10px 0" }}>
              Current stock: <strong>{fmtUnits(d.inputs?.stock, 0)}</strong> · Reorder threshold: <strong>{fmtUnits(d.reorder?.reorder_point, 0)}</strong> (incl. safety buffer {fmtUnits(d.reorder?.safety_stock, 0)}).
            </p>
            <div
              style={{
                width: "100%",
                height: "14px",
                background: "var(--surface-raised, #171c27)",
                border: "1px solid var(--border-strong, #363e50)",
                borderRadius: "7px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, Math.max(0, (Number(d.inputs?.stock || 0) / Math.max(Number(d.reorder?.reorder_point || 1) * 1.4, 1)) * 100))}%`,
                  height: "100%",
                  background:
                    Number(d.inputs?.stock || 0) <= Number(d.reorder?.safety_stock || 0)
                      ? "var(--danger, #ef4444)"
                      : Number(d.inputs?.stock || 0) < Number(d.reorder?.reorder_point || 0)
                      ? "var(--warning, #f59e0b)"
                      : "var(--success, #10b981)",
                  borderRadius: "7px",
                }}
              />
              <div
                title="Reorder point marker"
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: `${Math.min(100, (Number(d.reorder?.reorder_point || 0) / Math.max(Number(d.reorder?.reorder_point || 1) * 1.4, 1)) * 100)}%`,
                  width: "2px",
                  background: "var(--text, #ffffff)",
                  boxShadow: "0 0 4px rgba(0,0,0,0.8)",
                }}
              />
            </div>
          </div>
        </div>

        {/* Forecast Chart */}
        <ForecastChart
          history={historyWeeks}
          forecast={d.forecast?.weeks}
          leadTimeDays={d.forecast?.lead_time_days || d.lead_time_days || d.inputs?.lead_time_days}
          leadTimeDemand={leadTimeDemand}
          leadTimeDemandHigh={d.forecast?.lead_time_demand_high}
        />

        <WhyPanel code={d.product_id} />

        <TrendSeasonality trend={d.trend} />

        <div className="grid2">
          <div className="card">
            <h3>Alerts</h3>
            {!d.alerts || d.alerts.length === 0 ? (
              <p className="muted">
                No active alerts for this product. Inventory levels and supplier metrics are within normal thresholds.
              </p>
            ) : (
              <ul className="plain">
                {d.alerts.map((a, i) => (
                  <li key={i}>
                    <Pill value={a.priority} /> {a.message}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card">
            <h3>Stock and delivery</h3>
            <dl className="kv">
              <div>
                <dt>Current stock</dt>
                <dd>{fmtUnits(d.inputs?.stock, 0)}</dd>
              </div>
              <div>
                <dt>On order (in transit)</dt>
                <dd>{fmtUnits(d.inputs?.on_order, 0)}</dd>
              </div>
              <div>
                <dt>Effective lead time</dt>
                <dd>{fmtDays(d.stockout?.effective_lead_time_days ?? d.reorder?.effective_lead_time_days ?? d.inputs?.effective_lead_time_days ?? d.inputs?.lead_time_days, 1)}</dd>
              </div>
              <div>
                <dt>Expected stockout date</dt>
                <dd>{formatDate(d.stockout?.expected_stockout_date)}</dd>
              </div>
              <div>
                <dt>{deliveryDateLabel}</dt>
                <dd>{formatDate(d.stockout?.expected_delivery_date)}</dd>
              </div>
              <div>
                <dt>Days to delivery</dt>
                <dd>{d.stockout?.days_to_delivery != null ? fmtDays(d.stockout.days_to_delivery, 1) : "-"}</dd>
              </div>
              <div>
                <dt>Cover margin</dt>
                <dd>
                  {d.stockout?.margin_days != null
                    ? d.stockout.margin_days < 0
                      ? `${formatMarginSigned(d.stockout.margin_days)} days (short by ${fmtDays(Math.abs(d.stockout.margin_days), 1)})`
                      : d.stockout.margin_days < 5
                      ? `${formatMarginSigned(d.stockout.margin_days)} days (tight)`
                      : `${formatMarginSigned(d.stockout.margin_days)} days (safe)`
                    : "-"}
                </dd>
              </div>
            </dl>

            <details className="technical-details" style={{ marginTop: 16 }}>
              <summary style={{ cursor: "pointer", color: "var(--muted)", fontSize: "0.85rem", fontWeight: 500 }}>
                Technical details
              </summary>
              <dl className="kv" style={{ marginTop: 10 }}>
                <div>
                  <dt>Days to delivery text</dt>
                  <dd>{d.stockout?.days_to_delivery_text || "-"}</dd>
                </div>
                <div>
                  <dt>Is overdue</dt>
                  <dd>{d.stockout?.is_overdue ? `Yes (${d.stockout.overdue_days} days)` : "No"}</dd>
                </div>
                <div>
                  <dt>Out of stock now</dt>
                  <dd>{d.stockout?.out_of_stock_now ? "Yes" : "No"}</dd>
                </div>
                <div>
                  <dt>Stock source</dt>
                  <dd>{d.inputs?.stock_source || "-"}</dd>
                </div>
                <div>
                  <dt>Days of cover</dt>
                  <dd>{d.stockout?.days_of_cover != null ? fmtDays(d.stockout.days_of_cover, 1) : "-"}</dd>
                </div>
                <div>
                  <dt>Delivery basis</dt>
                  <dd>{d.stockout?.delivery_basis || "-"}</dd>
                </div>
              </dl>
            </details>
          </div>

          <HealthBreakdownCard health={d.health} />

          <div className="card">
            <h3>Risk signals</h3>
            {!d.risk?.signals ? (
              <p className="muted">No risk signals available.</p>
            ) : (
              <dl className="kv">
                <div>
                  <dt title="Stock ratio relative to replenishment needs (below 1.0 means short)">Stock ratio</dt>
                  <dd>
                    {fmtRatio(d.risk.signals.stock_ratio)} <small className="muted">(below 1.0 means short)</small>
                  </dd>
                </div>
                <div>
                  <dt>Days of cover</dt>
                  <dd>{fmtDays(d.risk.signals.days_of_cover, 1)}</dd>
                </div>
                <div>
                  <dt>Avg daily demand 28d</dt>
                  <dd>{fmtUnitsPerDay(d.risk.signals.avg_daily_demand_28d)}</dd>
                </div>
                <div>
                  <dt>Demand momentum 7d vs 28d</dt>
                  <dd>{fmtRatioAsPct(d.risk.signals.demand_momentum_7d_vs_28d)}</dd>
                </div>
                <div>
                  <dt>Demand growth 28d vs 90d</dt>
                  <dd>{fmtRatioAsPct(d.risk.signals.demand_growth_28d_vs_90d)}</dd>
                </div>
                <div>
                  <dt>Supplier on time rate</dt>
                  <dd>{fmtPct(d.risk.signals.supplier_on_time_rate)}</dd>
                </div>
                <div>
                  <dt>Supplier recent delay</dt>
                  <dd>{fmtDays(d.risk.signals.supplier_recent_delay_days, 1)}</dd>
                </div>
              </dl>
            )}
          </div>

          <div className="card">
            <h3>Reorder recommendation</h3>
            <dl className="kv">
              <div>
                <dt>Recommended order</dt>
                <dd>
                  <strong>{fmtUnits(d.reorder?.order_qty)}</strong>
                </dd>
              </div>
              <div>
                <dt>Needs reorder</dt>
                <dd>{d.reorder?.needs_reorder ? "Yes" : "No"}</dd>
              </div>
              <div>
                <dt>Reorder point</dt>
                <dd>{fmtUnits(d.reorder?.reorder_point)}</dd>
              </div>
              <div>
                <dt>Demand over lead time</dt>
                <dd>{fmtUnits(leadTimeDemand)}</dd>
              </div>
              <div>
                <dt>Safety stock</dt>
                <dd>{fmtUnits(d.reorder?.safety_stock)}</dd>
              </div>
              <div>
                <dt>Inventory position</dt>
                <dd>{fmtUnits(d.reorder?.inventory_position)}</dd>
              </div>
              <div>
                <dt>Effective lead time</dt>
                <dd>{fmtDays(d.reorder?.effective_lead_time_days, 1)}</dd>
              </div>
            </dl>
            {canWrite && d.reorder?.order_qty > 0 && (
              <div style={{ marginTop: 16 }}>
                <Link className="btn primary" to={po}>
                  Create purchase order
                </Link>
              </div>
            )}
          </div>

          <div className="card">
            <h3>Supplier</h3>
            <h4 style={{ margin: "0 0 10px 0", fontSize: "0.95rem" }}>Primary Supplier</h4>
            <dl className="kv">
              <div>
                <dt>Supplier</dt>
                <dd>
                  <strong>{primarySupName}</strong> <span className="muted">({primarySupId || "-"})</span>
                </dd>
              </div>
              <div>
                <dt>Reliability score</dt>
                <dd>{fmtPct(d.supplier?.reliability_score ?? d.reorder?.supplier_reliability)}</dd>
              </div>
              <div>
                <dt>Risk level</dt>
                <dd>
                  <Pill value={d.supplier?.risk_level || d.reorder?.supplier_risk_level || "Low"} />
                </dd>
              </div>
              <div>
                <dt>Average delay</dt>
                <dd>{fmtDays(d.supplier?.avg_delay_days, 1)}</dd>
              </div>
            </dl>

            {d.reorder?.supplier_warning && (
              <div className="alert" style={{ margin: "14px 0", fontSize: "0.85rem" }}>
                {d.reorder.supplier_warning}
              </div>
            )}

            {altSup && altSup.supplier_id ? (
              <div style={{ marginTop: 18, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                <h4 style={{ margin: "0 0 10px 0", fontSize: "0.95rem" }}>Alternate Supplier</h4>
                <dl className="kv">
                  <div>
                    <dt>Supplier</dt>
                    <dd>
                      <strong>{fmtSupplierName(altSup.supplier_id, altSup.supplier_name)}</strong>{" "}
                      <span className="muted">({altSup.supplier_id})</span>
                    </dd>
                  </div>
                  <div>
                    <dt>Reliability score</dt>
                    <dd>{fmtPct(altSup.reliability_score)}</dd>
                  </div>
                  <div>
                    <dt>Risk level</dt>
                    <dd>
                      <Pill value={altSup.risk_level || "Low"} />
                    </dd>
                  </div>
                  <div>
                    <dt>Average delay</dt>
                    <dd>{fmtDays(altSup.avg_delay_days, 1)}</dd>
                  </div>
                </dl>
              </div>
            ) : null}
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
const LONG_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function TrendSeasonality({ trend }) {
  if (!trend) {
    return (
      <ChartCard
        title="Trend & Seasonality"
        subtitle="Identifies multi-year demand direction and recurring seasonal peaks."
        empty={true}
        emptyMessage="Trend data is not available yet. Refresh insights to compute it."
      />
    );
  }

  const weekly = Array.isArray(trend.weekly_series) ? trend.weekly_series : [];
  const joinedPattern = trend.pattern?.includes("+ seasonal");
  const badgeLabel = trend.pattern || "unknown";
  const badgeClass = joinedPattern ? "trend-seasonal" : (trend.pattern || "unknown").replaceAll(" ", "-");

  const yoyVal =
    trend.yoy_change_pct != null && !Number.isNaN(Number(trend.yoy_change_pct))
      ? Number(trend.yoy_change_pct)
      : null;

  let yoyPhrase = "Demand is flat year over year";
  let signedYoy = "0.0%";
  let salesTrendText = "flat";
  if (yoyVal != null) {
    signedYoy = `${yoyVal > 0 ? "+" : ""}${num(yoyVal, 1)}%`;
    if (Math.abs(yoyVal) < 1) {
      yoyPhrase = "Demand is flat year over year";
      salesTrendText = "flat";
    } else if (yoyVal > 0) {
      yoyPhrase = `Demand is up ${num(Math.abs(yoyVal), 1)}% year over year`;
      salesTrendText = `up ${num(Math.abs(yoyVal), 1)}%`;
    } else {
      yoyPhrase = `Demand is down ${num(Math.abs(yoyVal), 1)}% year over year`;
      salesTrendText = `down ${num(Math.abs(yoyVal), 1)}%`;
    }
  }

  const peakMonth = trend.peak_month ? LONG_MONTHS[MONTHS.indexOf(trend.peak_month)] || trend.peak_month : null;
  const peakUplift = trend.peak_uplift_pct == null ? null : `${num(trend.peak_uplift_pct, 1)}%`;

  const summary =
    trend.seasonal && peakMonth
      ? `${yoyPhrase}, peaking in ${peakMonth}${peakUplift ? ` (+${peakUplift})` : ""}.`
      : `${yoyPhrase}, with no recurring seasonal peak detected.`;

  // Build This Year vs Last Year comparison
  const thisYearWeeks = weekly.slice(-52);
  const lastYearWeeks = weekly.length > 52 ? weekly.slice(0, -52).slice(-52) : [];
  const yearComparisonData = thisYearWeeks.map((item, idx) => {
    const lastYearItem = lastYearWeeks[idx];
    return {
      weekNum: `W${idx + 1}`,
      week_start: item.week_start,
      thisYear: item.units,
      lastYear: lastYearItem ? lastYearItem.units : null,
    };
  });

  // Build +/- % monthly seasonality data around 0
  const rawMonthly = Array.isArray(trend.monthly_index) ? trend.monthly_index : [];
  const hasSeasonality = Boolean(trend.seasonal && trend.peak_month && rawMonthly.length === 12);
  const monthlySeasonalityData = rawMonthly.map((idxVal, i) => {
    const month = MONTHS[i];
    const pctDiff = Math.round(((idxVal || 1) - 1) * 100);
    const isPeak = month === trend.peak_month;
    return {
      month,
      pctDiff,
      isPeak,
    };
  });

  const lowestMonthEntry = monthlySeasonalityData.reduce(
    (min, m) => (m.pctDiff < (min?.pctDiff ?? Infinity) ? m : min),
    null
  );
  const lowestMonthName = lowestMonthEntry ? LONG_MONTHS[MONTHS.indexOf(lowestMonthEntry.month)] || lowestMonthEntry.month : null;

  const peakText = peakUplift ? `+${peakUplift} above average` : "above average";
  const lowText = lowestMonthEntry?.pctDiff != null ? `${lowestMonthEntry.pctDiff > 0 ? "+" : ""}${lowestMonthEntry.pctDiff}%` : "0%";

  const seasonalityTakeaway = hasSeasonality
    ? `Seasonal peak in ${peakMonth} (${peakText}); lowest in ${lowestMonthName || "off-season"} (${lowText}).`
    : "No recurring seasonal pattern detected. Demand does not show predictable month-to-month cycles.";

  return (
    <section className="trend-panel" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div
        className="card"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          padding: "14px 18px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span className={`trend-pattern trend-pattern-${badgeClass}`}>
            <Icon
              name={
                trend.trend === "decreasing" ? "down" : trend.trend === "increasing" ? "trend" : trend.seasonal ? "layers" : "info"
              }
              size={13}
            />
            {badgeLabel}
          </span>
          <span style={{ fontSize: "0.95rem", color: "var(--text)", fontWeight: 500 }}>{summary}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <div>
            <span className="muted small" style={{ display: "block" }}>Year over year</span>
            <strong style={{ fontSize: "1.05rem" }}>{signedYoy}</strong>
          </div>
          <div>
            <span className="muted small" style={{ display: "block" }}>Seasonal peak</span>
            <strong style={{ fontSize: "1.05rem" }}>{peakMonth ? `${peakMonth}${peakUplift ? ` · +${peakUplift}` : ""}` : "None"}</strong>
          </div>
        </div>
      </div>

      <div className="grid2 trend-charts">
        {/* Chart 1: This Year vs Last Year */}
        <ChartCard
          title="Demand: This Year vs Last Year"
          subtitle="Compares actual weekly volume against the same week of the previous year to spot growth trends."
          takeaway={
            yoyVal == null
              ? "Year-over-year sales demand data is unavailable."
              : `Sales are ${salesTrendText} year over year (${signedYoy} overall).`
          }
          takeawayTone={yoyVal > 0 ? "healthy" : yoyVal < 0 ? "critical" : "info"}
          empty={!yearComparisonData.length}
          emptyMessage="Weekly demand history is not available."
          height={260}
        >
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={yearComparisonData} margin={{ top: 10, right: 15, bottom: 25, left: 10 }}>
                <CartesianGrid {...CHART_GRID_PROPS} />
                <XAxis
                  dataKey="week_start"
                  tickFormatter={formatWeekTick}
                  minTickGap={28}
                  {...X_AXIS_PROPS}
                  label={{
                    value: "Week",
                    position: "insideBottom",
                    offset: -12,
                    fill: "var(--muted)",
                    fontSize: 11,
                  }}
                />
                <YAxis
                  width={50}
                  {...Y_AXIS_PROPS}
                  label={{
                    value: "Units / week",
                    angle: -90,
                    position: "insideLeft",
                    offset: 12,
                    fill: "var(--muted)",
                    fontSize: 11,
                    textAnchor: "middle",
                  }}
                />
                <Tooltip
                  content={
                    <ChartTooltip
                      labelFormatter={(d) => `Week of ${formatDate(d)}`}
                      formatter={(v, name) => [`${num(v, 0)} units`, name]}
                    />
                  }
                />
                <Legend verticalAlign="top" height={32} wrapperStyle={{ fontSize: 12 }} />
                <Line
                  dataKey="thisYear"
                  name="This Year"
                  stroke="var(--chart-1, #818cf8)"
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
                {lastYearWeeks.length > 0 && (
                  <Line
                    dataKey="lastYear"
                    name="Last Year"
                    stroke="var(--muted, #9ca3af)"
                    strokeWidth={1.8}
                    strokeDasharray="4 4"
                    dot={false}
                    isAnimationActive={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Chart 2: Monthly Seasonality +/- % around 0 */}
        <ChartCard
          title="Monthly Seasonality (+/- % vs Average)"
          subtitle="Monthly demand variation as a percentage above or below the baseline annual average."
          takeaway={seasonalityTakeaway}
          takeawayTone={hasSeasonality ? "warning" : "info"}
          empty={!hasSeasonality}
          emptyMessage="No clear seasonal pattern detected. Demand does not show recurring monthly cycles."
          height={260}
        >
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlySeasonalityData} margin={{ top: 15, right: 15, bottom: 20, left: 10 }}>
                <CartesianGrid {...CHART_GRID_PROPS} />
                <XAxis dataKey="month" {...X_AXIS_PROPS} />
                <YAxis
                  width={50}
                  {...Y_AXIS_PROPS}
                  unit="%"
                  label={{
                    value: "% vs Average",
                    angle: -90,
                    position: "insideLeft",
                    offset: 12,
                    fill: "var(--muted)",
                    fontSize: 11,
                    textAnchor: "middle",
                  }}
                />
                <Tooltip
                  content={
                    <ChartTooltip
                      formatter={(v, name, item) => [
                        `${v > 0 ? `+${v}%` : `${v}%`} vs average demand${item?.payload?.isPeak ? " (Peak month)" : ""}`,
                        "Variation",
                      ]}
                    />
                  }
                />
                <ReferenceLine y={0} stroke="var(--border-strong, #363e50)" strokeWidth={1.5} />
                <Bar dataKey="pctDiff" name="% vs Average" isAnimationActive={false} radius={[4, 4, 0, 0]}>
                  {monthlySeasonalityData.map((m) => {
                    const fill = m.isPeak
                      ? "var(--warning, #f59e0b)"
                      : m.pctDiff > 0
                      ? "var(--success, #10b981)"
                      : "var(--danger, #ef4444)";
                    return <Cell key={m.month} fill={fill} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </section>
  );
}
