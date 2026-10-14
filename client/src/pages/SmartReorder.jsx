import { useState } from "react";
import { Link } from "react-router-dom";
import { insightService } from "../services";
import useAuth from "../context/useAuth";
import useFetch from "../hooks/useFetch";
import Pill from "../components/Pill";
import { num } from "../utils/format";

const fetchFull = () => insightService.list({ full: 1 });

export default function SmartReorder() {
  const { canWrite } = useAuth();
  const { data, loading, error } = useFetch(fetchFull);
  const [onlyOrder, setOnlyOrder] = useState(true);

  const all = (data?.data ?? []).map((i) => i.data).filter(Boolean);
  const rows = onlyOrder ? all.filter((d) => d.reorder.order_qty > 0) : all;
  const totalUnits = rows.reduce((s, d) => s + (d.reorder.order_qty || 0), 0);

  return (
    <div>
      <div className="page-head"><h2>Smart Reorder</h2></div>
      <p className="muted">
        Order = forecast demand over the lead time + safety stock - inventory position, adjusted for supplier reliability.
      </p>
      <div className="toolbar">
        <label className="inline">
          <input type="checkbox" checked={onlyOrder} onChange={(e) => setOnlyOrder(e.target.checked)} />
          Only products that need an order
        </label>
        <span className="muted">{rows.length} products, {num(totalUnits, 0)} units in total</span>
      </div>
      {error && <div className="alert">{error}</div>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Product</th><th>ABC-XYZ</th><th>Priority</th><th>Stock</th><th>On order</th>
              <th>Reorder point</th><th>Inv. position</th><th>Order qty</th><th>Supplier</th>{canWrite && <th></th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="center">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={10} className="center">Nothing to order right now</td></tr>
            ) : (
              rows.map((d) => (
                <tr key={d.product_id}>
                  <td><Link to={`/product/${d.product_id}`}>{d.product_id} {d.name}</Link></td>
                  <td>{d.classification?.abc_xyz}</td>
                  <td><Pill value={d.priority} /></td>
                  <td>{num(d.inputs.stock, 0)}</td>
                  <td>{num(d.inputs.on_order, 0)}</td>
                  <td>{num(d.reorder.reorder_point, 0)}</td>
                  <td>{num(d.reorder.inventory_position, 0)}</td>
                  <td><strong>{d.reorder.order_qty}</strong></td>
                  <td>{d.reorder.supplier_id} ({num(d.reorder.supplier_reliability, 0)})</td>
                  {canWrite && (
                    <td>
                      {d.reorder.order_qty > 0 && (
                        <Link
                          className="btn small primary"
                          to={`/purchase-orders/new?productCode=${d.product_id}&supplierCode=${d.reorder.supplier_id}&qty=${d.reorder.order_qty}`}
                        >
                          Create PO
                        </Link>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}