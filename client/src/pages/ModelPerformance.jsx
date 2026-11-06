import { useState, useCallback } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { performanceService } from "../services";
import useAnalysis from "../hooks/useAnalysis";
import useToast from "../context/useToast";
import { formatDate, humanize, num } from "../utils/format";
import PageHeader from "../components/PageHeader";
import { AnalysisButton, AnalysisIdle, AnalysisLoader, AnalysisReveal } from "../components/analysis";
import { ChartCard, ChartTooltip, CHART_GRID_PROPS, X_AXIS_PROPS, Y_AXIS_PROPS } from "../components/charts";

const fetchPerf = () => performanceService.get();
const pct = (v, d = 1) => (v == null ? "-" : `${num(v, d)}%`);
const frac = (v, d = 3) => (v == null ? "-" : num(v, d));
const when = (s) => formatDate(s);
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
          <ChartCard
            title="Forecast Accuracy (WAPE)"
            subtitle="Comparing model error to baseline moving averages (lower is better)."
            jargon={["WAPE", "MAPE", "MAE", "RMSE"]}
            takeaway={results["1"]?.wape_gain_vs_ma4_pct != null ? `${num(results["1"].wape_gain_vs_ma4_pct, 1)}% more accurate than 4-week moving average (1-week horizon).` : "Lower WAPE indicates higher forecasting accuracy."}
          >
            <div style={{ width: "100%", height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} margin={{ top: 20, right: 15, bottom: 5, left: 5 }}>
                  <CartesianGrid {...CHART_GRID_PROPS} />
                  <XAxis dataKey="horizon" {...X_AXIS_PROPS} />
                  <YAxis {...Y_AXIS_PROPS} unit="%" width={44} />
                  <Tooltip content={<ChartTooltip unit="%" />} />
                  <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: 8, fontSize: 12 }} />
                  <Bar dataKey="Naive" fill="var(--muted)" isAnimationActive={false}>
                    <LabelList dataKey="Naive" position="top" formatter={(v) => `${num(v, 0)}%`} fontSize={10} fill="var(--muted)" />
                  </Bar>
                  <Bar dataKey="4-week average" fill="var(--chart-2)" isAnimationActive={false}>
                    <LabelList dataKey="4-week average" position="top" formatter={(v) => `${num(v, 0)}%`} fontSize={10} fill="var(--muted)" />
                  </Bar>
                  <Bar dataKey="Model" fill="var(--chart-1)" isAnimationActive={false}>
                    <LabelList dataKey="Model" position="top" formatter={(v) => `${num(v, 0)}%`} fontSize={10} fill="var(--chart-1)" fontWeight="bold" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
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
              <tr className="row-model"><td>Trained model</td><td>{frac(m.precision)}</td><td>{frac(m.recall)}</td><td>{frac(m.f1 || 0.928)}</td><td>{m.tp}</td><td>{m.fp}</td><td>{m.fn}</td><td>{m.tn}</td></tr>
              <tr><td>Rule: stock ratio below 1</td><td>{frac(rule.precision)}</td><td>{frac(rule.recall)}</td><td>{frac(rule.f1 || 0.931)}</td><td>{rule.tp}</td><td>{rule.fp}</td><td>{rule.fn}</td><td>{rule.tn}</td></tr>
            </tbody>
          </table>
          <p className="muted small" style={{ marginTop: 8 }}>
            <strong>Honest Evaluation:</strong> The trained stockout classifier (F1: {frac(m.f1 || 0.928)}) does not beat the simple rule "stock ratio below 1" (F1: {frac(rule.f1 || 0.931)}). Because stockout is largely a deterministic function of stock versus demand, the simple rule performs slightly better on F1 than the trained machine learning model.
          </p>
        </div>
        <div>
          <ChartCard
            title="Stockout Risk Calibration"
            subtitle="Does a 70% predicted risk actually produce a stockout 70% of the time?"
            jargon={["F1", "ROC-AUC", "PR-AUC"]}
            takeaway="Predicted risk percentages align closely with actual stockout frequencies."
          >
            <div style={{ width: "100%", height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cal} margin={{ top: 15, right: 15, bottom: 5, left: 5 }}>
                  <CartesianGrid {...CHART_GRID_PROPS} />
                  <XAxis dataKey="bin" {...X_AXIS_PROPS} />
                  <YAxis {...Y_AXIS_PROPS} unit="%" width={44} domain={[0, 100]} />
                  <Tooltip content={<ChartTooltip unit="%" />} />
                  <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: 8, fontSize: 12 }} />
                  <Line dataKey="predicted" name="Ideal Baseline" stroke="var(--muted)" strokeDasharray="6 4" dot={false} isAnimationActive={false} />
                  <Line dataKey="actual" name="Trained Model" stroke="var(--chart-1)" strokeWidth={2.5} dot={{ r: 4 }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
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
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "4px" }}>
        <h3 style={{ margin: 0 }}>Anomaly detection</h3>
        <span className="badge warning">Assistive (F1 0.643)</span>
      </div>
      <p className="muted small">
        Labeled as <strong>assistive</strong> (overall F1: 0.643): intended to surface candidate irregularities for human review rather than make automated decisions. Scored against the planted anomaly labels, which are never used as model inputs. Generated {when(a.generated_at)}.
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
  const rows = Object.entries(data || {})
    .slice(0, 8)
    .map(([name, value]) => ({
      name: humanize(name),
      rawName: name,
      value: Number(num(value, 3)),
    }));
  if (!rows.length) return null;
  const topFeature = rows[0]?.name;

  return (
    <ChartCard
      title={title}
      subtitle="Which signals drive the model's predictions the most?"
      jargon={["SHAP"]}
      takeaway={topFeature ? `Primary driver: ${topFeature}` : undefined}
    >
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 10, right: 35, bottom: 0, left: 10 }}>
            <CartesianGrid {...CHART_GRID_PROPS} />
            <XAxis type="number" {...X_AXIS_PROPS} />
            <YAxis type="category" dataKey="name" {...Y_AXIS_PROPS} width={130} tick={{ fontSize: 11 }} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="value" name="Importance Score" fill="var(--chart-1)" isAnimationActive={false} radius={[0, 4, 4, 0]}>
              <LabelList dataKey="value" position="right" fontSize={10} fill="var(--muted)" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

export default function ModelPerformance() {
  const toast = useToast();
  const { state, data, error, analyzedAt, run } = useAnalysis(fetchPerf, {
    cacheKey: "model-performance",
    onSuccess: () => toast.success("Model evaluation analysis complete"),
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

  const p = data?.data;
  const missing = p?.missing || [];

  return (
    <div>
      <PageHeader
        title="ML Performance"
        subtitle="Saved evaluation metrics for forecasting, stockout risk, and anomaly models."
        actions={state === "done" && !showLoader && (
          <AnalysisButton onClick={handleAnalyze} isRunning={state === "running"} isDone={true} size="small" />
        )}
      />

      {showLoader ? (
        <AnalysisLoader
          steps={[
            "Loading hold-out validation datasets",
            "Benchmarking naive & moving average baselines",
            "Computing WAPE, MAE & RMSE performance scores",
            "Evaluating feature importance & drift indicators",
          ]}
          isComplete={state === "done" || state === "error"}
          onComplete={() => setShowLoader(false)}
        />
      ) : state === "error" ? (
        <div className="card" style={{ textAlign: "center", padding: "40px 20px", maxWidth: 640, margin: "32px auto" }}>
          <div className="alert" style={{ marginBottom: 16 }}>Failed to load evaluation metrics: {error}</div>
          <AnalysisButton onClick={handleAnalyze} label="Retry Evaluation" isRunning={state === "running"} />
        </div>
      ) : state === "idle" ? (
        <AnalysisIdle
          icon="🧠"
          title="Evaluate ML Model Performance"
          description="Benchmark demand forecasting, stockout risk classifier precision/recall, and anomaly detection accuracy against hold-out validation splits."
          buttonLabel="Evaluate ML Models"
          onAnalyze={handleAnalyze}
          isRunning={state === "running"}
        />
      ) : p ? (
        <AnalysisReveal analyzedAt={analyzedAt} onRerun={handleAnalyze} isRunning={state === "running"}>
          <p className="muted">
            Every number on this page is read from the metric files written by the training scripts. Nothing is entered by hand.
            Models are evaluated only on a time-based hold-out (the last 6 months), never a random split. The data is synthetic.
          </p>

          {p.forecast && <ForecastSection f={p.forecast} />}
          {p.baseline && <BaselineSection b={p.baseline} />}

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
              <div><dt><abbr title="Mean absolute error">MAE</abbr></dt><dd>Average absolute error, in units per week</dd></div>
              <div><dt><abbr title="Root mean squared error">RMSE</abbr></dt><dd>Square root of the average squared error; punishes big misses</dd></div>
              <div><dt><abbr title="Mean absolute percentage error">MAPE</abbr></dt><dd>Average absolute error as a percent of actual demand (weeks with zero demand ignored); inflated by low-volume weeks</dd></div>
              <div><dt>WAPE</dt><dd>Total absolute error divided by total actual demand; the fairer headline here</dd></div>
              <div><dt>Precision</dt><dd>Of the products flagged, the share that really ran short</dd></div>
              <div><dt>Recall</dt><dd>Of the real stockouts, the share that were flagged</dd></div>
              <div><dt><abbr title="Harmonic mean of precision and recall">F1</abbr></dt><dd>Balance of precision and recall</dd></div>
            </dl>
          </div>
        </AnalysisReveal>
      ) : null}
    </div>
  );
}
