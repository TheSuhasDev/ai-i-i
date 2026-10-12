import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import useAuth from "../context/useAuth";
import useList from "../hooks/useList";
import { inventoryService, productService } from "../services";
import { errorMessage } from "../services/api";
import Pagination from "../components/Pagination";
import { fmtDate } from "../utils/format";

export default function InventoryList() {
  const { canWrite, isAdmin } = useAuth();
  const { data, pagination, loading, error, params, filter, setPage, reload } = useList(inventoryService, {
    sort: "currentStock",
  });
  const [products, setProducts] = useState([]);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    productService.list({ limit: 100, sort: "code" }).then((r) => setProducts(r.data.data)).catch(() => {});
  }, []);

  const remove = async (rec) => {
    if (!window.confirm(`Delete the inventory record for "${rec.product?.name}"?`)) return;
    try {
      await inventoryService.remove(rec._id);
      setActionError("");
      reload();
    } catch (e) {
      setActionError(errorMessage(e));
    }
  };

  return (
    <div>
      <div className="page-head">
        <h2>Inventory</h2>
        {canWrite && <Link className="btn primary" to="/inventory/new">+ Add record</Link>}
      </div>

      <div className="toolbar">
        <select value={params.product || ""} onChange={(e) => filter({ product: e.target.value })}>
          <option value="">All products</option>
          {products.map((p) => <option key={p._id} value={p._id}>{p.code} {p.name}</option>)}
        </select>
        <select value={params.sort} onChange={(e) => filter({ sort: e.target.value })}>
          <option value="currentStock">Lowest stock first</option>
          <option value="-currentStock">Highest stock first</option>
          <option value="-updatedAt">Recently updated</option>
        </select>
      </div>

      {(error || actionError) && <div className="alert">{error || actionError}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Code</th><th>Product</th><th>Category</th><th>Current stock</th>
              <th>In transit</th><th>Lead time</th><th>Snapshot date</th><th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="center">Loading...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={8} className="center">No inventory records found</td></tr>
            ) : (
              data.map((r) => (
                <tr key={r._id}>
                  <td>{r.product?.code}</td>
                  <td>{r.product?.name}</td>
                  <td>{r.product?.category}</td>
                  <td className={r.currentStock === 0 ? "late" : ""}>
                    {r.currentStock === 0 ? "0 (out of stock)" : r.currentStock}
                  </td>
                  <td>{r.inTransitQty}</td>
                  <td>{r.product?.leadTimeDays} d</td>
                  <td>{fmtDate(r.snapshotDate)}</td>
                  <td className="actions">
                    <Link className="btn small" to={`/inventory/${r._id}/edit`}>Update stock</Link>
                    {isAdmin && <button className="btn small danger" onClick={() => remove(r)}>Delete</button>}
                  </td>
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