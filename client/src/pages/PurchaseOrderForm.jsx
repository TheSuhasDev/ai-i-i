import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { productService, supplierService, purchaseOrderService, insightService } from "../services";
import { errorMessage } from "../services/api";
import Field from "../components/Field";
import ConfirmModal from "../components/ConfirmModal";
import useToast from "../context/useToast";
import { PO_STATUSES, addDaysInput, toDateInput, todayInput } from "../utils/format";
import PageHeader from "../components/PageHeader";
import ProductSelect from "../components/ProductSelect";

const empty = {
  poNumber: "", product: "", supplier: "", orderDate: "", expectedDeliveryDate: "",
  actualDeliveryDate: "", qtyOrdered: "", qtyReceived: 0, unitCost: "", qualityIssue: false, status: "Pending",
};

export default function PurchaseOrderForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefill = searchParams.toString();
  const toast = useToast();
  const [form, setForm] = useState(empty);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [supplierRisk, setSupplierRisk] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [duplicatePrompt, setDuplicatePrompt] = useState(null);

  useEffect(() => {
    Promise.all([
      productService.list({ limit: 100, sort: "code" }),
      supplierService.list({ limit: 100, sort: "code" }),
      insightService.supplierRisk().catch(() => ({ data: { data: [] } })),
    ])
      .then(([p, s, risk]) => {
        setProducts(p.data.data);
        setSuppliers(s.data.data);
        setSupplierRisk(risk.data.data ?? []);
        const q = new URLSearchParams(prefill);
        if (!id && q.get("productCode")) {
          const prod = p.data.data.find((x) => x.code === q.get("productCode"));
          const sup = s.data.data.find((x) => x.code === q.get("supplierCode"));
          if (prod) {
            setForm((f) => ({
              ...f,
              poNumber: `PO-${todayInput().replaceAll("-", "")}-${prod.code}`,
              product: prod._id,
              supplier: sup?._id || "",
              orderDate: todayInput(),
              expectedDeliveryDate: addDaysInput(prod.leadTimeDays),
              qtyOrdered: Number(q.get("qty")) || "",
              unitCost: prod.cost,
            }));
          }
        }
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
  }, [id, prefill]);

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
      if (id) {
        await purchaseOrderService.update(id, payload);
        toast.success(`Purchase order ${payload.poNumber} updated`);
      } else {
        await purchaseOrderService.create(payload);
        toast.success(`Purchase order ${payload.poNumber} created`);
      }
      navigate("/purchase-orders");
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.code === "DUPLICATE_OPEN_PO") {
        const msg = err.response.data.message || "An open purchase order already exists for this product.";
        setDuplicatePrompt({ payload, msg });
      } else {
        const msg = errorMessage(err);
        setError(msg);
        toast.error(msg);
      }
      setBusy(false);
    }
  };

  const confirmDuplicatePO = async () => {
    if (!duplicatePrompt) return;
    setBusy(true);
    try {
      await purchaseOrderService.create({ ...duplicatePrompt.payload, confirmDuplicate: true });
      toast.success(`Purchase order ${duplicatePrompt.payload.poNumber} created`);
      setDuplicatePrompt(null);
      navigate("/purchase-orders");
    } catch (retryErr) {
      const msg = errorMessage(retryErr);
      setError(msg);
      toast.error(msg);
      setBusy(false);
      setDuplicatePrompt(null);
    }
  };

  // Build supplier-risk lookup: supplier._id → risk row (keyed via supplier.code = risk.supplier_id)
  const riskBySupId = useMemo(() => {
    const codeToRisk = Object.fromEntries(supplierRisk.map((r) => [r.supplier_id, r]));
    const out = {};
    for (const s of suppliers) {
      if (codeToRisk[s.code]) out[s._id] = { ...codeToRisk[s.code], _supObj: s };
    }
    return out;
  }, [suppliers, supplierRisk]);

  const selectedRisk = form.supplier ? riskBySupId[form.supplier] : null;
  const isHighRisk = selectedRisk?.risk_level === "High";

  // Best alternative: highest reliability_score among other suppliers that have risk data
  const bestAlt = useMemo(() => {
    if (!isHighRisk) return null;
    const others = Object.entries(riskBySupId)
      .filter(([sid]) => sid !== form.supplier)
      .map(([, r]) => r)
      .filter((r) => r.reliability_score != null);
    if (!others.length) return null;
    return others.reduce((a, b) => (b.reliability_score > a.reliability_score ? b : a));
  }, [isHighRisk, riskBySupId, form.supplier]);

  return (
    <div>
      <PageHeader title={id ? "Edit purchase order" : "Add purchase order"} subtitle="Enter the supplier, product, quantity, and expected delivery details." />
      {error && <div className="alert">{error}</div>}
      {isHighRisk && (
        <div className="alert warning supplier-risk-banner">
          <strong>&#9888; High-risk supplier</strong> — reliability score{" "}
          <strong>{selectedRisk.reliability_score != null ? selectedRisk.reliability_score.toFixed(2) : "—"}</strong>.
          {bestAlt && (
            <span className="supplier-risk-alt">
              {" "}Best alternative: <strong>{bestAlt._supObj.code} {bestAlt._supObj.name}</strong> (reliability{" "}
              {bestAlt.reliability_score.toFixed(2)}).
              <button
                type="button"
                className="btn small"
                onClick={() => setForm((f) => ({ ...f, supplier: bestAlt._supObj._id }))}
              >
                Switch to {bestAlt._supObj.code}
              </button>
            </span>
          )}
        </div>
      )}
      <form className="card form" onSubmit={submit}>
        <div className="grid">
          <Field label="PO number"><input value={form.poNumber} onChange={set("poNumber")} placeholder="PO-0399" required /></Field>
          <Field label="Product">
            <ProductSelect products={products} value={form.product} onChange={(product) => setForm((f) => ({ ...f, product }))} />
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
          {id && <Field label="Actual delivery (optional)"><input type="date" value={form.actualDeliveryDate} onChange={setActual} /></Field>}
          <Field label="Unit cost (INR)"><input type="number" min="0" step="0.01" value={form.unitCost} onChange={set("unitCost")} required /></Field>
          <Field label="Qty ordered"><input type="number" min="1" step="1" value={form.qtyOrdered} onChange={set("qtyOrdered")} required /></Field>
          {id && <Field label="Qty received"><input type="number" min="0" step="1" value={form.qtyReceived} onChange={set("qtyReceived")} /></Field>}
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

      <ConfirmModal
        isOpen={Boolean(duplicatePrompt)}
        title="Duplicate Open Purchase Order"
        message={`${duplicatePrompt?.msg || "An open purchase order already exists for this product."} Do you want to proceed and create another purchase order anyway?`}
        confirmLabel="Create anyway"
        isDanger={false}
        onConfirm={confirmDuplicatePO}
        onCancel={() => {
          setDuplicatePrompt(null);
          setBusy(false);
        }}
      />
    </div>
  );
}
