import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useAuth from "../context/useAuth";
import useToast from "../context/useToast";
import useList from "../hooks/useList";
import { purchaseOrderService } from "../services";
import { errorMessage } from "../services/api";
import SearchBar from "../components/SearchBar";
import Pagination from "../components/Pagination";
import ConfirmModal from "../components/ConfirmModal";
import MetricCard from "../components/MetricCard";
import { PO_STATUSES, fmtDate, normalizePoNumber } from "../utils/format";
import PageHeader from "../components/PageHeader";
import Pill from "../components/Pill";
import ProductCell from "../components/ProductCell";
import { exportCsv } from "../utils/exportCsv";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard, ChartTooltip, CHART_GRID_PROPS, X_AXIS_PROPS, Y_AXIS_PROPS } from "../components/charts";

const PO_COLS = [
  { header: "PO Number", key: "poNumber", format: (v, row) => normalizePoNumber(row) },
  { header: "Product code", key: "product.code" },
  { header: "Product name", key: "product.name" },
  { header: "Supplier", key: "supplier.name" },
  { header: "Order date", key: "orderDate", format: fmtDate },
  { header: "Expected delivery", key: "expectedDeliveryDate", format: fmtDate },
  { header: "Actual delivery", key: "actualDeliveryDate", format: fmtDate },
  { header: "Delay (days)", key: "delayDays", format: (v, row) => (row.status === "Delivered" && v < 0 ? 0 : v ?? "-") },
  { header: "Qty ordered", key: "qtyOrdered" },
  { header: "Qty received", key: "qtyReceived" },
  { header: "Status", key: "status" },
  { header: "Overdue", key: "_overdue", format: (_, row) => { const d = getOverdueDays(row); return d > 0 ? `${d}d` : "-"; } },
  { header: "Quality issue", key: "qualityIssue", format: (v) => v ? "Yes" : "No" },
];

function getOverdueDays(po) {
  if (!po.expectedDeliveryDate) return 0;
  if (!["Pending", "In Transit"].includes(po.status)) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expected = new Date(po.expectedDeliveryDate);
  expected.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - expected.getTime()) / 86400000);
  return diff > 0 ? diff : 0;
}

export default function PurchaseOrderList() {
  const { canWrite, isAdmin } = useAuth();
  const toast = useToast();
  const { data, pagination, loading, error, params, filter, setPage, reload } = useList(purchaseOrderService, {
    sort: "-orderDate",
  });
  const [actionError, setActionError] = useState("");
  const [cancelTarget, setCancelTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showChart, setShowChart] = useState(false);

  const handleSearch = useCallback((search) => {
    filter({ search });
  }, [filter]);

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    try {
      await purchaseOrderService.cancel(cancelTarget._id);
      setActionError("");
      toast.success(`Purchase order ${cancelTarget.poNumber} cancelled`);
      setCancelTarget(null);
      reload();
    } catch (e) {
      const msg = errorMessage(e);
      setActionError(msg);
      toast.error(msg);
      setCancelTarget(null);
    }
  };

  const confirmRemove = async () => {
    if (!deleteTarget) return;
    try {
      await purchaseOrderService.remove(deleteTarget._id);
      setActionError("");
      toast.success(`Cancelled order ${deleteTarget.poNumber} deleted`);
      setDeleteTarget(null);
      reload();
    } catch (e) {
      const msg = errorMessage(e);
      setActionError(msg);
      toast.error(msg);
      setDeleteTarget(null);
    }
  };

  const openOrders = data.filter((po) => ["Pending", "Approved", "In Transit"].includes(po.status)).length;
  const inTransitOrders = data.filter((po) => po.status === "In Transit").length;
  const overdueCount = data.filter((po) => getOverdueDays(po) > 0).length;

  const statusDistribution = useMemo(() => {
    return PO_STATUSES.map((status) => ({
      status,
      count: data.filter((po) => po.status === status).length,
    })).filter((s) => s.count > 0);
  }, [data]);

  return (
    <div>
      <PageHeader title="Purchase Orders" subtitle="Track open, delivered, and cancelled supplier orders." actions={canWrite && <Link className="btn primary" to="/purchase-orders/new">+ Add purchase order</Link>} />

      <div className="cards" style={{ marginBottom: "16px" }}>
        <MetricCard label="Open Purchase Orders" value={openOrders} sub="Awaiting full receipt" tone="tone-healthy" />
        <MetricCard label="Shipments In Transit" value={inTransitOrders} sub="En route from suppliers" tone="tone-healthy" />
        <MetricCard label="Overdue Deliveries" value={overdueCount} sub="Past expected arrival date" tone={overdueCount ? "tone-critical" : "tone-healthy"} />
      </div>

      <div className="toolbar" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px" }}>
        <SearchBar onSearch={handleSearch} placeholder="Search PO number" />
        <select value={params.status || ""} onChange={(e) => filter({ status: e.target.value })}>
          <option value="">All statuses</option>
          {PO_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <button
          type="button"
          className="btn small"
          onClick={() => setShowChart((v) => !v)}
          title="Toggle PO Status Chart"
          style={{ marginLeft: "auto" }}
        >
          {showChart ? "Hide Chart" : "📊 Status Chart"}
        </button>
        <button className="btn small" onClick={() => exportCsv("purchase-orders", PO_COLS, data)} disabled={!data.length}>Export CSV</button>
      </div>

      {showChart && statusDistribution.length > 0 && (
        <ChartCard
          title="Purchase Orders by Status"
          subtitle="How are supplier orders distributed across fulfillment stages?"
          takeaway={`${data.length} total orders; ${openOrders} currently open (${inTransitOrders} in transit).`}
          className="mb-4"
        >
          <div style={{ width: "100%", height: 190 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusDistribution} margin={{ top: 20, right: 16, bottom: 10, left: 0 }}>
                <CartesianGrid {...CHART_GRID_PROPS} />
                <XAxis dataKey="status" {...X_AXIS_PROPS} />
                <YAxis {...Y_AXIS_PROPS} allowDecimals={false} width={35} label={{ value: "Orders", angle: -90, position: "insideLeft", offset: 10, fill: "var(--muted)", fontSize: 11 }} />
                <Tooltip content={<ChartTooltip unit=" orders" />} />
                <Bar dataKey="count" name="Orders" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  <LabelList dataKey="count" position="top" fontSize={10} fill="var(--muted)" />
                  {statusDistribution.map((entry) => (
                    <Cell
                      key={entry.status}
                      fill={
                        entry.status === "Delivered"
                          ? "var(--success)"
                          : entry.status === "In Transit"
                          ? "var(--chart-1)"
                          : entry.status === "Cancelled"
                          ? "var(--danger)"
                          : "var(--muted)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      )}

      {(error || actionError) && <div className="alert">{error || actionError}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>PO</th><th>Product</th><th>Supplier</th><th>Order Date</th><th>Expected</th>
              <th>Status</th><th>Fulfillment</th><th>ETA / Delay</th><th className="col-quality">Quality</th>
              {canWrite && <th className="sticky-actions-col">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading && data.length === 0 ? (
              <tr><td colSpan={10} className="center">Loading...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={10} className="center">No purchase orders found</td></tr>
            ) : (
              data.map((po) => {
                const overdueDays = getOverdueDays(po);
                const isOverdue = overdueDays > 0;
                const canCancel = canWrite && ["Pending", "Approved", "In Transit"].includes(po.status);
                const canDelete = isAdmin && po.status === "Cancelled";
                const delayVal = isOverdue ? overdueDays : (po.status === "Delivered" && po.delayDays != null && po.delayDays < 0 ? 0 : (po.delayDays ?? "-"));
                const progressPct = Math.min(100, Math.round(((po.qtyReceived || 0) / (po.qtyOrdered || 1)) * 100));
                return (
                <tr key={po._id}>
                  <td><span className="badge" style={{ fontWeight: 600 }}>{normalizePoNumber(po)}</span></td>
                  <td><ProductCell product={po.product || {}} imageList={data.map((row) => row.product).filter(Boolean)} /></td>
                  <td>{po.supplier?.name}</td>
                  <td className="muted small">{fmtDate(po.orderDate)}</td>
                  <td>{fmtDate(po.expectedDeliveryDate)}</td>
                  <td>
                    <Pill value={po.status} />
                  </td>
                  <td style={{ minWidth: "120px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "3px" }}>
                      <span>{po.qtyReceived || 0} / {po.qtyOrdered}</span>
                      <span className="muted">{progressPct}%</span>
                    </div>
                    <div style={{ height: "5px", width: "100%", backgroundColor: "var(--bg-muted, rgba(255,255,255,0.08))", borderRadius: "99px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${progressPct}%`, backgroundColor: po.status === "Delivered" ? "var(--success)" : "var(--accent)" }} />
                    </div>
                  </td>
                  <td>
                    {isOverdue ? (
                      <span className="pill status-critical" style={{ fontSize: "11px" }}>⚠️ Late by {overdueDays}d</span>
                    ) : po.status === "In Transit" ? (
                      <span className="pill status-warning" style={{ fontSize: "11px" }}>🚚 In Transit</span>
                    ) : po.status === "Delivered" ? (
                      <span className="pill status-healthy" style={{ fontSize: "11px" }}>✓ {delayVal > 0 ? `+${delayVal}d` : "On time"}</span>
                    ) : po.status === "Cancelled" ? (
                      <span className="pill muted" style={{ fontSize: "11px" }}>✕ Void</span>
                    ) : (
                      <span className="pill status-info" style={{ fontSize: "11px" }}>⏳ Processing</span>
                    )}
                  </td>
                  <td className="col-quality">
                    {po.qualityIssue ? (
                      <span className="pill status-critical" style={{ fontSize: "11px" }}>Issue</span>
                    ) : (
                      <span className="pill status-healthy" style={{ fontSize: "11px" }}>OK</span>
                    )}
                  </td>
                  {canWrite && (
                    <td className="actions sticky-actions-col">
                      <Link className="btn small" to={`/purchase-orders/${po._id}/edit`}>Edit</Link>
                      {canCancel && <button type="button" className="btn small warning" onClick={() => setCancelTarget(po)}>Cancel</button>}
                      {canDelete && <button type="button" className="btn small danger" onClick={() => setDeleteTarget(po)}>Delete</button>}
                    </td>
                  )}
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <Pagination pagination={pagination} onPage={setPage} />

      <ConfirmModal
        isOpen={Boolean(cancelTarget)}
        title="Cancel purchase order"
        message={`Are you sure you want to cancel purchase order ${cancelTarget?.poNumber}? This will remove it from on-order inventory quantities.`}
        confirmLabel="Cancel order"
        isDanger={true}
        onConfirm={confirmCancel}
        onCancel={() => setCancelTarget(null)}
      />

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete purchase order"
        message={`Are you sure you want to permanently delete cancelled order ${deleteTarget?.poNumber}?`}
        confirmLabel="Delete order"
        isDanger={true}
        onConfirm={confirmRemove}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
