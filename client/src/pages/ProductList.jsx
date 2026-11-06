import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useAuth from "../context/useAuth";
import useToast from "../context/useToast";
import useList from "../hooks/useList";
import { productService } from "../services";
import { errorMessage } from "../services/api";
import SearchBar from "../components/SearchBar";
import Pagination from "../components/Pagination";
import ConfirmModal from "../components/ConfirmModal";
import MetricCard from "../components/MetricCard";
import { CATEGORIES, money, num } from "../utils/format";
import PageHeader from "../components/PageHeader";
import ProductCell from "../components/ProductCell";
import ProductThumb from "../components/ProductThumb";
import { exportCsv } from "../utils/exportCsv";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard, ChartTooltip, CHART_GRID_PROPS, X_AXIS_PROPS, Y_AXIS_PROPS } from "../components/charts";

const PRODUCT_COLS = [
  { header: "Code", key: "code" },
  { header: "Name", key: "name" },
  { header: "SKU", key: "sku" },
  { header: "Category", key: "category" },
  { header: "Price (INR)", key: "price" },
  { header: "Cost (INR)", key: "cost" },
  { header: "Lead time (days)", key: "leadTimeDays" },
];

export default function ProductList() {
  const { canWrite, isAdmin } = useAuth();
  const toast = useToast();
  const { data, pagination, loading, error, params, filter, setPage, reload } = useList(productService, {
    sort: "code",
  });
  const [actionError, setActionError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewMode, setViewMode] = useState("table");
  const [showChart, setShowChart] = useState(false);

  const confirmRemove = async () => {
    if (!deleteTarget) return;
    try {
      await productService.remove(deleteTarget._id);
      setActionError("");
      toast.success(`Product "${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      reload();
    } catch (e) {
      const msg = errorMessage(e);
      setActionError(msg);
      toast.error(msg);
      setDeleteTarget(null);
    }
  };

  const handleSearch = useCallback((search) => {
    filter({ search });
  }, [filter]);

  const activeCount = data.filter((p) => p.isActive !== false).length;
  const avgLeadTime = data.length ? data.reduce((s, p) => s + (p.leadTimeDays || 0), 0) / data.length : 0;

  const categoryDistribution = useMemo(() => {
    return CATEGORIES.map((cat) => ({
      category: cat.length > 14 ? `${cat.slice(0, 12)}…` : cat,
      fullName: cat,
      count: data.filter((p) => p.category === cat).length,
    })).filter((c) => c.count > 0);
  }, [data]);

  return (
    <div>
      <PageHeader title="Products" subtitle="Browse and manage the product catalog." actions={canWrite && (
          <Link className="btn primary" to="/products/new">
            + Add product
          </Link>
        )} />

      <div className="cards" style={{ marginBottom: "16px" }}>
        <MetricCard label="Products Listed" value={pagination?.total || data.length} sub="Catalog entries" tone="tone-healthy" />
        <MetricCard label="Active Items" value={activeCount} sub="Available for reorder" tone="tone-healthy" />
        <MetricCard label="Average Lead Time" value={`${num(avgLeadTime, 1)} d`} sub="Supplier procurement cycle" tone="tone-healthy" />
      </div>

      <div className="toolbar" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px" }}>
        <SearchBar onSearch={handleSearch} placeholder="Search name, SKU or code" />
        <select value={params.category || ""} onChange={(e) => filter({ category: e.target.value })}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
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
          title="Toggle Category Chart"
        >
          {showChart ? "Hide Chart" : "📊 Chart"}
        </button>
        <button className="btn small" onClick={() => exportCsv("products", PRODUCT_COLS, data)} disabled={!data.length}>Export CSV</button>
      </div>

      {showChart && categoryDistribution.length > 0 && (
        <ChartCard
          title="Products by Category"
          subtitle="How is catalog variety distributed across categories?"
          takeaway={`${categoryDistribution.length} categories represented; largest catalog segment is ${categoryDistribution.reduce((max, c) => (c.count > max.count ? c : max), categoryDistribution[0])?.fullName}.`}
          className="mb-4"
        >
          <div style={{ width: "100%", height: 210 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryDistribution} margin={{ top: 20, right: 16, bottom: 25, left: 10 }}>
                <CartesianGrid {...CHART_GRID_PROPS} />
                <XAxis dataKey="category" {...X_AXIS_PROPS} interval={0} angle={-15} textAnchor="end" height={45} tick={{ fontSize: 11 }} />
                <YAxis {...Y_AXIS_PROPS} allowDecimals={false} width={35} label={{ value: "Products", angle: -90, position: "insideLeft", offset: 10, fill: "var(--muted)", fontSize: 11 }} />
                <Tooltip content={<ChartTooltip unit=" products" />} />
                <Bar dataKey="count" name="Product Count" fill="var(--chart-1)" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  <LabelList dataKey="count" position="top" fontSize={10} fill="var(--muted)" />
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
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>Loading products...</div>
          ) : data.length === 0 ? (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>No products found</div>
          ) : (
            data.map((p) => {
              const marginPct = p.price && p.cost ? Math.round(((p.price - p.cost) / p.price) * 100) : 0;
              return (
                <div key={p._id} className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "16px", borderRadius: "12px", border: "1px solid var(--border)" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                      <ProductThumb product={p} size="lg" imageList={data} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <Link to={`/products/${p.code}`} style={{ textDecoration: "none", color: "inherit", fontWeight: 600, fontSize: "14px", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {p.name}
                        </Link>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "4px" }}>
                          <span className="badge" style={{ fontSize: "11px" }}>{p.code}</span>
                          <span className="muted small">{p.sku}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span className="pill status-info" style={{ fontSize: "11px" }}>{p.category}</span>
                      <span className="pill status-healthy" style={{ fontSize: "11px" }}>{marginPct}% margin</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", margin: "8px 0", fontSize: "13px" }}>
                      <div>
                        <span className="muted small" style={{ display: "block" }}>Price</span>
                        <strong>{money(p.price)}</strong>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span className="muted small" style={{ display: "block" }}>Lead Time</span>
                        <span>⏱️ {p.leadTimeDays}d</span>
                      </div>
                    </div>
                    {p.suppliers?.length > 0 && (
                      <p className="muted small" style={{ margin: "4px 0 10px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        🚚 {p.suppliers.map((s) => s.name).join(", ")}
                      </p>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end", marginTop: "8px" }}>
                    <Link className="btn small" to={`/products/${p.code}`}>Insights</Link>
                    {canWrite && <Link className="btn small" to={`/products/${p._id}/edit`}>Edit</Link>}
                    {isAdmin && <button type="button" className="btn small danger" onClick={() => setDeleteTarget(p)}>Delete</button>}
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
                <th>SKU</th>
                <th>Category</th>
                <th>Price</th>
                <th>Cost</th>
                <th>Margin</th>
                <th>Lead time</th>
                <th>Suppliers</th>
                {canWrite && <th></th>}
              </tr>
            </thead>
            <tbody>
              {loading && data.length === 0 ? (
                <tr><td colSpan={8 + Number(canWrite)} className="center">Loading...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={8 + Number(canWrite)} className="center">No products found</td></tr>
              ) : (
                data.map((p) => {
                  const marginPct = p.price && p.cost ? Math.round(((p.price - p.cost) / p.price) * 100) : 0;
                  return (
                    <tr key={p._id}>
                      <td><ProductCell product={p} imageList={data} /></td>
                      <td>{p.sku}</td>
                      <td><span className="pill status-info" style={{ fontSize: "11px" }}>{p.category}</span></td>
                      <td style={{ fontWeight: 600 }}>{money(p.price)}</td>
                      <td className="muted">{money(p.cost)}</td>
                      <td>
                        <span className={`pill ${marginPct >= 30 ? "status-healthy" : "status-warning"}`} style={{ fontSize: "11px" }}>
                          {marginPct > 0 ? `+${marginPct}%` : `${marginPct}%`}
                        </span>
                      </td>
                      <td><span className="badge">⏱️ {p.leadTimeDays}d</span></td>
                      <td>{p.suppliers?.map((s) => s.name).join(", ") || "-"}</td>
                      {canWrite && (
                        <td className="actions">
                          <Link className="btn small" to={`/products/${p._id}/edit`}>Edit</Link>
                          {isAdmin && <button type="button" className="btn small danger" onClick={() => setDeleteTarget(p)}>Delete</button>}
                        </td>
                      )}
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
        title="Delete product"
        message={`Are you sure you want to permanently delete product "${deleteTarget?.name}" (${deleteTarget?.code})?`}
        confirmLabel="Delete product"
        isDanger={true}
        onConfirm={confirmRemove}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
