import { useState } from "react";
import { Link } from "react-router-dom";
import { insightService } from "../services";
import useAuth from "../context/useAuth";
import useFetch from "../hooks/useFetch";
import Pill from "../components/Pill";
import { num } from "../utils/format";
import PageHeader from "../components/PageHeader";
import ProductCell from "../components/ProductCell";
import { exportCsv } from "../utils/exportCsv";

const REORDER_COLS = [
  { header: "Product code", key: "product_id" },
  { header: "Product name", key: "name" },
  { header: "ABC-XYZ", key: "classification" },
  { header: "Priority", key: "priority" },
  { header: "Current stock", key: "inputs.stock" },
  { header: "On order", key: "inputs.on_order" },
  { header: "Reorder point", key: "reorder.reorder_point" },
  { header: "Inventory position", key: "reorder.inventory_position" },
  { header: "Order quantity", key: "reorder.order_qty" },
  { header: "Supplier", key: "supplier.name" },
];

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
      <PageHeader title="Smart Reorder" subtitle="Recommended order quantities based on lead-time demand, buffer stock, and supplier reliability." />
      <p className="muted small">
        Order = forecast demand over the lead time + <abbr title="Extra inventory held to protect against demand spikes or supplier delays">safety stock</abbr> - inventory position, adjusted for supplier reliability.
      </p>
      <div className="toolbar">
        <label className="inline">
          <input type="checkbox" checked={onlyOrder} onChange={(e) => setOnlyOrder(e.target.checked)} />
          Only products that need an order
        </label>
        <span className="muted">{rows.length} products, {num(totalUnits, 0)} units in total</span>
        <button
          type="button"
          className="btn small"
          onClick={() => exportCsv("smart-reorder-recommendations", REORDER_COLS, rows)}
          disabled={!rows.length}
        >
          Export CSV
        </button>
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
                  <td><ProductCell product={d} size="md" imageList={rows} /></td>
              <td><Pill value={d.classification?.abc_xyz} title="ABC ranks value contribution; XYZ describes demand variability." /></td>
                  <td><Pill value={d.priority} /></td>
              <td className="numeric">{num(d.inputs.stock, 0)}</td>
              <td className="numeric">{num(d.inputs.on_order, 0)}</td>
              <td className="numeric">{num(d.reorder.reorder_point, 0)}</td>
              <td className="numeric">{num(d.reorder.inventory_position, 0)}</td>
              <td className="numeric"><strong>{d.reorder.order_qty}</strong></td>
                  <td>
                    <div>
                      <span>{d.reorder.supplier_id} ({num(d.reorder.supplier_reliability, 0)}%)</span>
                      {d.reorder.supplier_warning && (
                        <span className="badge danger" style={{ marginLeft: "6px", fontSize: "11px" }} title={d.reorder.supplier_warning}>
                          High Risk
                        </span>
                      )}
                    </div>
                    {d.reorder.alternate_supplier && (
                      <div className="muted small" style={{ marginTop: "3px" }} title="Recommended alternate supplier based on reliability">
                        Alt: {d.reorder.alternate_supplier.supplier_id} ({num(d.reorder.alternate_supplier.reliability_score, 0)}%)
                      </div>
                    )}
                  </td>
                  {canWrite && (
                    <td className="actions" style={{ whiteSpace: "nowrap" }}>
                      {d.reorder.order_qty > 0 && (
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          <Link
                            className="btn small primary"
                            to={`/purchase-orders/new?productCode=${d.product_id}&supplierCode=${d.reorder.supplier_id}&qty=${d.reorder.order_qty}`}
                          >
                            Create PO
                          </Link>
                          {d.reorder.alternate_supplier && (
                            <Link
                              className="btn small"
                              title={`Order from alternate supplier ${d.reorder.alternate_supplier.supplier_id} (${num(d.reorder.alternate_supplier.reliability_score, 0)}% reliability)`}
                              to={`/purchase-orders/new?productCode=${d.product_id}&supplierCode=${d.reorder.alternate_supplier.supplier_id}&qty=${d.reorder.order_qty}`}
                            >
                              Use {d.reorder.alternate_supplier.supplier_id}
                            </Link>
                          )}
                        </div>
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
