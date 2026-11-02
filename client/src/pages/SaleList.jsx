import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useAuth from "../context/useAuth";
import useToast from "../context/useToast";
import useList from "../hooks/useList";
import { saleService, productService } from "../services";
import { errorMessage } from "../services/api";
import Pagination from "../components/Pagination";
import ConfirmModal from "../components/ConfirmModal";
import MetricCard from "../components/MetricCard";
import { fmtDate, money, num } from "../utils/format";
import PageHeader from "../components/PageHeader";
import ProductCell from "../components/ProductCell";
import ProductSelect from "../components/ProductSelect";
import { exportCsv } from "../utils/exportCsv";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const SALE_COLS = [
  { header: "Date", key: "date", format: fmtDate },
  { header: "Product code", key: "product.code" },
  { header: "Product name", key: "product.name" },
  { header: "Units sold", key: "unitsSold" },
  { header: "Unit price (INR)", key: "unitPrice" },
  { header: "Revenue (INR)", key: "revenue" },
  { header: "Promo", key: "promoFlag", format: (v) => v ? "Yes" : "No" },
];

export default function SaleList() {
  const { user, isAdmin } = useAuth();
  const toast = useToast();
  const { data, pagination, loading, error, params, filter, setPage, reload } = useList(saleService, {
    sort: "-date",
  });
  const [products, setProducts] = useState([]);
  const [actionError, setActionError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showChart, setShowChart] = useState(false);

  useEffect(() => {
    productService.list({ limit: 100, sort: "code" }).then((r) => setProducts(r.data.data)).catch(() => {});
  }, []);

  const confirmRemove = async () => {
    if (!deleteTarget) return;
    try {
      await saleService.remove(deleteTarget._id);
      setActionError("");
      toast.success("Sale record deleted successfully");
      setDeleteTarget(null);
      reload();
    } catch (e) {
      const msg = errorMessage(e);
      setActionError(msg);
      toast.error(msg);
      setDeleteTarget(null);
    }
  };

  const totalUnits = data.reduce((s, row) => s + (row.unitsSold || 0), 0);
  const totalRevenue = data.reduce((s, row) => s + (row.revenue || 0), 0);
  const promoCount = data.filter((row) => row.promoFlag).length;

  const salesTimeSeries = useMemo(() => {
    const sorted = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
    return sorted.map((s) => ({
      date: fmtDate(s.date),
      revenue: s.revenue || 0,
      units: s.unitsSold || 0,
      product: s.product?.name || s.product?.code || "Product",
    }));
  }, [data]);

  return (
    <div>
      <PageHeader
        title="Sales"
        subtitle="Review recorded demand history and log transactions."
        actions={user ? <Link className="btn primary" to="/sales/new">+ Record sale</Link> : null}
      />

      <div className="cards" style={{ marginBottom: "16px" }}>
        <MetricCard label="Units Sold (Page)" value={num(totalUnits, 0)} sub="Total volume on screen" tone="tone-healthy" />
        <MetricCard label="Revenue (Page)" value={money(totalRevenue)} sub="Gross revenue on screen" tone="tone-healthy" />
        <MetricCard label="Promo Transactions" value={promoCount} sub={`Out of ${data.length} records`} tone="tone-warning" />
      </div>

      <div className="toolbar" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px" }}>
        <ProductSelect products={products} value={params.product || ""} onChange={(product) => filter({ product })} allLabel="All products" />
        <label className="inline">From <input type="date" value={params.from || ""} onChange={(e) => filter({ from: e.target.value })} /></label>
        <label className="inline">To <input type="date" value={params.to || ""} onChange={(e) => filter({ to: e.target.value })} /></label>
        <select value={params.promoFlag || ""} onChange={(e) => filter({ promoFlag: e.target.value })}>
          <option value="">Promo: any</option>
          <option value="true">Promo days only</option>
          <option value="false">Non-promo days</option>
        </select>
        <button
          type="button"
          className="btn small"
          onClick={() => setShowChart((v) => !v)}
          title="Toggle Sales Revenue Chart"
          style={{ marginLeft: "auto" }}
        >
          {showChart ? "Hide Chart" : "📊 Revenue Chart"}
        </button>
        <button className="btn small" onClick={() => exportCsv("sales", SALE_COLS, data)} disabled={!data.length}>Export CSV</button>
      </div>

      {showChart && salesTimeSeries.length > 0 && (
        <section className="card" style={{ marginBottom: "16px", padding: "16px" }}>
          <h4 style={{ margin: "0 0 12px", fontSize: "14px", color: "var(--text-muted)" }}>Sales Revenue Trend on Current Page</h4>
          <div style={{ width: "100%", height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTimeSeries} margin={{ top: 8, right: 16, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, rgba(255,255,255,0.08))" />
                <XAxis dataKey="date" interval="preserveStartEnd" angle={-15} textAnchor="end" height={40} tick={{ fontSize: 11 }} />
                <YAxis width={60} tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value, _name, item) => [`${money(value)} (${item.payload.units} units)`, item.payload.product]} />
                <Area type="monotone" dataKey="revenue" stroke="var(--brand, #3b82f6)" fill="var(--brand-soft, rgba(59, 130, 246, 0.2))" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {(error || actionError) && <div className="alert">{error || actionError}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th><th>Product</th><th>Units sold</th><th>Unit price</th><th>Revenue</th><th>Promo</th>
              {isAdmin && <th></th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={isAdmin ? 7 : 6} className="center">Loading...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={isAdmin ? 7 : 6} className="center">No sales found</td></tr>
            ) : (
              data.map((s) => (
                <tr key={s._id}>
                  <td><span className="badge muted">{fmtDate(s.date)}</span></td>
                  <td><ProductCell product={s.product || {}} imageList={data.map((row) => row.product).filter(Boolean)} /></td>
                  <td><span className="badge" style={{ fontWeight: 600 }}>{s.unitsSold}</span></td>
                  <td className="muted">{money(s.unitPrice)}</td>
                  <td style={{ fontWeight: 600 }}>{money(s.revenue)}</td>
                  <td>
                    {s.promoFlag ? (
                      <span className="pill status-warning" style={{ fontSize: "11px" }}>🏷️ Promo</span>
                    ) : (
                      <span className="muted small">Regular</span>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="actions">
                      <Link className="btn small" to={`/sales/${s._id}/edit`}>Edit</Link>
                      <button type="button" className="btn small danger" onClick={() => setDeleteTarget(s)}>Delete</button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination pagination={pagination} onPage={setPage} />

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete sale record"
        message={`Are you sure you want to delete the sale for ${deleteTarget?.product?.name || "this product"} on ${fmtDate(deleteTarget?.date)}? This action is recorded in the audit log.`}
        confirmLabel="Delete sale"
        isDanger={true}
        onConfirm={confirmRemove}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
