import { useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import useAuth from "../context/useAuth";
import useFetch from "../hooks/useFetch";
import { insightService } from "../services";
import ForecastChart from "../components/ForecastChart";
import Pill from "../components/Pill";
import { humanize, num } from "../utils/format";
import WhyPanel from "../components/WhyPanel";

const val = (v) => (v == null ? "-" : typeof v === "object" ? JSON.stringify(v) : typeof v === "number" ? num(v, 2) : String(v));

function KeyValues({ obj }) {
  return (
    <dl className="kv">
      {Object.entries(obj || {}).map(([k, v]) => (
        <div key={k}><dt>{humanize(k)}</dt><dd>{val(v)}</dd></div>
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
  const fetchInsight = useCallback(() => insightService.get(code), [code]);
  const fetchHistory = useCallback(() => insightService.history(code, 52), [code]);
  const ins = useFetch(fetchInsight);
  const hist = useFetch(fetchHistory);
  const d = ins.data?.data;

  if (ins.loading) return <p className="muted">Loading analysis for {code}...</p>;
  if (ins.error) {
    return (
      <div>
        <Link to="/">Back to dashboard</Link>
        <div className="alert">{ins.error}</div>
      </div>
    );
  }

  const po = `/purchase-orders/new?productCode=${d.product_id}&supplierCode=${d.reorder.supplier_id}&qty=${d.reorder.order_qty}`;
  const t = d.trend;

  return (
    <div>
      <div className="page-head">
        <h2>{d.name} <span className="muted">{d.product_id}</span></h2>
        <div className="actions">
          <Pill value={d.priority} />
          <Pill value={d.health.status} />
          <span className="badge">{d.classification?.abc_xyz}</span>
        </div>
      </div>

      <div className="cards">
        <div className="card stat"><h4>Health score</h4><p className="big">{num(d.health.score, 0)}</p><p className="muted small">out of 100</p></div>
        <div className="card stat"><h4>Stockout risk</h4><p className="big">{num(d.risk.risk_pct, 0)}%</p><p className="muted small">{d.risk.risk_level}</p></div>
        <div className="card stat"><h4>Days of cover</h4><p className="big">{num(d.stockout.days_of_cover, 1)}</p><p className="muted small">delivery in {num(d.stockout.days_to_delivery, 1)} days</p></div>
        <div className="card stat"><h4>Recommended order</h4><p className="big">{d.reorder.order_qty}</p><p className="muted small">units</p></div>
      </div>

    <WhyPanel code={d.product_id} />

      <div className="card">
        <h3>Sales history and forecast</h3>
        {hist.error && <div className="alert">History unavailable: {hist.error}</div>}
        <ForecastChart history={hist.data?.data?.weeks ?? []} forecast={d.forecast.weeks} />
        <p className="muted small">
          Demand over the {d.forecast.lead_time_days}-day lead time: {num(d.forecast.lead_time_demand, 0)} units
          (cautious estimate {num(d.forecast.lead_time_demand_high, 0)}). Forecast assumes no promotions.
        </p>
      </div>

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
          <h3>Stockout risk signals</h3>
          <KeyValues obj={d.risk.signals} />
        </div>
        <div className="card">
          <h3>Reorder recommendation</h3>
          <KeyValues obj={d.reorder} />
          {canWrite && d.reorder.order_qty > 0 && <Link className="btn primary" to={po}>Create purchase order</Link>}
        </div>
        <div className="card">
          <h3>Trend and seasonality</h3>
          {t ? <KeyValues obj={{ pattern: t.pattern, yoy_change_pct: t.yoy_change_pct, seasonal: t.seasonal ? "yes" : "no", seasonal_strength: t.seasonal_strength, peak_month: t.peak_month, peak_uplift_pct: t.peak_uplift_pct }} />
            : <p className="muted">Not enough history.</p>}
          <h3>Supplier</h3>
          <KeyValues obj={d.supplier} />
        </div>
      </div>
    </div>
  );
}

export default function ProductInsightPage() {
  const { code } = useParams();
  return <ProductInsight key={code} code={code} />;
}