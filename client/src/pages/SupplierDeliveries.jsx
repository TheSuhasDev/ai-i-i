import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supplierService } from "../services";
import useFetch from "../hooks/useFetch";
import { fmtDate } from "../utils/format";
import PageHeader from "../components/PageHeader";
import Pagination from "../components/Pagination";
import ProductCell from "../components/ProductCell";
import Pill from "../components/Pill";
import { exportCsv } from "../utils/exportCsv";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

const DEL_COLS = [
  { header: "PO Number", key: "poNumber" },
  { header: "Product code", key: "product.code" },
  { header: "Product name", key: "product.name" },
  { header: "Order date", key: "orderDate", format: fmtDate },
  { header: "Expected delivery", key: "expectedDeliveryDate", format: fmtDate },
  { header: "Actual delivery", key: "actualDeliveryDate", format: fmtDate },
  { header: "Delay (days)", key: "delayDays" },
  { header: "Quality issue", key: "qualityIssue", format: (v) => v ? "Yes" : "No" },
  { header: "Status", key: "status" },
];

const PAGE_SIZE = 20;

export default function SupplierDeliveries() {
  const { id } = useParams();
  const [page, setPage] = useState(1);

  const fetchDeliveries = () => supplierService.deliveries(id, { limit: 500 });
  const { data, loading, error } = useFetch(fetchDeliveries);

  const supplier = data?.supplier;
  const all = data?.data ?? [];
  const delivered = all.filter((p) => p.status === "Delivered" && p.delayDays != null);

  const chartData = delivered.map((p) => ({
    name: p.poNumber,
    delay: p.delayDays ?? 0,
    date: fmtDate(p.orderDate),
  }));

  const pages = Math.ceil(all.length / PAGE_SIZE);
  const pageRows = all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pagination = { page, limit: PAGE_SIZE, total: all.length, pages };

  const avgDelay = delivered.length
    ? (delivered.reduce((s, p) => s + p.delayDays, 0) / delivered.length).toFixed(1)
    : null;

  return (
    <div>
      <PageHeader
        title={supplier ? `${supplier.code} ${supplier.name} — Delivery History` : "Delivery History"}
        subtitle="All purchase orders placed with this supplier, with delay analysis."
        actions={<Link className="btn" to="/supplier-risk">← Back to Supplier Risk</Link>}
      />

      {error && <div className="alert">{error}</div>}
      {loading && <p className="muted">Loading...</p>}

      {!loading && all.length > 0 && (
        <>
          <div className="cards" style={{ marginBottom: "20px" }}>
            <div className="card stat">
              <h4>Total orders</h4>
              <p className="big">{all.length}</p>
            </div>
            <div className="card stat">
              <h4>Delivered</h4>
              <p className="big">{delivered.length}</p>
            </div>
            {avgDelay != null && (
              <div className="card stat">
                <h4>Avg delay (days)</h4>
                <p className="big" style={{ color: Number(avgDelay) > 3 ? "var(--danger)" : "var(--success)" }}>{avgDelay}</p>
              </div>
            )}
          </div>

          {chartData.length > 0 && (
            <section className="card" style={{ marginBottom: "20px" }}>
              <h3>Delay per delivered order</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 40, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                  <XAxis dataKey="name" angle={-35} textAnchor="end" interval={0} tick={{ fontSize: 11 }} />
                  <YAxis unit="d" />
                  <Tooltip formatter={(v) => [`${v} days`, "Delay"]} />
                  <ReferenceLine y={0} stroke="var(--border)" />
                  <Bar dataKey="delay" fill="var(--accent)" name="Delay (days)" />
                </BarChart>
              </ResponsiveContainer>
            </section>
          )}

          <div className="toolbar">
            <span className="muted">{all.length} purchase orders</span>
            <button className="btn" onClick={() => exportCsv(`supplier-${supplier?.code}-deliveries`, DEL_COLS, all)}>
              Export CSV
            </button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>PO Number</th>
                  <th>Product</th>
                  <th>Order date</th>
                  <th>Expected</th>
                  <th>Actual</th>
                  <th>Delay (d)</th>
                  <th>Status</th>
                  <th>Quality</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((po) => (
                  <tr key={po._id}>
                    <td>{po.poNumber}</td>
                    <td><ProductCell product={po.product || {}} size="sm" imageList={pageRows.map((r) => r.product).filter(Boolean)} /></td>
                    <td>{fmtDate(po.orderDate)}</td>
                    <td>{fmtDate(po.expectedDeliveryDate)}</td>
                    <td>{fmtDate(po.actualDeliveryDate)}</td>
                    <td className={po.delayDays > 0 ? "late" : ""}>{po.delayDays ?? "-"}</td>
                    <td><Pill value={po.status} /></td>
                    <td>{po.qualityIssue ? "Issue" : "OK"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination pagination={pagination} onPage={setPage} />
        </>
      )}
    </div>
  );
}
