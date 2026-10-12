import { useState } from "react";
import { Link } from "react-router-dom";
import useAuth from "../context/useAuth";
import useList from "../hooks/useList";
import { purchaseOrderService } from "../services";
import { errorMessage } from "../services/api";
import SearchBar from "../components/SearchBar";
import Pagination from "../components/Pagination";
import { PO_STATUSES, fmtDate } from "../utils/format";

export default function PurchaseOrderList() {
  const { canWrite, isAdmin } = useAuth();
  const { data, pagination, loading, error, params, filter, setPage, reload } = useList(purchaseOrderService, {
    sort: "-orderDate",
  });
  const [actionError, setActionError] = useState("");

  const remove = async (po) => {
    if (!window.confirm(`Delete purchase order ${po.poNumber}?`)) return;
    try {
      await purchaseOrderService.remove(po._id);
      setActionError("");
      reload();
    } catch (e) {
      setActionError(errorMessage(e));
    }
  };

  return (
    <div>
      <div className="page-head">
        <h2>Purchase Orders</h2>
        {canWrite && <Link className="btn primary" to="/purchase-orders/new">+ Add purchase order</Link>}
      </div>

      <div className="toolbar">
        <SearchBar onSearch={(search) => filter({ search })} placeholder="Search PO number" />
        <select value={params.status || ""} onChange={(e) => filter({ status: e.target.value })}>
          <option value="">All statuses</option>
          {PO_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {(error || actionError) && <div className="alert">{error || actionError}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>PO</th><th>Product</th><th>Supplier</th><th>Ordered</th><th>Expected</th>
              <th>Delivered</th><th>Delay</th><th>Qty</th><th>Status</th><th>Quality</th>
              {canWrite && <th></th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} className="center">Loading...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={11} className="center">No purchase orders found</td></tr>
            ) : (
              data.map((po) => (
                <tr key={po._id}>
                  <td>{po.poNumber}</td>
                  <td>{po.product?.name}</td>
                  <td>{po.supplier?.name}</td>
                  <td>{fmtDate(po.orderDate)}</td>
                  <td>{fmtDate(po.expectedDeliveryDate)}</td>
                  <td>{fmtDate(po.actualDeliveryDate)}</td>
                  <td className={po.delayDays > 0 ? "late" : ""}>{po.delayDays ?? "-"}</td>
                  <td>{po.qtyOrdered}</td>
                  <td><span className={`pill ${po.status.replace(" ", "").toLowerCase()}`}>{po.status}</span></td>
                  <td>{po.qualityIssue ? "Issue" : "OK"}</td>
                  {canWrite && (
                    <td className="actions">
                      <Link className="btn small" to={`/purchase-orders/${po._id}/edit`}>Edit</Link>
                      {isAdmin && <button className="btn small danger" onClick={() => remove(po)}>Delete</button>}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination pagination={pagination} onPage={setPage} />
    </div>
  );
}