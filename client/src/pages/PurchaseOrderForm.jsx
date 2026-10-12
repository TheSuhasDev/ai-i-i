import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { productService, supplierService, purchaseOrderService } from "../services";
import { errorMessage } from "../services/api";
import Field from "../components/Field";
import { PO_STATUSES, toDateInput } from "../utils/format";

const empty = {
  poNumber: "", product: "", supplier: "", orderDate: "", expectedDeliveryDate: "",
  actualDeliveryDate: "", qtyOrdered: "", qtyReceived: 0, unitCost: "", qualityIssue: false, status: "Pending",
};

export default function PurchaseOrderForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      productService.list({ limit: 100, sort: "code" }),
      supplierService.list({ limit: 100, sort: "code" }),
    ])
      .then(([p, s]) => {
        setProducts(p.data.data);
        setSuppliers(s.data.data);
      })
      .catch((e) => setError(errorMessage(e)));

    if (id) {
      purchaseOrderService
        .get(id)
        .then(({ data }) => {
          const po = data.data;
          setForm({
            ...empty,
            poNumber: po.poNumber,
            product: po.product?._id || "",
            supplier: po.supplier?._id || "",
            orderDate: toDateInput(po.orderDate),
            expectedDeliveryDate: toDateInput(po.expectedDeliveryDate),
            actualDeliveryDate: toDateInput(po.actualDeliveryDate),
            qtyOrdered: po.qtyOrdered,
            qtyReceived: po.qtyReceived,
            unitCost: po.unitCost,
            qualityIssue: po.qualityIssue,
            status: po.status,
          });
        })
        .catch((e) => setError(errorMessage(e)));
    }
  }, [id]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Entering an actual delivery date marks the order as Delivered.
  const setActual = (e) => {
    const v = e.target.value;
    setForm((f) => ({ ...f, actualDeliveryDate: v, status: v ? "Delivered" : f.status }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const hasActual = Boolean(form.actualDeliveryDate);
    const payload = {
      poNumber: form.poNumber,
      product: form.product,
      supplier: form.supplier,
      orderDate: form.orderDate,
      expectedDeliveryDate: form.expectedDeliveryDate,
      actualDeliveryDate: hasActual ? form.actualDeliveryDate : null,
      delayDays: hasActual ? undefined : null, // server computes delay when delivered
      qtyOrdered: Number(form.qtyOrdered),
      qtyReceived: Number(form.qtyReceived),
      unitCost: Number(form.unitCost),
      qualityIssue: form.qualityIssue,
      status: form.status,
    };
    try {
      if (id) await purchaseOrderService.update(id, payload);
      else await purchaseOrderService.create(payload);
      navigate("/purchase-orders");
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div>
      <h2>{id ? "Edit purchase order" : "Add purchase order"}</h2>
      {error && <div className="alert">{error}</div>}
      <form className="card form" onSubmit={submit}>
        <div className="grid">
          <Field label="PO number"><input value={form.poNumber} onChange={set("poNumber")} placeholder="PO-0399" required /></Field>
          <Field label="Product">
            <select value={form.product} onChange={set("product")} required>
              <option value="">Select product</option>
              {products.map((p) => <option key={p._id} value={p._id}>{p.code} {p.name}</option>)}
            </select>
          </Field>
          <Field label="Supplier">
            <select value={form.supplier} onChange={set("supplier")} required>
              <option value="">Select supplier</option>
              {suppliers.map((s) => <option key={s._id} value={s._id}>{s.code} {s.name}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={set("status")}>
              {PO_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Order date"><input type="date" value={form.orderDate} onChange={set("orderDate")} required /></Field>
          <Field label="Expected delivery"><input type="date" value={form.expectedDeliveryDate} onChange={set("expectedDeliveryDate")} required /></Field>
          <Field label="Actual delivery (optional)"><input type="date" value={form.actualDeliveryDate} onChange={setActual} /></Field>
          <Field label="Unit cost (INR)"><input type="number" min="0" step="0.01" value={form.unitCost} onChange={set("unitCost")} required /></Field>
          <Field label="Qty ordered"><input type="number" min="1" step="1" value={form.qtyOrdered} onChange={set("qtyOrdered")} required /></Field>
          <Field label="Qty received"><input type="number" min="0" step="1" value={form.qtyReceived} onChange={set("qtyReceived")} /></Field>
        </div>
        <label className="inline">
          <input type="checkbox" checked={form.qualityIssue} onChange={(e) => setForm((f) => ({ ...f, qualityIssue: e.target.checked }))} />
          Quality issue reported
        </label>
        <div className="form-actions">
          <button className="btn primary" disabled={busy}>{busy ? "Saving..." : "Save"}</button>
          <Link className="btn" to="/purchase-orders">Cancel</Link>
        </div>
      </form>
    </div>
  );
}