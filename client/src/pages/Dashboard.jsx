import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import api, { errorMessage } from "../services/api";
import { insightService, purchaseOrderService } from "../services";
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
import { formatDate, fmtDate, num } from "../utils/format";
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
  const [recentPOs, setRecentPOs] = useState([]);

  useEffect(() => {
    api.get("/health").then((r) => setServer(r.data.status)).catch(() => setServer("down"));
    axios.get(`${import.meta.env.VITE_ML_URL}/health`).then((r) => setMl(r.data.status)).catch(() => setMl("down"));
    purchaseOrderService.list({ limit: 4, sort: "-orderDate" })
      .then((r) => setRecentPOs(r.data?.data || []))
      .catch(() => {});

    const pollInterval = setInterval(() => {
      reload();
      purchaseOrderService.list({ limit: 4, sort: "-orderDate" })
        .then((r) => setRecentPOs(r.data?.data || []))
        .catch(() => {});
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
  const criticalProducts = items
    .filter((item) => item.priority === "Critical" || item.riskPct >= 35)
    .sort((a, b) => (b.riskPct || 0) - (a.riskPct || 0))
    .slice(0, 5);
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

          <div className="grid2" style={{ marginBottom: "16px" }}>
            <section className="card attention-card" style={{ margin: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h3 style={{ margin: 0 }}><Icon name="alert" size={18} /> Top Attention Needed</h3>
                <Link to="/alerts" className="small" style={{ color: "var(--primary)", textDecoration: "none" }}>View all alerts →</Link>
              </div>
              {criticalProducts.length ? (
                <ul className="attention-list">
                  {criticalProducts.map((item) => {
                    const reason = item.daysOfCover < item.daysToDelivery
                      ? `${num(item.daysOfCover, 0)}d stock vs ${num(item.daysToDelivery, 0)}d delivery`
                      : `${num(item.riskPct, 0)}% stockout risk`;
                    const qty = item.orderQty || item.data?.reorder?.order_qty || 1;
                    const supId = item.data?.reorder?.supplier_id || item.data?.supplier?.id;
                    return (
                      <li key={item._id} className="attention-item" style={{ padding: "8px 0" }}>
                        <ProductCell product={{ code: item.productCode, name: item.data?.name }} size="sm" imageList={criticalProducts} />
                        <div className="attention-meta" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <span className="attention-reason small" style={{ color: "var(--danger)", fontWeight: 500 }}>{reason}</span>
                          {canWrite && (
                            <Link
                              className="btn small primary"
                              to={`/purchase-orders/new?productCode=${item.productCode}&qty=${qty}${supId ? `&supplierCode=${supId}` : ""}`}
                            >
                              PO
                            </Link>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : !hasInsights ? (
                <p className="muted small">Insights not computed yet. Click Refresh insights.</p>
              ) : (
                <p className="muted small">No critical products right now.</p>
              )}
            </section>

            <section className="card" style={{ margin: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h3 style={{ margin: 0 }}><Icon name="package" size={18} /> Live Activity Feed</h3>
                <Link to="/purchase-orders" className="small" style={{ color: "var(--primary)", textDecoration: "none" }}>All orders →</Link>
              </div>
              {recentPOs.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {recentPOs.map((po) => {
                    const totalQty = (po.items || []).reduce((acc, it) => acc + (it.quantityOrdered || 0), 0);
                    const recQty = (po.items || []).reduce((acc, it) => acc + (it.quantityReceived || 0), 0);
                    const pct = totalQty > 0 ? Math.round((recQty / totalQty) * 100) : 0;
                    return (
                      <div key={po._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: "var(--bg-subtle, rgba(0,0,0,0.02))", borderRadius: "6px", border: "1px solid var(--border)" }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                            <Link to={`/purchase-orders/${po._id}`} style={{ color: "var(--text)" }}>{po.orderNumber}</Link>
                            <span className="muted" style={{ fontWeight: 400, marginLeft: "6px" }}>• {po.supplier?.name || "Supplier"}</span>
                          </div>
                          <div className="muted small" style={{ fontSize: "0.75rem", marginTop: "2px" }}>
                            {po.orderDate ? fmtDate(po.orderDate) : "Recent"} • {totalQty} units ({pct}% received)
                          </div>
                        </div>
                        <Pill value={po.status} />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="muted small">No recent purchase orders found.</p>
              )}
            </section>
          </div>

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
