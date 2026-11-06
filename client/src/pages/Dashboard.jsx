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
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard, ChartTooltip, CHART_GRID_PROPS, X_AXIS_PROPS, Y_AXIS_PROPS } from "../components/charts";
import { AnalysisButton, AnalysisLoader, AnalysisReveal, AnimatedNumber } from "../components/analysis";

const fetchSummary = () => insightService.list();
const TREND_PATTERNS = ["trend + seasonal", "seasonal", "increasing", "stable", "decreasing"];
const PATTERN_LABELS = {
  increasing: "Growing demand",
  decreasing: "Declining demand",
  stable: "Stable demand",
  seasonal: "Seasonal cycles",
  "trend + seasonal": "Growing + seasonal",
};
const TREND_COLORS = {
  increasing: "var(--success, #10b981)",
  decreasing: "var(--danger, #ef4444)",
  stable: "var(--muted, #9ca3af)",
  seasonal: "var(--accent, #818cf8)",
  "trend + seasonal": "var(--warning, #f59e0b)",
};

function TrendLeaders({ title, items, emptyText, type = "up" }) {
  const isUp = type === "up";
  return (
    <div className="trend-leaders" style={{ background: "var(--surface-raised, #171c27)", padding: "14px 16px", borderRadius: "10px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
        <span style={{ color: isUp ? "var(--success, #10b981)" : "var(--danger, #ef4444)", fontWeight: 700, fontSize: "14px" }}>
          {isUp ? "↑" : "↓"}
        </span>
        <h4 style={{ margin: 0, fontSize: "0.92rem", fontWeight: 600 }}>{title}</h4>
      </div>
      {items.length ? (
        <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
          {items.map((item) => {
            const change = item.trend.yoy_change_pct;
            return (
              <li
                key={item.code}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                  padding: "6px 8px",
                  borderRadius: "6px",
                  background: "var(--surface, #11151e)",
                  border: "1px solid var(--border, #252b39)",
                }}
              >
                <ProductCell product={item} size="md" imageList={items} />
                <span
                  className={`pill ${change > 0 ? "status-healthy" : "status-critical"}`}
                  style={{ fontSize: "11px", fontWeight: 700, padding: "2px 8px" }}
                >
                  {change > 0 ? "+" : ""}{num(change, 1)}%
                </span>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="muted small">{emptyText}</p>
      )}
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
  const [selectedHealthStatus, setSelectedHealthStatus] = useState(null);

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
  const sortedTrendPatterns = TREND_PATTERNS.map((pattern) => ({
    pattern,
    label: PATTERN_LABELS[pattern] || pattern,
    products: trendProducts.filter(({ trend }) =>
      pattern === "trend + seasonal" ? trend.pattern?.includes("+ seasonal") : trend.pattern === pattern
    ).length,
  })).sort((a, b) => b.products - a.products);

  const seasonalTotal = sortedTrendPatterns.filter((p) => p.pattern.includes("seasonal")).reduce((s, p) => s + p.products, 0);
  const growingTotal = sortedTrendPatterns.find((p) => p.pattern === "increasing")?.products || 0;
  const trendTakeaway = `${seasonalTotal} product${seasonalTotal === 1 ? "" : "s"} experience seasonal surges; ${growingTotal} show${growingTotal === 1 ? "s" : ""} steady demand growth.`;
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

  const [showRefreshLoader, setShowRefreshLoader] = useState(false);
  const [refreshComplete, setRefreshComplete] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    setShowRefreshLoader(true);
    setRefreshComplete(false);
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
      setRefreshComplete(true);
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
            <AnalysisButton
              onClick={refresh}
              isRunning={refreshing || showRefreshLoader}
              isDone={Boolean(latest)}
              label="Refresh insights"
              rerunLabel="Refresh insights"
              size="normal"
            />
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
            <Link to="/alerts" className="card-link"><MetricCard label="Critical alerts" value={<AnimatedNumber value={critical} />} sub="May stock out before delivery" icon="alert" tone={critical ? "tone-critical" : "tone-healthy"} /></Link>
            <MetricCard label="Products at risk" value={<AnimatedNumber value={atRisk} />} sub="Stockout risk at 30% or more" icon="shield" tone="tone-warning" />
            <MetricCard label="Average health" value={avgHealth == null ? "-" : <AnimatedNumber value={avgHealth} decimals={1} />} sub="Out of 100" icon="trend" progress={avgHealth ?? undefined} tone="tone-healthy" />
            <Link to="/reorder" className="card-link"><MetricCard label="Reorder now" value={<AnimatedNumber value={reorderNow} />} sub="Products needing an order" icon="package" /></Link>
          </div>

          {showRefreshLoader ? (
            <div style={{ margin: "24px 0" }}>
              <AnalysisLoader
                steps={[
                  "Syncing inventory balances & open shipments",
                  "Computing lead-time demand & stockout probabilities",
                  "Evaluating supplier delivery reliability",
                  "Synthesizing catalog ABC-XYZ and trend metrics",
                ]}
                isComplete={refreshComplete}
                onComplete={() => setShowRefreshLoader(false)}
              />
            </div>
          ) : (
            <AnalysisReveal analyzedAt={latest ? new Date(latest) : null}>

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
                    const reorder = item.data?.reorder;
                    const supId = (reorder?.supplier_risk_level === "High" && reorder?.alternate_supplier?.supplier_id)
                      ? reorder.alternate_supplier.supplier_id
                      : reorder?.supplier_id || item.data?.supplier?.id;
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
                    const totalQty = po.qtyOrdered || (po.items || []).reduce((acc, it) => acc + (it.quantityOrdered || 0), 0) || 0;
                    const recQty = po.qtyReceived != null ? po.qtyReceived : (po.items || []).reduce((acc, it) => acc + (it.quantityReceived || 0), 0);
                    const pct = totalQty > 0 ? Math.round((recQty / totalQty) * 100) : 0;
                    const poName = po.poNumber || po.orderNumber || "Purchase Order";
                    return (
                      <div key={po._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: "var(--bg-subtle, rgba(0,0,0,0.02))", borderRadius: "6px", border: "1px solid var(--border)" }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                            <Link to={`/purchase-orders/${po._id}`} style={{ color: "var(--text)" }}>{poName}</Link>
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
            <HealthChart
              items={items}
              onSelectStatus={(status) => setSelectedHealthStatus((prev) => (prev === status ? null : status))}
              selectedStatus={selectedHealthStatus}
            />
            <AbcXyzMatrix items={items} />
          </div>

          <ChartCard
            title="What demand patterns are driving our products?"
            subtitle="Categorizes demand velocity and seasonality so purchasing can anticipate spikes."
            jargon={["YoY", "80% range"]}
            takeaway={trendTakeaway}
            takeawayTone="info"
            ariaLabel="Trend and seasonality breakdown chart"
          >
            {loading ? (
              <p className="muted">Loading saved trend data...</p>
            ) : error ? (
              <div className="alert">Trend data unavailable: {error}</div>
            ) : trendProducts.length === 0 ? (
              <p className="muted">No saved trend data yet. Refresh insights to compute product trends.</p>
            ) : (
              <>
                {trendProducts.length < items.length && (
                  <p className="muted small" style={{ marginBottom: "10px" }}>
                    Trend data is missing for {items.length - trendProducts.length} product(s); refresh insights to update it.
                  </p>
                )}
                <div style={{ width: "100%", height: 210 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={sortedTrendPatterns}
                      margin={{ top: 8, right: 35, bottom: 8, left: 15 }}
                    >
                      <CartesianGrid {...CHART_GRID_PROPS} horizontal={false} vertical={true} />
                      <XAxis type="number" allowDecimals={false} {...X_AXIS_PROPS} />
                      <YAxis
                        type="category"
                        dataKey="label"
                        width={140}
                        {...Y_AXIS_PROPS}
                        tick={{ fill: "var(--text)", fontSize: 12, fontWeight: 500 }}
                      />
                      <Tooltip
                        content={<ChartTooltip formatter={(value) => [`${value} products`, "Products"]} />}
                      />
                      <Bar dataKey="products" name="Products" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                        <LabelList
                          dataKey="products"
                          position="right"
                          offset={8}
                          fill="var(--text)"
                          fontSize={12}
                          fontWeight={600}
                        />
                        {sortedTrendPatterns.map((row) => (
                          <Cell key={row.pattern} fill={TREND_COLORS[row.pattern]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid2" style={{ marginTop: "16px" }}>
                  <TrendLeaders title="Top increasing products" items={increasing} emptyText="No increasing products found." type="up" />
                  <TrendLeaders title="Top decreasing products" items={decreasing} emptyText="No decreasing products found." type="down" />
                </div>
              </>
            )}
          </ChartCard>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "24px", marginBottom: "8px" }}>
            <h3 style={{ margin: 0 }}>
              {selectedHealthStatus ? `Products in ${selectedHealthStatus} status` : "Most urgent products"}
            </h3>
            {selectedHealthStatus && (
              <button
                type="button"
                className="btn small"
                onClick={() => setSelectedHealthStatus(null)}
                style={{ fontSize: "12px", padding: "3px 10px" }}
              >
                Show all products
              </button>
            )}
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Product</th><th>Priority</th><th>Health</th><th className="numeric">Stockout risk</th><th className="numeric">Days of stock left</th><th className="numeric">Order qty</th></tr>
              </thead>
              <tbody>
                {items
                  .filter((i) => !selectedHealthStatus || i.healthStatus === selectedHealthStatus)
                  .slice(0, 8)
                  .map((i) => (
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
        </AnalysisReveal>
      )}
    </>
  )}

      <p className="muted small status-line">
        Services: server {server} | ML service {ml}
      </p>
    </div>
  );
}
