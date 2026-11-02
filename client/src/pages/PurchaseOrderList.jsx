import { useState } from "react";
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

  return (
    <div>
      <PageHeader title="Purchase Orders" subtitle="Track open, delivered, and cancelled supplier orders." actions={canWrite && <Link className="btn primary" to="/purchase-orders/new">+ Add purchase order</Link>} />

      <div className="cards" style={{ marginBottom: "16px" }}>
        <MetricCard label="Open Purchase Orders" value={openOrders} sub="Awaiting full receipt" tone="tone-healthy" />
        <MetricCard label="Shipments In Transit" value={inTransitOrders} sub="En route from suppliers" tone="tone-healthy" />
        <MetricCard label="Overdue Deliveries" value={overdueCount} sub="Past expected arrival date" tone={overdueCount ? "tone-critical" : "tone-healthy"} />
      </div>

      <div className="toolbar">
        <SearchBar onSearch={(search) => filter({ search })} placeholder="Search PO number" />
        <select value={params.status || ""} onChange={(e) => filter({ status: e.target.value })}>
          <option value="">All statuses</option>
          {PO_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <button className="btn" onClick={() => exportCsv("purchase-orders", PO_COLS, data)} disabled={!data.length}>Export CSV</button>
      </div>

      {(error || actionError) && <div className="alert">{error || actionError}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>PO</th><th>Product</th><th>Supplier</th><th>Ordered</th><th>Expected</th>
              <th>Delivered</th><th>Delay</th><th>Qty</th><th>Status</th><th>Overdue</th><th className="col-quality">Quality</th>
              {canWrite && <th className="sticky-actions-col">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={12} className="center">Loading...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={12} className="center">No purchase orders found</td></tr>
            ) : (
              data.map((po) => {
                const overdueDays = getOverdueDays(po);
                const isOverdue = overdueDays > 0;
                const canCancel = canWrite && ["Pending", "Approved", "In Transit"].includes(po.status);
                const canDelete = isAdmin && po.status === "Cancelled";
                const delayVal = isOverdue ? overdueDays : (po.status === "Delivered" && po.delayDays != null && po.delayDays < 0 ? 0 : (po.delayDays ?? "-"));
                return (
                <tr key={po._id}>
                  <td>{normalizePoNumber(po)}</td>
                  <td><ProductCell product={po.product || {}} imageList={data.map((row) => row.product).filter(Boolean)} /></td>
                  <td>{po.supplier?.name}</td>
                  <td>{fmtDate(po.orderDate)}</td>
                  <td>{fmtDate(po.expectedDeliveryDate)}</td>
                  <td>{fmtDate(po.actualDeliveryDate)}</td>
                  <td className={po.delayDays > 0 ? "late" : ""}>{delayVal}</td>
                  <td>{po.qtyOrdered}</td>
                  <td>
                    <Pill value={po.status} />
                  </td>
                  <td>
                    {isOverdue ? <span className="badge danger">Overdue {overdueDays}d</span> : <span className="muted small">-</span>}
                  </td>
                  <td className="col-quality">{po.qualityIssue ? "Issue" : "OK"}</td>
                  {canWrite && (
                    <td className="actions sticky-actions-col">
                      <Link className="btn small" to={`/purchase-orders/${po._id}/edit`}>Edit</Link>
                      {canCancel && <button className="btn small warning" onClick={() => setCancelTarget(po)}>Cancel</button>}
                      {canDelete && <button className="btn small danger" onClick={() => setDeleteTarget(po)}>Delete</button>}
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
