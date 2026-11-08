import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useAuth from "../context/useAuth";
import useToast from "../context/useToast";
import useList from "../hooks/useList";
import { inventoryService, productService } from "../services";
import { errorMessage } from "../services/api";
import Pagination from "../components/Pagination";
import ConfirmModal from "../components/ConfirmModal";
import MetricCard from "../components/MetricCard";
import { fmtDate, num } from "../utils/format";
import PageHeader from "../components/PageHeader";
import ProductCell from "../components/ProductCell";
import ProductThumb from "../components/ProductThumb";
import ProductSelect from "../components/ProductSelect";
import { exportCsv } from "../utils/exportCsv";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard, ChartTooltip, CHART_GRID_PROPS, X_AXIS_PROPS, Y_AXIS_PROPS } from "../components/charts";

const INV_COLS = [
  { header: "Product code", key: "product.code" },
  { header: "Product name", key: "product.name" },
  { header: "Category", key: "product.category" },
  { header: "Current stock", key: "currentStock" },
  { header: "In transit", key: "inTransitQty" },
  { header: "Lead time (days)", key: "product.leadTimeDays" },
  { header: "Snapshot date", key: "snapshotDate", format: fmtDate },
];

export default function InventoryList() {
  const { canWrite, isAdmin } = useAuth();
  const toast = useToast();
  const { data, pagination, summary, loading, error, params, filter, setPage, reload } = useList(inventoryService, {
    sort: "currentStock",
  });
  const [products, setProducts] = useState([]);
  const [actionError, setActionError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewMode, setViewMode] = useState("table");
  const [showChart, setShowChart] = useState(false);

  useEffect(() => {
    productService.list({ limit: 100, sort: "code" }).then((r) => setProducts(r.data.data)).catch(() => {});
  }, []);

  const confirmRemove = async () => {
    if (!deleteTarget) return;
    try {
      await inventoryService.remove(deleteTarget._id);
      setActionError("");
      toast.success(`Inventory record for "${deleteTarget.product?.name || 'product'}" deleted`);
      setDeleteTarget(null);
      reload();
    } catch (e) {
      const msg = errorMessage(e);
      setActionError(msg);
      toast.error(msg);
      setDeleteTarget(null);
    }
  };

  const handleSort = (field) => {
    const currentSort = params.sort || "currentStock";
    const isAsc = currentSort === field;
    const newSort = isAsc ? `-${field}` : field;
    filter({ sort: newSort });
  };

  const renderSortHeader = (label, field) => {
    const currentSort = params.sort || "currentStock";
    const isField = currentSort === field || currentSort === `-${field}`;
    const isAsc = currentSort === field;
    return (
      <th>
        <button
          type="button"
          className="sort-button"
          onClick={() => handleSort(field)}
          title={`Sort by ${label}`}
        >
          {label} {isField ? (isAsc ? "▲" : "▼") : ""}
        </button>
      </th>
    );
  };

  const totalStock = summary?.totalStock ?? data.reduce((s, r) => s + (r.currentStock || 0), 0);
  const totalInTransit = summary?.totalInTransit ?? data.reduce((s, r) => s + (r.inTransitQty || 0), 0);
  const outOfStockCount = summary?.stockouts ?? data.filter((r) => r.currentStock === 0).length;

  const categoryStock = useMemo(() => {
    if (summary?.categoryStock) {
      return summary.categoryStock.map(({ category, stock }) => ({
        category: category.length > 14 ? `${category.slice(0, 12)}…` : category,
        fullName: category,
        stock,
      }));
    }
    const cats = {};
    for (const r of data) {
      const c = r.product?.category || "Other";
      cats[c] = (cats[c] || 0) + (r.currentStock || 0);
    }
    return Object.entries(cats).map(([name, stock]) => ({
      category: name.length > 14 ? `${name.slice(0, 12)}…` : name,
      fullName: name,
      stock,
    }));
  }, [summary, data]);

  return (
    <div>
      <PageHeader title="Inventory" subtitle="Track live stock on hand and shipments." actions={canWrite && <Link className="btn primary" to="/inventory/new">+ Add record</Link>} />

      <div className="cards" style={{ marginBottom: "16px" }}>
        <MetricCard label="Stock on Hand" value={num(totalStock, 0)} sub="Total physical units" tone="tone-healthy" />
        <MetricCard label="Units in Transit" value={num(totalInTransit, 0)} sub="Pending shipment deliveries" tone="tone-healthy" />
        <MetricCard label="Stockouts" value={outOfStockCount} sub="Zero stock on hand" tone={outOfStockCount ? "tone-critical" : "tone-healthy"} />
      </div>

      <div className="toolbar" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px" }}>
        <ProductSelect products={products} value={params.product || ""} onChange={(product) => filter({ product })} allLabel="All products" />
        <select value={params.sort} onChange={(e) => filter({ sort: e.target.value })}>
          <option value="currentStock">Lowest stock first</option>
          <option value="-currentStock">Highest stock first</option>
          <option value="-updatedAt">Recently updated</option>
        </select>
        <div style={{ display: "inline-flex", borderRadius: "6px", border: "1px solid var(--border)", overflow: "hidden", marginLeft: "auto" }}>
          <button
            type="button"
            className={`btn small ${viewMode === "table" ? "primary" : ""}`}
            onClick={() => setViewMode("table")}
            title="Table View"
          >
            ☰ Table
          </button>
          <button
            type="button"
            className={`btn small ${viewMode === "grid" ? "primary" : ""}`}
            onClick={() => setViewMode("grid")}
            title="Card Grid View"
          >
            ⊞ Cards
          </button>
        </div>
        <button
          type="button"
          className="btn small"
          onClick={() => setShowChart((v) => !v)}
          title="Toggle Category Stock Chart"
        >
          {showChart ? "Hide Chart" : "📊 Stock Chart"}
        </button>
        <button className="btn small" onClick={() => exportCsv("inventory", INV_COLS, data)} disabled={!data.length}>Export CSV</button>
      </div>

      {showChart && categoryStock.length > 0 && (
        <ChartCard
          title="Stock on Hand by Category"
          subtitle="How is physical inventory distributed across categories?"
          takeaway={`${categoryStock.length} categories; highest volume is in ${categoryStock.reduce((max, c) => (c.stock > max.stock ? c : max), categoryStock[0])?.fullName}.`}
          className="mb-4"
        >
          <div style={{ width: "100%", height: 210 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryStock} margin={{ top: 20, right: 16, bottom: 25, left: 10 }}>
                <CartesianGrid {...CHART_GRID_PROPS} />
                <XAxis dataKey="category" {...X_AXIS_PROPS} interval={0} angle={-15} textAnchor="end" height={45} tick={{ fontSize: 11 }} />
                <YAxis {...Y_AXIS_PROPS} allowDecimals={false} width={45} label={{ value: "Units", angle: -90, position: "insideLeft", offset: 10, fill: "var(--muted)", fontSize: 11 }} />
                <Tooltip content={<ChartTooltip unit=" units" />} />
                <Bar dataKey="stock" name="Stock on Hand" fill="var(--chart-1)" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  <LabelList dataKey="stock" position="top" formatter={(v) => num(v, 0)} fontSize={10} fill="var(--muted)" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      )}

      {(error || actionError) && <div className="alert">{error || actionError}</div>}

      {viewMode === "grid" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px", margin: "16px 0" }}>
          {loading && data.length === 0 ? (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>Loading inventory...</div>
          ) : data.length === 0 ? (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>No inventory records found</div>
          ) : (
            data.map((r) => {
              const isStockout = r.currentStock === 0;
              const isLow = r.currentStock > 0 && r.currentStock < 50;
              const stockMax = 500;
              const fillPct = Math.min(100, Math.round((r.currentStock / stockMax) * 100));
              return (
                <div key={r._id} className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "16px", borderRadius: "12px", border: `1px solid ${isStockout ? "var(--danger)" : "var(--border)"}` }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                      <ProductThumb product={r.product || {}} size="lg" imageList={data.map((row) => row.product).filter(Boolean)} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <Link to={`/products/${r.product?.code}`} style={{ textDecoration: "none", color: "inherit", fontWeight: 600, fontSize: "14px", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.product?.name || "Product"}
                        </Link>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "4px" }}>
                          <span className="badge" style={{ fontSize: "11px" }}>{r.product?.code}</span>
                          <span className="muted small">{r.product?.category}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ marginBottom: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                        <span className="muted small">Stock on Hand</span>
                        <span className={`pill ${isStockout ? "status-critical" : isLow ? "status-warning" : "status-healthy"}`} style={{ fontSize: "11px" }}>
                          {isStockout ? "⚠️ Stockout (0)" : `${num(r.currentStock, 0)} units`}
                        </span>
                      </div>
                      <div style={{ height: "6px", width: "100%", backgroundColor: "var(--bg-muted, rgba(255,255,255,0.08))", borderRadius: "99px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${fillPct}%`, backgroundColor: isStockout ? "var(--danger)" : isLow ? "var(--warning)" : "var(--success)" }} />
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", margin: "8px 0", fontSize: "12px" }}>
                      <div>
                        <span className="muted small" style={{ display: "block" }}>In Transit</span>
                        <strong>{r.inTransitQty > 0 ? `🚚 ${r.inTransitQty}` : "0"}</strong>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span className="muted small" style={{ display: "block" }}>Snapshot</span>
                        <span className="muted">{fmtDate(r.snapshotDate)}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end", marginTop: "8px" }}>
                    <Link className="btn small" to={`/inventory/${r._id}/edit`}>Update stock</Link>
                    {isAdmin && <button type="button" className="btn small danger" onClick={() => setDeleteTarget(r)}>Delete</button>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                {renderSortHeader("Current stock", "currentStock")}
                <th>Stock Level</th>
                {renderSortHeader("In transit", "inTransitQty")}
                <th>Lead time</th>
                {renderSortHeader("Snapshot date", "snapshotDate")}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && data.length === 0 ? (
                <tr><td colSpan={8} className="center">Loading...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={8} className="center">No inventory records found</td></tr>
              ) : (
                data.map((r) => {
                  const isStockout = r.currentStock === 0;
                  const isLow = r.currentStock > 0 && r.currentStock < 50;
                  const fillPct = Math.min(100, Math.round((r.currentStock / 500) * 100));
                  return (
                    <tr key={r._id}>
                      <td><ProductCell product={r.product || {}} imageList={data.map((row) => row.product).filter(Boolean)} /></td>
                      <td><span className="pill status-info" style={{ fontSize: "11px" }}>{r.product?.category}</span></td>
                      <td style={{ fontWeight: 600 }}>
                        <span className={`pill ${isStockout ? "status-critical" : isLow ? "status-warning" : "status-healthy"}`} style={{ fontSize: "11px" }}>
                          {isStockout ? "0 (Out of stock)" : `${r.currentStock} units`}
                        </span>
                      </td>
                      <td style={{ minWidth: "110px" }}>
                        <div style={{ height: "6px", width: "100%", backgroundColor: "var(--bg-muted, rgba(255,255,255,0.08))", borderRadius: "99px", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${fillPct}%`, backgroundColor: isStockout ? "var(--danger)" : isLow ? "var(--warning)" : "var(--success)" }} />
                        </div>
                      </td>
                      <td>{r.inTransitQty > 0 ? <span className="badge">🚚 {r.inTransitQty}</span> : <span className="muted">-</span>}</td>
                      <td><span className="badge">⏱️ {r.product?.leadTimeDays}d</span></td>
                      <td className="muted">{fmtDate(r.snapshotDate)}</td>
                      <td className="actions">
                        <Link className="btn small" to={`/inventory/${r._id}/edit`}>Update stock</Link>
                        {isAdmin && <button type="button" className="btn small danger" onClick={() => setDeleteTarget(r)}>Delete</button>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
      <Pagination pagination={pagination} onPage={setPage} />

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete inventory record"
        message={`Are you sure you want to delete the inventory record for "${deleteTarget?.product?.name || "this product"}"?`}
        confirmLabel="Delete record"
        isDanger={true}
        onConfirm={confirmRemove}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
