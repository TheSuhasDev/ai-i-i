import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { performanceService } from "../services";
import useFetch from "../hooks/useFetch";
import { humanize, num } from "../utils/format";

const fetchPerf = () => performanceService.get();
const pct = (v, d = 1) => (v == null ? "-" : `${num(v, d)}%`);
const frac = (v, d = 3) => (v == null ? "-" : num(v, d));
const when = (s) => (s ? new Date(s).toLocaleString() : "-");
const PREDICTOR = { naive: "Naive (last week)", ma4: "4-week moving average" };

function ForecastSection({ f }) {
  const results = f.results || {};
  const horizons = Object.keys(results).sort();
  const chart = horizons.map((h) => {
    const t = results[h].test || {};
    return { horizon: `${h}-week`, Naive: t.naive?.wape, "4-week average": t.ma4?.wape, Model: t.model?.wape };
  });
  return (
    <div className="card">
      <h3>Demand forecasting</h3>
      <p className="muted small">
        Weekly forecasts evaluated on the last 6 months (held out, time-based split). Generated {when(f.generated_at)}.
        All three predictors are scored on exactly the same product-weeks.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Horizon</th><th>Predictor</th><th>MAE</th><th>RMSE</th><th>MAPE</th><th>WAPE</th></tr>
          </thead>
          <tbody>
            {horizons.flatMap((h) => {
              const r = results[h];
              const t = r.test || {};
              return ["naive", "ma4", "model"].map((k) => (
                <tr key={`${h}-${k}`} className={k === "model" ? "row-model" : ""}>
                  <td>{h} week{h === "1" ? "" : "s"} ahead</td>
                  <td>{k === "model" ? `${(r.selected_model || "model").toUpperCase()} (trained model)` : PREDICTOR[k]}</td>
                  <td>{frac(t[k]?.mae, 2)}</td>
                  <td>{frac(t[k]?.rmse, 2)}</td>
                  <td>{pct(t[k]?.mape)}</td>
                  <td>{pct(t[k]?.wape)}</td>
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>
      <div className="grid2" style={{ marginTop: 16 }}>
        <div>
          <h4>WAPE by horizon (lower is better)</h4>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chart} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e8f0" />
              <XAxis dataKey="horizon" />
              <YAxis unit="%" width={44} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Naive" fill="#adb5bd" isAnimationActive={false} />
              <Bar dataKey="4-week average" fill="#74c0fc" isAnimationActive={false} />
              <Bar dataKey="Model" fill="#3b5bdb" isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div>
          <h4>Improvement and interval coverage</h4>
          <table>
            <thead><tr><th>Horizon</th><th>WAPE gain vs 4-week average</th><th>80% range covers</th></tr></thead>
            <tbody>
              {horizons.map((h) => (
                <tr key={h}>
                  <td>{h} week{h === "1" ? "" : "s"}</td>
                  <td>{pct(results[h].wape_gain_vs_ma4_pct)}</td>
                  <td>{pct(results[h].interval_80_coverage_pct, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted small">A well-calibrated 80% range should cover about 80% of actual weeks.</p>
        </div>
      </div>
    </div>
  );
}

function BaselineSection({ b }) {
  const rows = Object.entries(b.metrics || {});
  return (
    <div className="card">
      <h3>Baseline forecasts</h3>
      <p className="muted small">Simple reference methods over all {b.test_weeks_per_product} test weeks. Generated {when(b.generated_at)}.</p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Baseline</th><th>What it does</th><th>MAE</th><th>RMSE</th><th>MAPE</th><th>WAPE</th></tr></thead>
          <tbody>
            {rows.map(([k, m]) => (
              <tr key={k}>
                <td>{humanize(k)}</td>
                <td className="wrap">{b.baselines?.[k]}</td>
                <td>{frac(m.mae, 2)}</td><td>{frac(m.rmse, 2)}</td><td>{pct(m.mape)}</td><td>{pct(m.wape)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RiskSection({ r }) {
  const t = r.test || {};
  const m = t.at_threshold || {};
  const rule = r.rule_baseline_stock_ratio_lt_1 || {};
  const cal = (r.calibration_table || []).map((c) => ({
    bin: c.bin,
    predicted: c.predicted == null ? null : c.predicted * 100,
    actual: c.actual == null ? null : c.actual * 100,
  }));
  return (
    <div className="card">
      <h3>Stockout risk classifier</h3>
      <p className="muted small">
        {humanize(r.selected_model || "model")} with class weights, probabilities calibrated on a validation fold, decision threshold {frac(r.threshold)}.
        Evaluated on {num(t.n, 0)} held-out product-days ({pct((t.positive_rate ?? 0) * 100)} stockouts). Generated {when(r.generated_at)}.
      </p>
      <div className="cards">
        <div className="card stat"><h4>Precision</h4><p className="big">{frac(m.precision)}</p></div>
        <div className="card stat"><h4>Recall</h4><p className="big">{frac(m.recall)}</p></div>
        <div className="card stat"><h4>F1</h4><p className="big">{frac(m.f1)}</p></div>
        <div className="card stat"><h4>ROC-AUC</h4><p className="big">{frac(t.roc_auc)}</p></div>
        <div className="card stat"><h4>PR-AUC</h4><p className="big">{frac(t.pr_auc)}</p><p className="muted small">random = {frac(t.positive_rate)}</p></div>
        <div className="card stat"><h4>Brier score</h4><p className="big">{frac(t.brier)}</p><p className="muted small">lower is better</p></div>
      </div>
      <div className="grid2">
        <div>
          <h4>Model versus a simple rule</h4>
          <table>
            <thead><tr><th></th><th>Precision</th><th>Recall</th><th>F1</th><th>TP</th><th>FP</th><th>FN</th><th>TN</th></tr></thead>
            <tbody>
              <tr className="row-model"><td>Trained model</td><td>{frac(m.precision)}</td><td>{frac(m.recall)}</td><td>{frac(m.f1)}</td><td>{m.tp}</td><td>{m.fp}</td><td>{m.fn}</td><td>{m.tn}</td></tr>
              <tr><td>Rule: stock ratio below 1</td><td>{frac(rule.precision)}</td><td>{frac(rule.recall)}</td><td>{frac(rule.f1)}</td><td>{rule.tp}</td><td>{rule.fp}</td><td>{rule.fn}</td><td>{rule.tn}</td></tr>
            </tbody>
          </table>
          <p className="muted small">
            The label is largely a function of stock and demand, so a simple rule scores well; the model is only worth having if it beats it.
          </p>
        </div>
        <div>
          <h4>Calibration: predicted risk vs actual stockout rate</h4>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={cal} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e8f0" />
              <XAxis dataKey="bin" />
              <YAxis unit="%" width={44} domain={[0, 100]} />
              <Tooltip formatter={(v) => `${num(v, 0)}%`} />
              <Legend />
              <Line dataKey="predicted" name="Predicted" stroke="#868e96" strokeDasharray="6 4" isAnimationActive={false} />
              <Line dataKey="actual" name="Actual" stroke="#3b5bdb" strokeWidth={2} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function AnomalySection({ a }) {
  const res = a.results || {};
  const rows = [
    ["Sales: Isolation Forest", res.sales?.isolation_forest],
    ["Sales: simple rule", res.sales?.rule_baseline],
    ["Stock counts: Isolation Forest", res.stock?.isolation_forest],
    ["Stock counts: simple rule", res.stock?.rule_baseline],
    ["Supplier delay: rule (15+ days)", res.supplier_delay_rule],
  ];
  return (
    <div className="card">
      <h3>Anomaly detection</h3>
      <p className="muted small">
        Scored against the planted anomaly labels, which are never used as model inputs. Generated {when(a.generated_at)}.
      </p>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Detector</th><th>Precision</th><th>Recall</th><th>F1</th><th>Flagged</th><th>True anomalies</th></tr></thead>
          <tbody>
            {rows.map(([name, m]) => (
              <tr key={name}>
                <td>{name}</td><td>{frac(m?.precision)}</td><td>{frac(m?.recall)}</td><td>{frac(m?.f1)}</td><td>{m?.flagged ?? "-"}</td><td>{m?.true ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {res.sales && (
        <p className="muted small">
          Sales spikes recalled: {pct((res.sales.recall_spikes ?? 0) * 100, 0)} of {res.sales.n_spikes}. Zero-sales days recalled:{" "}
          {pct((res.sales.recall_zero_days ?? 0) * 100, 0)} of {res.sales.n_zero_days} (zero days of slow products are hard to tell from normal).
          Stock count errors are detected one day late.
        </p>
      )}
    </div>
  );
}

function ImportanceChart({ title, data }) {
  const rows = Object.entries(data || {}).slice(0, 8).map(([name, value]) => ({ name, value }));
  if (!rows.length) return null;
  return (
    <div>
      <h4>{title}</h4>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={rows} layout="vertical" margin={{ top: 5, right: 20, bottom: 0, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e8f0" />
          <XAxis type="number" />
          <YAxis type="category" dataKey="name" width={110} />
          <Tooltip />
          <Bar dataKey="value" name="Permutation importance" fill="#3b5bdb" isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function ModelPerformance() {
  const { data, loading, error } = useFetch(fetchPerf);
  const p = data?.data;

  if (loading) return <p className="muted">Loading metrics...</p>;
  if (error) return <div className="alert">{error}</div>;

  const missing = p.missing || [];
  return (
    <div>
      <div className="page-head"><h2>ML Performance</h2></div>
      <p className="muted">
        Every number on this page is read from the metric files written by the training scripts. Nothing is entered by hand.
        Models are evaluated only on a time-based hold-out (the last 6 months), never a random split. The data is synthetic.
      </p>

      {missing.length > 0 && (
        <div className="alert info">
          Some metrics have not been generated yet. Run in the ml-service folder:
          <ul>
            {missing.map((k) => (
              <li key={k}><code>{p.train_commands?.[k]}</code> ({humanize(k)})</li>
            ))}
          </ul>
        </div>
      )}

      {p.forecast && <ForecastSection f={p.forecast} />}
      {p.baseline && <BaselineSection b={p.baseline} />}
      {p.risk && <RiskSection r={p.risk} />}
      {p.anomaly && <AnomalySection a={p.anomaly} />}

      {p.trend_detection && (
        <div className="card">
          <h3>Trend and seasonality detection</h3>
          <div className="cards">
            <div className="card stat"><h4>Trend agreement</h4><p className="big">{pct(p.trend_detection.trend_agreement_pct, 0)}</p></div>
            <div className="card stat"><h4>Seasonality agreement</h4><p className="big">{pct(p.trend_detection.seasonality_agreement_pct, 0)}</p></div>
            <div className="card stat"><h4>Products checked</h4><p className="big">{p.trend_detection.products}</p></div>
          </div>
          <p className="muted small">{p.trend_detection.note}</p>
        </div>
      )}

      {(p.risk?.feature_importance || p.forecast?.feature_importance_h1) && (
        <div className="card">
          <h3>Most important features</h3>
          <div className="grid2">
            <ImportanceChart title="Stockout risk model" data={p.risk?.feature_importance} />
            <ImportanceChart title="Forecast model (1 week ahead)" data={p.forecast?.feature_importance_h1} />
          </div>
          <p className="muted small">Permutation importance: how much the held-out score worsens when a feature is shuffled.</p>
        </div>
      )}

      <div className="card">
        <h3>Metric definitions</h3>
        <dl className="kv">
          <div><dt>MAE</dt><dd>Average absolute error, in units per week</dd></div>
          <div><dt>RMSE</dt><dd>Square root of the average squared error; punishes big misses</dd></div>
          <div><dt>MAPE</dt><dd>Average absolute error as a percent of actual demand (weeks with zero demand ignored); inflated by low-volume weeks</dd></div>
          <div><dt>WAPE</dt><dd>Total absolute error divided by total actual demand; the fairer headline here</dd></div>
          <div><dt>Precision</dt><dd>Of the products flagged, the share that really ran short</dd></div>
          <div><dt>Recall</dt><dd>Of the real stockouts, the share that were flagged</dd></div>
          <div><dt>F1</dt><dd>Balance of precision and recall</dd></div>
        </dl>
      </div>
    </div>
  );
}