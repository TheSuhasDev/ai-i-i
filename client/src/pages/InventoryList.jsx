import { useEffect, useState } from "react";
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
import ProductSelect from "../components/ProductSelect";
import { exportCsv } from "../utils/exportCsv";

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
  const { data, pagination, loading, error, params, filter, setPage, reload } = useList(inventoryService, {
    sort: "currentStock",
  });
  const [products, setProducts] = useState([]);
  const [actionError, setActionError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

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

  const totalStock = data.reduce((s, r) => s + (r.currentStock || 0), 0);
  const totalInTransit = data.reduce((s, r) => s + (r.inTransitQty || 0), 0);
  const outOfStockCount = data.filter((r) => r.currentStock === 0).length;

  return (
    <div>
      <PageHeader title="Inventory" subtitle="Review stock levels and update inventory records." actions={canWrite && <Link className="btn primary" to="/inventory/new">+ Add record</Link>} />

      <div className="cards" style={{ marginBottom: "16px" }}>
        <MetricCard label="Stock on Hand" value={num(totalStock, 0)} sub="Total physical units" tone="tone-healthy" />
        <MetricCard label="Units in Transit" value={num(totalInTransit, 0)} sub="Pending shipment deliveries" tone="tone-healthy" />
        <MetricCard label="Stockouts" value={outOfStockCount} sub="Zero stock on hand" tone={outOfStockCount ? "tone-critical" : "tone-healthy"} />
      </div>

      <div className="toolbar">
        <ProductSelect products={products} value={params.product || ""} onChange={(product) => filter({ product })} allLabel="All products" />
        <select value={params.sort} onChange={(e) => filter({ sort: e.target.value })}>
          <option value="currentStock">Lowest stock first</option>
          <option value="-currentStock">Highest stock first</option>
          <option value="-updatedAt">Recently updated</option>
        </select>
        <button className="btn" onClick={() => exportCsv("inventory", INV_COLS, data)} disabled={!data.length}>Export CSV</button>
      </div>

      {(error || actionError) && <div className="alert">{error || actionError}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Product</th><th>Category</th><th>Current stock</th>
              <th>In transit</th><th>Lead time</th><th>Snapshot date</th><th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="center">Loading...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={7} className="center">No inventory records found</td></tr>
            ) : (
              data.map((r) => (
                <tr key={r._id}>
                  <td><ProductCell product={r.product || {}} imageList={data.map((row) => row.product).filter(Boolean)} /></td>
                  <td>{r.product?.category}</td>
                  <td className={r.currentStock === 0 ? "late" : ""}>
                    {r.currentStock === 0 ? "0 (out of stock)" : r.currentStock}
                  </td>
                  <td>{r.inTransitQty}</td>
                  <td>{r.product?.leadTimeDays} d</td>
                  <td>{fmtDate(r.snapshotDate)}</td>
                  <td className="actions">
                    <Link className="btn small" to={`/inventory/${r._id}/edit`}>Update stock</Link>
                    {isAdmin && <button className="btn small danger" onClick={() => setDeleteTarget(r)}>Delete</button>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
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
