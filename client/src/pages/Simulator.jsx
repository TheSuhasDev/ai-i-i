import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { productService, simulatorService } from "../services";
import { errorMessage } from "../services/api";
import useAuth from "../context/useAuth";
import useFetch from "../hooks/useFetch";
import Pill from "../components/Pill";
import { PRIORITY_ORDER, num } from "../utils/format";

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
    r.before.projected_stock.forEach((v, i) => rows.push({ day: i + 1, before: v, after: r.after.projected_stock[i] }));
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
        { label: "Expected stockout", b: b.expected_stockout_date ?? "none in 30 days", a: a.expected_stockout_date ?? "none in 30 days", kind: "text" },
        { label: "Units short in 30 days", b: b.units_short_30d, a: a.units_short_30d, kind: "num", digits: 0, worse: 1 },
        { label: "Stockout risk (%)", b: b.risk_pct, a: a.risk_pct, kind: "num", digits: 1, worse: 1 },
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
      <div className="page-head">
        <h2>What-If Simulator</h2>
        {busy && <span className="muted small">Recalculating...</span>}
      </div>
      <p className="muted">
        Change demand, supplier delay, stock or order quantity and compare the outcome with the current situation.
        Nothing is saved.
      </p>

      <div className="sim-layout">
        <div className="card sim-controls">
          <h3>Scenario</h3>
          <label className="field">
            <span>Product</span>
            <select value={code} onChange={(e) => changeProduct(e.target.value)}>
              {!products.data && <option value={code}>{code}</option>}
              {(products.data?.data ?? []).map((p) => (
                <option key={p._id} value={p.code}>{p.code} {p.name}</option>
              ))}
            </select>
          </label>

          <div className="presets">
            <button className="btn small" onClick={() => setDemandPct(10)}>Demand +10%</button>
            <button className="btn small" onClick={() => setDemandPct(20)}>Demand +20%</button>
            <button className="btn small" onClick={() => setDelay(3)}>Delay +3 days</button>
            <button className="btn small" onClick={reset}>Reset</button>
          </div>

          <SliderRow label="Demand change" value={demandPct} min={-50} max={100} step={5} suffix="%" onChange={setDemandPct} />
          <SliderRow label="Extra supplier delay" value={delay} min={0} max={14} step={1} suffix=" days" onChange={setDelay} />
          <SliderRow label="Stock on hand" value={stock ?? baseStock} min={0} max={stockMax} step={1} suffix=" units" onChange={setStock} />
          <SliderRow
            label="New order placed today" value={orderQty} min={0} max={1000} step={5} suffix=" units" onChange={setOrderQty}
            hint="Arrives after the lead time plus supplier delay. It changes the stockout date and units short, not the risk %."
          />
        </div>

        <div className="sim-results">
          {error && <div className="alert">{error}</div>}
          {!r && !error && <p className="muted">Calculating...</p>}
          {r && (
            <>
              <div className={bannerClass}>{r.summary}</div>

              <div className="table-wrap">
                <table className="compare">
                  <thead><tr><th>{r.product_id} {r.name}</th><th>Now</th><th>Scenario</th><th>Change</th></tr></thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.label}>
                        <td>{row.label}</td>
                        <td>{cell(row, row.b)}</td>
                        <td><strong>{cell(row, row.a)}</strong></td>
                        <td>{change(row)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="card" style={{ marginTop: 16 }}>
                <h3>Projected stock, next 30 days</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chart} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e8f0" />
                    <XAxis dataKey="day" label={{ value: "Days from now", position: "insideBottom", offset: -10 }} />
                    <YAxis width={48} />
                    <Tooltip />
                    <Legend verticalAlign="top" />
                    <ReferenceLine y={0} stroke="#e03131" />
                    <Line dataKey="before" name="Now" stroke="#868e96" strokeWidth={2} strokeDasharray="6 4" dot={false} isAnimationActive={false} />
                    <Line dataKey="after" name="Scenario" stroke="#3b5bdb" strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
                <p className="muted small">Assumes constant daily demand at the forecast mean. Stock at zero means demand goes unmet.</p>
              </div>

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