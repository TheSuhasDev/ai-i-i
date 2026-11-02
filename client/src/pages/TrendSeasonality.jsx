import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useAnalysis from "../hooks/useAnalysis";
import useToast from "../context/useToast";
import useFetch from "../hooks/useFetch";
import { insightService } from "../services";
import { num } from "../utils/format";
import { TrendSeasonality } from "./ProductInsight";
import PageHeader from "../components/PageHeader";
import ProductCell from "../components/ProductCell";
import { AnalysisButton, AnalysisIdle, AnalysisLoader, AnalysisReveal } from "../components/analysis";

const PATTERNS = [
  { key: "increasing", label: "Increasing" },
  { key: "decreasing", label: "Decreasing" },
  { key: "stable", label: "Stable" },
  { key: "seasonal", label: "Seasonal" },
  { key: "increasing+seasonal", label: "Increasing + seasonal" },
];

function patternKey(trend) {
  const pattern = String(trend?.pattern || "").toLowerCase().replace(/[\s_-]/g, "");
  if (pattern.includes("seasonal") && (pattern.startsWith("increasing") || pattern.startsWith("trend"))) {
    return "increasing+seasonal";
  }
  return PATTERNS.some(({ key }) => key === pattern) ? pattern : "unknown";
}

function badgeClass(key) {
  return key === "increasing+seasonal" ? "trend-pattern-trend-seasonal" : `trend-pattern-${key}`;
}

function SelectedTrendCharts({ product }) {
  const trend = product?.trend;
  const hasCharts = Array.isArray(trend?.weekly_series) && Array.isArray(trend?.monthly_index);
  const fetchProduct = useCallback(() => (
    !hasCharts ? insightService.get(product.product_id) : Promise.resolve({ data: null })
  ), [product.product_id, hasCharts]);
  const detail = useFetch(fetchProduct);
  const detailedProduct = detail.data?.data?.product_id === product.product_id ? detail.data.data : null;
  const displayedTrend = detailedProduct?.trend || trend;

  return (
    <>
      {!hasCharts && detail.loading && <p className="muted">Loading detailed trend charts…</p>}
      {!hasCharts && detail.error && <div className="alert">Could not load detailed charts: {detail.error}</div>}
      {(hasCharts || detailedProduct || detail.error) && <TrendSeasonality trend={displayedTrend} />}
    </>
  );
}

export default function TrendSeasonalityPage() {
  const toast = useToast();
  const fetchFull = useCallback(() => insightService.list({ full: 1 }), []);
  const { state, data, error, analyzedAt, run } = useAnalysis(fetchFull, {
    cacheKey: "trend-seasonality",
    onSuccess: () => toast.success("Trend & seasonality analysis complete"),
  });
  const [showLoader, setShowLoader] = useState(false);

  const handleAnalyze = async () => {
    setShowLoader(true);
    try {
      await run();
    } catch {
      // Handled in useAnalysis
    }
  };

  const [activePattern, setActivePattern] = useState("");
  const [selectedCode, setSelectedCode] = useState("");
  const [sortBy, setSortBy] = useState("code");
  const [sortDirection, setSortDirection] = useState("asc");

  const products = useMemo(() => (data?.data ?? [])
    .map((item) => item?.data && ({ ...item.data, product_id: item.data.product_id || item.productCode }))
    .filter(Boolean), [data]);
  const rows = useMemo(() => products
    .filter((product) => !activePattern || patternKey(product.trend) === activePattern)
    .sort((a, b) => {
      if (sortBy === "code") {
        return a.product_id.localeCompare(b.product_id) * (sortDirection === "asc" ? 1 : -1);
      }
      const aYoy = Number(a.trend?.yoy_change_pct);
      const bYoy = Number(b.trend?.yoy_change_pct);
      const aMissing = !Number.isFinite(aYoy);
      const bMissing = !Number.isFinite(bYoy);
      if (aMissing !== bMissing) return aMissing ? 1 : -1;
      return (aYoy - bYoy) * (sortDirection === "desc" ? -1 : 1);
    }), [products, activePattern, sortBy, sortDirection]);

  const selected = rows.find((product) => product.product_id === selectedCode) || rows[0];
  const selectedProductCode = selected?.product_id;
  const counts = useMemo(() => {
    const byPattern = Object.fromEntries(PATTERNS.map(({ key }) => [key, 0]));
    products.forEach((product) => {
      const key = patternKey(product.trend);
      if (key in byPattern) byPattern[key] += 1;
    });
    return byPattern;
  }, [products]);

  return (
    <div>
      <PageHeader
        title="Trend &amp; Seasonality"
        subtitle="Compare year-over-year demand changes and recurring monthly patterns across products."
        actions={state === "done" && !showLoader && (
          <AnalysisButton onClick={handleAnalyze} isRunning={state === "running"} isDone={true} size="small" />
        )}
      />

      {showLoader ? (
        <AnalysisLoader
          steps={[
            "Extracting sales time-series",
            "Analyzing seasonal patterns",
            "Computing YoY growth rates",
            "Finalizing catalog insights",
          ]}
          isComplete={state === "done" || state === "error"}
          onComplete={() => setShowLoader(false)}
        />
      ) : state === "error" ? (
        <div className="card" style={{ textAlign: "center", padding: "40px 20px", maxWidth: 640, margin: "32px auto" }}>
          <div className="alert" style={{ marginBottom: 16 }}>Failed to run trend analysis: {error}</div>
          <AnalysisButton onClick={handleAnalyze} label="Retry Analysis" isRunning={state === "running"} />
        </div>
      ) : state === "idle" ? (
        <AnalysisIdle
          icon="📈"
          title="Analyze Demand Trends & Seasonality"
          description="Decompose historical sales into underlying trend trajectories, cyclical monthly seasonality, and annual YoY demand shifts across your product catalog."
          buttonLabel="Analyze Trends"
          onAnalyze={handleAnalyze}
          isRunning={state === "running"}
        />
      ) : (
        <AnalysisReveal analyzedAt={analyzedAt} onRerun={handleAnalyze} isRunning={state === "running"}>
          <div className="chips trend-filter-chips" aria-label="Filter products by demand pattern">
            <button type="button" className={`chip ${activePattern === "" ? "active" : ""}`} onClick={() => setActivePattern("")}>
              All <span>{products.length}</span>
            </button>
            {PATTERNS.map(({ key, label }) => (
              <button
                type="button"
                key={key}
                className={`chip ${activePattern === key ? "active" : ""}`}
                aria-pressed={activePattern === key}
                onClick={() => setActivePattern(activePattern === key ? "" : key)}
              >
                {label} <span>{counts[key]}</span>
              </button>
            ))}
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
                        if (sortBy === "code") setSortDirection((d) => d === "asc" ? "desc" : "asc");
                        else { setSortBy("code"); setSortDirection("asc"); }
                      }}
                    >
                      Product {sortBy === "code" ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                    </button>
                  </th>
                  <th>Pattern</th>
                  <th>
                    <button
                      type="button"
                      className="sort-button"
                      onClick={() => {
                        if (sortBy === "yoy") setSortDirection((d) => d === "desc" ? "asc" : "desc");
                        else { setSortBy("yoy"); setSortDirection("desc"); }
                      }}
                    >
                      YoY change % {sortBy === "yoy" ? (sortDirection === "desc" ? "↓" : "↑") : ""}
                    </button>
                  </th>
                  <th>Peak month</th><th>Uplift %</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={5} className="center">{products.length ? "No products match this pattern." : "No saved product insights are available."}</td></tr>
                ) : rows.map((product) => {
                  const key = patternKey(product.trend);
                  const isSelected = selectedProductCode === product.product_id;
                  const yoy = product.trend?.yoy_change_pct;
                  return (
                    <tr
                      key={product.product_id}
                      className={`trend-select-row ${isSelected ? "selected-trend-row" : ""}`}
                      tabIndex={0}
                      aria-selected={isSelected}
                      onClick={() => setSelectedCode(product.product_id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedCode(product.product_id);
                        }
                      }}
                    >
                      <td><ProductCell product={product} size="md" to={null} imageList={rows} /></td>
                      <td><span className={`trend-pattern ${badgeClass(key)}`}>{key === "increasing+seasonal" ? "Increasing + seasonal" : key}</span></td>
                      <td>{yoy == null ? "—" : `${Number(yoy) > 0 ? "+" : ""}${num(yoy, 1)}%`}</td>
                      <td>{product.trend?.peak_month || "—"}</td>
                      <td>{product.trend?.peak_uplift_pct == null ? "—" : `${num(product.trend.peak_uplift_pct, 1)}%`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {selected && (
            <section className="trend-selected-product">
              <div className="page-head">
                <ProductCell product={selected} size="lg" imageList={products} />
                <Link className="btn small" to={`/product/${selected.product_id}`}>Open product</Link>
              </div>
              <SelectedTrendCharts key={selectedProductCode} product={selected} />
            </section>
          )}
        </AnalysisReveal>
      )}
    </div>
  );
}
