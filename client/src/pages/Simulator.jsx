import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { productService, simulatorService } from "../services";
import { errorMessage } from "../services/api";
import useAuth from "../context/useAuth";
import useFetch from "../hooks/useFetch";
import Pill from "../components/Pill";
import { PRIORITY_ORDER, formatDate, num } from "../utils/format";
import PageHeader from "../components/PageHeader";
import ProductCell from "../components/ProductCell";
import ProductSelect from "../components/ProductSelect";
import { ChartCard, ChartTooltip, InfoTooltip, CHART_GRID_PROPS, X_AXIS_PROPS, Y_AXIS_PROPS } from "../components/charts";

function formatSummaryBanner(r) {
  if (!r) return "";
  const b = r.before;
  const a = r.after;
  const neutral =
    r.scenario?.demand_pct === 0 &&
    r.scenario?.extra_delay_days === 0 &&
    (r.scenario?.stock == null || r.scenario?.stock === b.stock) &&
    r.scenario?.order_qty === 0;

  if (neutral) {
    return "No scenario changes applied: showing the current situation.";
  }

  const parts = [];

  // Alert priority
  if (a.priority !== b.priority) {
    parts.push(`Alert priority moves from ${b.priority} to ${a.priority}.`);
  } else {
    parts.push(`Alert priority stays ${a.priority}.`);
  }

  // Stockout risk (one decimal, e.g. "99.8% -> 99.6%")
  parts.push(`Stockout risk: ${num(b.risk_pct, 1)}% -> ${num(a.risk_pct, 1)}%.`);

  // Health status
  if (a.health?.status !== b.health?.status) {
    parts.push(`Health moves from ${b.health?.status} to ${a.health?.status}.`);
  }

  // Expected stockout date ("06 Nov 2026 -> 08 Nov 2026")
  if (a.expected_stockout_date !== b.expected_stockout_date) {
    const was = b.expected_stockout_date ? formatDate(b.expected_stockout_date) : "none within 30 days";
    const now = a.expected_stockout_date ? formatDate(a.expected_stockout_date) : "none within 30 days";
    parts.push(`Expected stockout: ${was} -> ${now}.`);
  }

  // Suggested additional order ("1,645 units", "320 units")
  parts.push(
    `Suggested additional order: ${num(b.reorder?.order_qty || 0, 0)} units -> ${num(a.reorder?.order_qty || 0, 0)} units.`
  );

  return parts.join(" ");
}

function getOutOfStockPeriods(chartData) {
  if (!chartData || chartData.length === 0) return [];
  const periods = [];
  let start = null;

  for (let i = 0; i < chartData.length; i++) {
    const pt = chartData[i];
    if (pt.isStep) continue;
    const isZero = (pt.after ?? 0) <= 0;

    if (isZero) {
      if (start === null) {
        start = pt.day;
      }
    } else {
      if (start !== null) {
        periods.push({ start, end: pt.day });
        start = null;
      }
    }
  }

  if (start !== null) {
    periods.push({ start, end: 30 });
  }

  return periods;
}

const fetchProducts = () => productService.list({ limit: 100, sort: "code" });
const clamp = (v, lo, hi) => Math.min(Math.max(Number.isFinite(v) ? v : 0, lo), hi);

function SliderRow({ label, value, min, max, step, onChange, suffix = "", hint }) {
  return (
    <div className="slider-row">
      <div className="slider-head">
        <span>{label}</span>
        <span className="slider-value">
          <input
            type="number" min={min} max={max} step={step} value={value}
            onChange={(e) => onChange(clamp(Number(e.target.value), min, max))}
          />
          {suffix}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      {hint && <p className="muted small">{hint}</p>}
    </div>
  );
}

function cell(row, v) {
  if (v == null) return "-";
  if (row.kind === "pill") return <Pill value={v} />;
  if (row.kind === "text") return v;
  return num(v, row.digits ?? 1);
}

function change(row) {
  if (row.kind !== "num" || row.b == null || row.a == null) return null;
  const d = row.a - row.b;
  if (Math.abs(d) < 0.5 * 10 ** -(row.digits ?? 1)) return <span className="muted">no change</span>;
  const cls = row.worse === 0 ? "" : (d > 0) === (row.worse === 1) ? "bad" : "good";
  return <span className={`delta ${cls}`}>{d > 0 ? "+" : ""}{num(d, row.digits ?? 1)}</span>;
}

export default function Simulator() {
  const { canWrite } = useAuth();
  const [params, setParams] = useSearchParams();
  const code = (params.get("product") || "P001").toUpperCase();
  const products = useFetch(fetchProducts);
  const selectedProduct = (products.data?.data ?? []).find((product) => product.code === code) || { code, product_id: code, name: code };

  const [demandPct, setDemandPct] = useState(0);
  const [delay, setDelay] = useState(0);
  const [stock, setStock] = useState(null); // null = unchanged
  const [orderQty, setOrderQty] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setBusy(true);
      const body = { productCode: code, demandPct, extraDelayDays: delay, orderQty };
      if (stock !== null) body.stock = stock;
      simulatorService
        .run(body)
        .then((r) => {
          if (!cancelled) {
            setResult(r.data.data);
            setError("");
          }
        })
        .catch((e) => !cancelled && setError(errorMessage(e)))
        .finally(() => !cancelled && setBusy(false));
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [code, demandPct, delay, stock, orderQty]);

  const reset = () => {
    setDemandPct(0);
    setDelay(0);
    setStock(null);
    setOrderQty(0);
  };
  const changeProduct = (c) => {
    setParams({ product: c });
    reset();
  };

  const r = result && result.product_id === code ? result : null;
  const b = r?.before;
  const a = r?.after;
  const baseStock = b ? b.stock : 0;
  const stockMax = Math.max(Math.ceil((baseStock * 2) / 10) * 10, 200);

  const chart = useMemo(() => {
    if (!r) return [];
    const rows = [{ day: 0, before: r.before.stock, after: r.after.stock }];
    for (let i = 0; i < 30; i++) {
      const day = i + 1;
      const bStock = r.before.projected_stock[i] ?? 0;
      const aStock = r.after.projected_stock[i] ?? 0;
      const prevAStock = i === 0 ? r.after.stock : (r.after.projected_stock[i - 1] ?? 0);
      const prevBStock = i === 0 ? r.before.stock : (r.before.projected_stock[i - 1] ?? 0);

      // If an order delivery jump happens in 'after' or 'before', create a vertical step at 'day'
      if (aStock > prevAStock || bStock > prevBStock) {
        rows.push({
          day: day - 0.0001,
          before: bStock > prevBStock ? prevBStock : bStock,
          after: aStock > prevAStock ? prevAStock : aStock,
          isStep: true,
          stepDay: day,
        });
      }

      rows.push({ day, before: bStock, after: aStock });
    }
    return rows;
  }, [r]);

  const rows = r
    ? [
        { label: "Daily demand (units)", b: b.daily_demand, a: a.daily_demand, kind: "num", digits: 1, worse: 0 },
        { label: "Effective lead time (days)", b: b.lead_time_days, a: a.lead_time_days, kind: "num", digits: 0, worse: 1 },
        { label: "Stock on hand", b: b.stock, a: a.stock, kind: "num", digits: 0, worse: -1 },
        { label: "On order (incl. new order)", b: b.on_order, a: a.on_order, kind: "num", digits: 0, worse: -1 },
        { label: "Days of cover", b: b.days_of_cover, a: a.days_of_cover, kind: "num", digits: 1, worse: -1 },
        { label: "Days to delivery", b: b.days_to_delivery, a: a.days_to_delivery, kind: "num", digits: 1, worse: 1 },
        { label: "Margin (cover - delivery)", b: b.margin_days, a: a.margin_days, kind: "num", digits: 1, worse: -1 },
        { label: "Expected stockout", b: b.expected_stockout_date ? formatDate(b.expected_stockout_date) : "none in 30 days", a: a.expected_stockout_date ? formatDate(a.expected_stockout_date) : "none in 30 days", kind: "text" },
        { label: "Units short in 30 days", b: b.units_short_30d, a: a.units_short_30d, kind: "num", digits: 0, worse: 1 },
        {
          label: "Stockout risk (%)",
          b: b.risk_pct,
          a: a.risk_pct,
          kind: "num",
          digits: 1,
          worse: 1,
          tooltip:
            "Risk reflects current stock and recent sales. Orders in transit are not included, so a new order changes the stockout date and units short, not this %.",
        },
        { label: "Risk level", b: b.risk_level, a: a.risk_level, kind: "pill" },
        { label: "Alert priority", b: b.priority, a: a.priority, kind: "pill" },
        { label: "Health score", b: b.health.score, a: a.health.score, kind: "num", digits: 0, worse: -1 },
        { label: "Health status", b: b.health.status, a: a.health.status, kind: "pill" },
        { label: "Suggested additional order", b: b.reorder.order_qty, a: a.reorder.order_qty, kind: "num", digits: 0, worse: 0 },
      ]
    : [];

  const worse = r && PRIORITY_ORDER[a.priority] < PRIORITY_ORDER[b.priority];
  const better = r && PRIORITY_ORDER[a.priority] > PRIORITY_ORDER[b.priority];
  const bannerClass = worse ? "alert" : better ? "alert ok" : "alert info";

  return (
    <div>
      <PageHeader title="What-If Simulator" subtitle="Change demand, delivery delay, stock, or order quantity and compare outcomes." actions={busy && <span className="muted small">Recalculating...</span>} />
      <p className="muted">
        Change demand, supplier delay, stock or order quantity and compare the outcome with the current situation.
        Nothing is saved.
      </p>

      <div className="sim-layout">
        <div className="card sim-controls">
          <h3>Scenario</h3>
          <label className="field">
            <span>Product</span>
            <ProductSelect products={products.data?.data ?? []} value={code} valueKey="code" onChange={changeProduct} placeholder={code} />
          </label>

          <div className="presets">
            <button className="btn small" onClick={() => setDemandPct(10)}>Demand +10%</button>
            <button className="btn small" onClick={() => setDemandPct(20)}>Demand +20%</button>
            <button className="btn small" onClick={() => setDelay(3)}>Delay +3 days</button>
            <button className="btn small" onClick={reset}>Reset</button>
          </div>

          <SliderRow label="Demand change" value={demandPct} min={-50} max={100} step={5} suffix="%" onChange={setDemandPct} />
          <SliderRow label="Extra supplier delay" value={delay} min={0} max={30} step={1} suffix=" days" onChange={setDelay} />
          <SliderRow label="Stock on hand" value={stock ?? baseStock} min={0} max={stockMax} step={1} suffix=" units" onChange={setStock} />
          <SliderRow
            label="New order placed today" value={orderQty} min={0} max={2000} step={5} suffix=" units" onChange={setOrderQty}
            hint="Arrives after the lead time plus supplier delay. It changes the stockout date and units short, not the risk %."
          />
        </div>

        <div className="sim-results">
          {error && <div className="alert">{error}</div>}
          {!r && !error && <p className="muted">Calculating...</p>}
          {r && (
            <>
              <div className={bannerClass}>{formatSummaryBanner(r)}</div>

              <div className="table-wrap">
                <table className="compare">
                  <thead><tr><th><ProductCell product={selectedProduct} size="simulator" imageList={products.data?.data ?? []} /></th><th>Now</th><th>Scenario</th><th>Change</th></tr></thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.label}>
                        <td>
                          <span style={{ display: "inline-flex", alignItems: "center" }}>
                            {row.label}
                            {row.tooltip && <InfoTooltip text={row.tooltip} />}
                          </span>
                        </td>
                        <td>{cell(row, row.b)}</td>
                        <td><strong>{cell(row, row.a)}</strong></td>
                        <td>{change(row)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {(() => {
                const oosPeriods = getOutOfStockPeriods(chart);
                const reorderPoint = a?.reorder?.reorder_point ?? b?.reorder?.reorder_point;
                const safetyStock = a?.reorder?.safety_stock ?? b?.reorder?.safety_stock;

                const maxDataStock = Math.max(
                  ...chart.map((d) => Math.max(d.before ?? 0, d.after ?? 0)),
                  0
                );
                const maxWithRef = Math.max(
                  maxDataStock,
                  reorderPoint ?? 0,
                  safetyStock ?? 0
                );
                const isAllZero = chart.length > 0 && maxDataStock <= 0;
                const yMax = isAllZero ? 10 : Math.max(10, Math.ceil(maxWithRef * 1.15));
                const yDomain = [0, yMax];

                const zeroMessage = "No scenario changes: stock stays at 0 for the next 30 days";
                const takeaway = isAllZero
                  ? zeroMessage
                  : a.units_short_30d === 0
                  ? "Scenario projection maintains healthy stock with zero units short over 30 days."
                  : `Scenario projects ${num(a.units_short_30d, 0)} units short (${num(a.risk_pct, 1)}% stockout risk) over 30 days.`;

                const orderArrivalStep = chart.find((d) => d.isStep);
                const arrivalDay = orderArrivalStep
                  ? Math.round(orderArrivalStep.stepDay || orderArrivalStep.day)
                  : Math.round(a.lead_time_days);

                return (
                  <ChartCard
                    title="Projected Stock Level (Next 30 Days)"
                    subtitle="How will inventory track under your scenario vs doing nothing?"
                    jargon={["Safety Stock", "Reorder Point", "Lead Time"]}
                    takeaway={takeaway}
                    className="mt-4"
                  >
                    {isAllZero && (
                      <div className="alert info small" style={{ marginBottom: "12px", fontSize: "13px" }}>
                        {zeroMessage}
                      </div>
                    )}
                    <div style={{ width: "100%", height: 300 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chart} margin={{ top: 20, right: 130, bottom: 25, left: 15 }}>
                          <CartesianGrid {...CHART_GRID_PROPS} />
                          <XAxis
                            dataKey="day"
                            type="number"
                            domain={[0, 30]}
                            ticks={[0, 5, 10, 15, 20, 25, 30]}
                            tickFormatter={(v) => Math.round(v)}
                            {...X_AXIS_PROPS}
                            label={{ value: "Days from now", position: "insideBottom", offset: -10, fill: "var(--muted)", fontSize: 11 }}
                          />
                          <YAxis
                            {...Y_AXIS_PROPS}
                            domain={yDomain}
                            width={55}
                            label={{ value: "Stock (units)", angle: -90, position: "insideLeft", offset: 10, fill: "var(--muted)", fontSize: 11 }}
                          />
                          <Tooltip
                            content={
                              <ChartTooltip
                                unit=" units"
                                labelFormatter={(l) => `Day ${Math.round(l)}`}
                              />
                            }
                          />
                          <Legend
                            verticalAlign="top"
                            wrapperStyle={{ paddingBottom: 12, fontSize: 12 }}
                            formatter={(value) => <span style={{ color: "var(--text)" }}>{value}</span>}
                          />

                          {/* Shaded out of stock zones (one per out of stock period) */}
                          {oosPeriods.map((p, idx) => (
                            <ReferenceArea
                              key={`oos-${idx}-${p.start}-${p.end}`}
                              x1={p.start}
                              x2={p.end}
                              fill="var(--danger)"
                              fillOpacity={0.08}
                              label={{
                                value: "Out-of-stock zone",
                                fill: "var(--danger)",
                                position: "insideBottom",
                                fontSize: 11,
                                fontWeight: 600,
                                offset: 12,
                              }}
                            />
                          ))}

                          <ReferenceLine y={0} stroke="var(--danger)" strokeDasharray="3 3" />

                          {/* Reference lines labeled outside the plot area */}
                          {safetyStock != null && safetyStock > 0 && (
                            <ReferenceLine
                              y={safetyStock}
                              stroke="var(--success)"
                              strokeDasharray="4 4"
                              label={{
                                value: `Safety stock ${num(safetyStock, 0)}`,
                                position: "right",
                                fill: "var(--success)",
                                fontSize: 11,
                                fontWeight: 500,
                              }}
                            />
                          )}
                          {reorderPoint != null && reorderPoint > 0 && (
                            <ReferenceLine
                              y={reorderPoint}
                              stroke="var(--warning)"
                              strokeDasharray="4 4"
                              label={{
                                value: `Reorder point ${num(reorderPoint, 0)}`,
                                position: "right",
                                fill: "var(--warning)",
                                fontSize: 11,
                                fontWeight: 500,
                              }}
                            />
                          )}

                          {/* Delivery marker positioned at top of marker line */}
                          {orderQty > 0 && arrivalDay <= 30 && (
                            <ReferenceLine
                              x={arrivalDay}
                              stroke="var(--chart-3)"
                              strokeDasharray="3 3"
                              strokeWidth={1.5}
                              label={{
                                value: `Order arrives: +${num(orderQty, 0)} units`,
                                fill: "var(--chart-3)",
                                position: "insideTopLeft",
                                fontSize: 11,
                                fontWeight: 600,
                                offset: 10,
                              }}
                            />
                          )}

                          {/* Scenario line */}
                          <Line
                            dataKey="after"
                            name="With your changes"
                            stroke="var(--chart-1)"
                            strokeWidth={2.5}
                            dot={false}
                            isAnimationActive={false}
                          />

                          {/* Baseline line drawn on top with prominent dashes so both remain visible when overlapping */}
                          <Line
                            dataKey="before"
                            name="If you do nothing"
                            stroke="var(--muted)"
                            strokeWidth={3}
                            strokeDasharray="6 4"
                            dot={false}
                            isAnimationActive={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartCard>
                );
              })()}

              <div className="form-actions">
                {canWrite && a.reorder.order_qty > 0 && (
                  <Link
                    className="btn primary"
                    to={`/purchase-orders/new?productCode=${r.product_id}&supplierCode=${r.supplier_id}&qty=${a.reorder.order_qty}`}
                  >
                    Create PO for {a.reorder.order_qty} units
                  </Link>
                )}
                <Link className="btn" to={`/product/${r.product_id}`}>Open product page</Link>
              </div>

              <ul className="muted small">
                {r.assumptions.map((t) => <li key={t}>{t}</li>)}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
