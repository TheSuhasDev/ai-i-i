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
  BarChart, Bar, Cell, LabelList, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { ChartCard, ChartTooltip, CHART_GRID_PROPS, X_AXIS_PROPS, Y_AXIS_PROPS } from "../components/charts";

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
            <ChartCard
              title="Shipment Delay per Purchase Order"
              subtitle="How many days early or late did each shipment arrive?"
              takeaway={
                avgDelay != null
                  ? `Average delay is ${avgDelay} days across ${delivered.length} delivered orders. Green bars arrived on or before the due date.`
                  : ""
              }
              className="mb-4"
            >
              <div style={{ width: "100%", height: 230 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 16, bottom: 40, left: 10 }}>
                    <CartesianGrid {...CHART_GRID_PROPS} />
                    <XAxis dataKey="name" {...X_AXIS_PROPS} angle={-35} textAnchor="end" interval={0} tick={{ fontSize: 11 }} />
                    <YAxis
                      {...Y_AXIS_PROPS}
                      width={45}
                      label={{ value: "Days", angle: -90, position: "insideLeft", offset: 10, fill: "var(--muted)", fontSize: 11 }}
                    />
                    <Tooltip content={<ChartTooltip unit=" days" />} />
                    <ReferenceLine y={0} stroke="var(--muted)" strokeDasharray="3 3" />
                    <Bar dataKey="delay" name="Delay" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                      <LabelList
                        dataKey="delay"
                        position="top"
                        formatter={(v) => (v > 0 ? `+${v}d` : `${v}d`)}
                        fontSize={10}
                        fill="var(--text)"
                      />
                      {chartData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={entry.delay <= 0 ? "var(--success)" : entry.delay > 5 ? "var(--danger)" : "var(--warning)"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
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
