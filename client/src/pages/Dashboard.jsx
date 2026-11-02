import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import api, { errorMessage } from "../services/api";
import { insightService } from "../services";
import useAuth from "../context/useAuth";
import useToast from "../context/useToast";
import useFetch from "../hooks/useFetch";
import HealthChart from "../components/HealthChart";
import AbcXyzMatrix from "../components/AbcXyzMatrix";
import Pill from "../components/Pill";
import PageHeader from "../components/PageHeader";
import MetricCard from "../components/MetricCard";
import Icon from "../components/Icon";
import ProductCell from "../components/ProductCell";
import { formatDate, num } from "../utils/format";
import StaleDataBanner from "../components/StaleDataBanner";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const fetchSummary = () => insightService.list();
const TREND_PATTERNS = ["increasing", "decreasing", "stable", "seasonal", "trend + seasonal"];
const TREND_COLORS = {
  increasing: "var(--success)",
  decreasing: "var(--danger)",
  stable: "var(--muted)",
  seasonal: "var(--accent)",
  "trend + seasonal": "var(--warning)",
};

function TrendLeaders({ title, items, emptyText }) {
  return (
    <div className="trend-leaders">
      <h4>{title}</h4>
      {items.length ? (
        <ol>
          {items.map((item) => {
            const change = item.trend.yoy_change_pct;
            return (
              <li key={item.code}>
                <ProductCell product={item} size="md" imageList={items} />
                <strong>{change > 0 ? "+" : ""}{num(change, 1)}%</strong>
              </li>
            );
          })}
        </ol>
      ) : <p className="muted small">{emptyText}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { canWrite } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(fetchSummary);
  const [refreshing, setRefreshing] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("info");
  const [server, setServer] = useState("loading");
  const [ml, setMl] = useState("loading");
  const [lastChecked, setLastChecked] = useState(() => new Date());

  useEffect(() => {
    api.get("/health").then((r) => setServer(r.data.status)).catch(() => setServer("down"));
    axios.get(`${import.meta.env.VITE_ML_URL}/health`).then((r) => setMl(r.data.status)).catch(() => setMl("down"));

    const pollInterval = setInterval(() => {
      reload();
      setLastChecked(new Date());
    }, 60000);
    return () => clearInterval(pollInterval);
  }, [reload]);

  const items = data?.data ?? [];
  const critical = items.filter((i) => i.priority === "Critical").length;
  const atRisk = items.filter((i) => i.riskPct >= 30).length;
  const reorderNow = items.filter((i) => i.orderQty > 0).length;
  const avgHealth = items.length ? items.reduce((s, i) => s + i.healthScore, 0) / items.length : null;
  const latest = items.reduce((m, i) => (i.computedAt > m ? i.computedAt : m), "");
  const dataDate = data?.dataDate
    || data?.dataAsOf
    || items.find((i) => i.dataAsOf)?.dataAsOf
    || items.find((i) => i.data?.data_as_of)?.data?.data_as_of
    || items.find((i) => i.data?.inputs?.data_as_of)?.data?.inputs?.data_as_of
    || null;
  const trendProducts = items.flatMap((item) => {
    const trend = item.data?.trend;
    return trend?.pattern ? [{ code: item.productCode, name: item.data?.name || item.productCode, trend }] : [];
  });
  const trendPatternCounts = TREND_PATTERNS.map((pattern) => ({
    pattern,
    products: trendProducts.filter(({ trend }) =>
      pattern === "trend + seasonal" ? trend.pattern.includes("+ seasonal") : trend.pattern === pattern
    ).length,
  }));
  const increasing = trendProducts
    .filter(({ trend }) => trend.trend === "increasing")
    .sort((a, b) => b.trend.yoy_change_pct - a.trend.yoy_change_pct)
    .slice(0, 5);
  const decreasing = trendProducts
    .filter(({ trend }) => trend.trend === "decreasing")
    .sort((a, b) => a.trend.yoy_change_pct - b.trend.yoy_change_pct)
    .slice(0, 5);
  const criticalProducts = items.filter((item) => item.priority === "Critical").slice(0, 3);
  const hasInsights = Boolean(latest || (items.length > 0 && (critical > 0 || atRisk > 0 || reorderNow > 0 || avgHealth != null)));

  const refresh = async () => {
    setRefreshing(true);
    setMsg("");
    try {
      const r = await insightService.refresh();
      const d = r.data.data;
      if (d.failed?.length) {
        const errorText = `Refreshed ${d.ok} of ${d.total} products (${d.failed.length} failed).`;
        setMsg(errorText);
        setMsgType("error");
        toast.warning(errorText);
      } else {
        const successText = `Successfully refreshed ${d.ok} of ${d.total} products.`;
        setMsg(successText);
        setMsgType("ok");
        toast.success(successText);
      }
      reload();
      setLastChecked(new Date());
    } catch (e) {
      const msgText = errorMessage(e);
      setMsg(msgText);
      setMsgType("error");
      toast.error(msgText);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="A quick view of inventory health, stockout risk, and products that need attention." actions={
        <>
          <span className="muted small" title="Auto-refreshes every 60s">
            Live • Checked {lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {latest && <span className="muted small">ML computed {formatDate(latest)}</span>}
          {canWrite && (
            <button className="btn primary" onClick={refresh} disabled={refreshing}>
              {refreshing ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  <span>Refreshing (about a minute)...</span>
                </>
              ) : (
                "Refresh insights"
              )}
            </button>
          )}
        </>
      } />
      <StaleDataBanner date={dataDate} />
      {msg && <div className={`alert ${msgType === "ok" ? "ok" : msgType === "error" ? "" : "info"}`}>{msg}</div>}
      {error && <div className="alert">{error}</div>}

      {!loading && !error && items.length === 0 ? (
        <div className="card empty">
          <h3>No insights yet</h3>
          <p className="muted">
            {canWrite
              ? "Make sure the ML service is running, then click Refresh insights."
              : "Ask an admin or manager to refresh the insights."}
          </p>
        </div>
      ) : (
        <>
          <div className="cards">
            <Link to="/alerts" className="card-link"><MetricCard label="Critical alerts" value={critical} sub="May stock out before delivery" icon="alert" tone={critical ? "tone-critical" : "tone-healthy"} /></Link>
            <MetricCard label="Products at risk" value={atRisk} sub="Stockout risk at 30% or more" icon="shield" tone="tone-warning" />
            <MetricCard label="Average health" value={avgHealth == null ? "-" : num(avgHealth, 1)} sub="Out of 100" icon="trend" progress={avgHealth ?? undefined} tone="tone-healthy" />
            <Link to="/reorder" className="card-link"><MetricCard label="Reorder now" value={reorderNow} sub="Products needing an order" icon="package" /></Link>
          </div>

          <section className="card attention-card">
            <h3><Icon name="alert" size={18} /> What needs attention today</h3>
            {criticalProducts.length ? (
              <ul className="attention-list">
                {criticalProducts.map((item) => {
                  const reason = item.daysOfCover < item.daysToDelivery
                    ? `About ${num(item.daysOfCover, 0)} days of stock left; delivery takes ${num(item.daysToDelivery, 0)} days.`
                    : `${num(item.riskPct, 0)}% estimated stockout risk.`;
                  const qty = item.orderQty || item.data?.reorder?.order_qty || 1;
                  const supId = item.data?.reorder?.supplier_id || item.data?.supplier?.id;
                  return (
                    <li key={item._id} className="attention-item">
                      <ProductCell product={{ code: item.productCode, name: item.data?.name }} size="lg" imageList={criticalProducts} />
                      <div className="attention-meta">
                        <span className="attention-reason">{reason}</span>
                        {canWrite && (
                          <Link
                            className="btn small primary"
                            to={`/purchase-orders/new?productCode=${item.productCode}&qty=${qty}${supId ? `&supplierCode=${supId}` : ""}`}
                          >
                            Create PO
                          </Link>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : !hasInsights ? (
              <p className="muted">Insights not computed yet. Click Refresh insights.</p>
            ) : (
              <p className="muted">No critical products right now.</p>
            )}
          </section>

          <div className="grid2">
            <div className="card">
              <h3>Health distribution</h3>
              <HealthChart items={items} />
            </div>
            <div className="card">
              <h3><abbr title="ABC ranks products by value contribution; XYZ groups them by demand variability">ABC-XYZ matrix</abbr></h3>
              <AbcXyzMatrix items={items} />
            </div>
          </div>

          <section className="card trend-dashboard">
            <h3>Trend &amp; Seasonality</h3>
            {loading ? <p className="muted">Loading saved trend data...</p> : error ? (
              <div className="alert">Trend data unavailable: {error}</div>
            ) : trendProducts.length === 0 ? (
              <p className="muted">No saved trend data yet. Refresh insights to compute product trends.</p>
            ) : (
              <>
                {trendProducts.length < items.length && (
                  <p className="muted small">Trend data is missing for {items.length - trendProducts.length} product(s); refresh insights to update it.</p>
                )}
                <div className="trend-count-chart">
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={trendPatternCounts} margin={{ top: 8, right: 16, bottom: 10, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                      <XAxis dataKey="pattern" interval={0} angle={-10} textAnchor="end" height={55} />
                      <YAxis allowDecimals={false} width={40} />
                      <Tooltip />
                      <Bar dataKey="products" name="Products" isAnimationActive={false}>
                        {trendPatternCounts.map((row) => <Cell key={row.pattern} fill={TREND_COLORS[row.pattern]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid2">
                  <TrendLeaders title="Top increasing products" items={increasing} emptyText="No increasing products found." />
                  <TrendLeaders title="Top decreasing products" items={decreasing} emptyText="No decreasing products found." />
                </div>
              </>
            )}
          </section>

          <h3>Most urgent products</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Product</th><th>Priority</th><th>Health</th><th className="numeric">Stockout risk</th><th className="numeric">Days of stock left</th><th className="numeric">Order qty</th></tr>
              </thead>
              <tbody>
                {items.slice(0, 8).map((i) => (
                  <tr key={i._id}>
                    <td><ProductCell product={{ code: i.productCode, name: i.data?.name }} size="md" imageList={items} /></td>
                    <td><Pill value={i.priority} /></td>
                    <td><Pill value={i.healthStatus} /> {num(i.healthScore, 0)}</td>
                    <td className="numeric"><span className="inline-meter"><span style={{ width: `${Math.min(100, Math.max(0, i.riskPct))}%` }} /></span>{num(i.riskPct, 0)}%</td>
                    <td className="numeric">{num(i.daysOfCover, 1)}</td>
                    <td className="numeric">{i.orderQty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className="muted small status-line">
        Services: server {server} | ML service {ml}
      </p>
    </div>
  );
}
