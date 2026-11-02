import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { insightService } from "../services";
import useAuth from "../context/useAuth";
import useAnalysis from "../hooks/useAnalysis";
import useToast from "../context/useToast";
import Pill from "../components/Pill";
import { num } from "../utils/format";
import PageHeader from "../components/PageHeader";
import ProductCell from "../components/ProductCell";
import MetricCard from "../components/MetricCard";
import { exportCsv } from "../utils/exportCsv";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AnalysisButton, AnalysisIdle, AnalysisLoader, AnalysisReveal } from "../components/analysis";

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
  const toast = useToast();
  const { state, data, error, analyzedAt, run } = useAnalysis(fetchFull, {
    cacheKey: "smart-reorder",
    onSuccess: () => toast.success("Replenishment analysis complete"),
  });
  const [showLoader, setShowLoader] = useState(false);

  const handleAnalyze = useCallback(async () => {
    setShowLoader(true);
    try {
      await run();
    } catch {
      // Handled in useAnalysis
    }
  }, [run]);
  const [onlyOrder, setOnlyOrder] = useState(true);
  const [showChart, setShowChart] = useState(false);

  const all = (data?.data ?? []).map((i) => i.data).filter(Boolean);
  const rows = onlyOrder ? all.filter((d) => d.reorder.order_qty > 0) : all;
  const totalUnits = rows.reduce((s, d) => s + (d.reorder.order_qty || 0), 0);
  const criticalCount = rows.filter((d) => d.priority === "Critical").length;

  const reorderComparisonData = rows.slice(0, 8).map((d) => ({
    name: d.name.length > 12 ? `${d.name.slice(0, 10)}…` : d.name,
    fullName: d.name,
    stock: d.inputs?.stock || 0,
    reorderPoint: Math.round(d.reorder?.reorder_point || 0),
    orderQty: Math.round(d.reorder?.order_qty || 0),
  }));

  return (
    <div>
      <PageHeader
        title="Smart Reorder"
        subtitle="Automated replenishment recommendations based on lead-time demand and buffer stock."
        actions={state === "done" && !showLoader && (
          <AnalysisButton onClick={handleAnalyze} isRunning={state === "running"} isDone={true} size="small" />
        )}
      />

      {showLoader ? (
        <AnalysisLoader
          steps={[
            "Auditing stock on hand & transit orders",
            "Projecting lead-time demand",
            "Calculating buffer stock & safety thresholds",
            "Computing optimal reorder quantities",
          ]}
          isComplete={state === "done" || state === "error"}
          onComplete={() => setShowLoader(false)}
        />
      ) : state === "error" ? (
        <div className="card" style={{ textAlign: "center", padding: "40px 20px", maxWidth: 640, margin: "32px auto" }}>
          <div className="alert" style={{ marginBottom: 16 }}>Failed to calculate reorder quantities: {error}</div>
          <AnalysisButton onClick={handleAnalyze} label="Retry Analysis" isRunning={state === "running"} />
        </div>
      ) : state === "idle" ? (
        <AnalysisIdle
          icon="📦"
          title="Compute Smart Replenishment Quantities"
          description="Evaluate inventory positions against projected lead-time demand to determine exact reorder points and suggested replenishment batches."
          buttonLabel="Compute Reorder Quantities"
          onAnalyze={handleAnalyze}
          isRunning={state === "running"}
        />
      ) : (
        <AnalysisReveal analyzedAt={analyzedAt} onRerun={handleAnalyze} isRunning={state === "running"}>

      <div className="cards" style={{ marginBottom: "16px" }}>
        <MetricCard label="Products to Reorder" value={rows.length} sub="Requiring procurement action" tone={rows.length > 0 ? "tone-warning" : "tone-healthy"} />
        <MetricCard label="Recommended Units" value={num(totalUnits, 0)} sub="Total replenishment volume" tone="tone-healthy" />
        <MetricCard label="Critical Stockout Risk" value={criticalCount} sub="May exhaust before delivery" tone={criticalCount > 0 ? "tone-critical" : "tone-healthy"} />
      </div>

      <div className="toolbar" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px" }}>
        <label className="inline">
          <input type="checkbox" checked={onlyOrder} onChange={(e) => setOnlyOrder(e.target.checked)} />
          Only products needing reorder
        </label>
        <span className="muted small">{rows.length} products, {num(totalUnits, 0)} units total</span>
        <button
          type="button"
          className="btn small"
          onClick={() => setShowChart((v) => !v)}
          title="Toggle Reorder Comparison Chart"
          style={{ marginLeft: "auto" }}
        >
          {showChart ? "Hide Chart" : "📊 Comparison Chart"}
        </button>
        <button
          type="button"
          className="btn small"
          onClick={() => exportCsv("smart-reorder-recommendations", REORDER_COLS, rows)}
          disabled={!rows.length}
        >
          Export CSV
        </button>
      </div>

      {showChart && reorderComparisonData.length > 0 && (
        <section className="card" style={{ marginBottom: "16px", padding: "16px" }}>
          <h4 style={{ margin: "0 0 12px", fontSize: "14px", color: "var(--text-muted)" }}>Stock Position vs Reorder Point vs Recommended Order Qty (Top Items)</h4>
          <div style={{ width: "100%", height: 210 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reorderComparisonData} margin={{ top: 8, right: 16, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, rgba(255,255,255,0.08))" />
                <XAxis dataKey="name" interval={0} angle={-15} textAnchor="end" height={45} tick={{ fontSize: 11 }} />
                <YAxis width={40} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value, name, item) => [`${value} units`, name === "stock" ? "Stock on Hand" : name === "reorderPoint" ? "Reorder Point" : "Recommended Order", item.payload.fullName]} />
                <Legend />
                <Bar dataKey="stock" name="Stock" fill="var(--muted, #64748b)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="reorderPoint" name="Reorder Point" fill="var(--warning, #f59e0b)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="orderQty" name="Order Qty" fill="var(--success, #10b981)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {error && <div className="alert">{error}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Product</th><th>ABC-XYZ</th><th>Priority</th><th>Stock</th><th>On Order</th>
              <th>Reorder Point</th><th>Inv. Position</th><th>Order Qty</th><th>Supplier</th>{canWrite && <th></th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={10} className="center">Nothing to order right now</td></tr>
            ) : (
              rows.map((d) => (
                <tr key={d.product_id}>
                  <td><ProductCell product={d} size="md" imageList={rows} /></td>
                  <td><Pill value={d.classification?.abc_xyz} /></td>
                  <td><Pill value={d.priority} /></td>
                  <td className="numeric">{num(d.inputs.stock, 0)}</td>
                  <td className="numeric">{d.inputs.on_order > 0 ? <span className="badge">🚚 {num(d.inputs.on_order, 0)}</span> : "-"}</td>
                  <td className="numeric">{num(d.reorder.reorder_point, 0)}</td>
                  <td className="numeric">{num(d.reorder.inventory_position, 0)}</td>
                  <td className="numeric">
                    {d.reorder.order_qty > 0 ? (
                      <span className="pill status-healthy" style={{ fontWeight: 600 }}>+{d.reorder.order_qty}</span>
                    ) : (
                      <span className="muted">-</span>
                    )}
                  </td>
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
        </AnalysisReveal>
      )}
    </div>
  );
}
