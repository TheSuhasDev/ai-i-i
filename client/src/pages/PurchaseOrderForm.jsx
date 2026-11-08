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
          let sup = s.data.data.find((x) => x.code === q.get("supplierCode"));

          // If supplier in URL is High Risk, automatically upgrade to the product's most reliable supplier
          const riskMap = Object.fromEntries((risk.data.data ?? []).map((r) => [r.supplier_id, r]));
          const urlRisk = sup ? riskMap[sup.code] : null;

          if (!sup || urlRisk?.risk_level === "High") {
            if (prod?.suppliers?.length) {
              const prodSuppliers = prod.suppliers
                .map((supRef) => {
                  const sObj = typeof supRef === "object" ? supRef : s.data.data.find((x) => x._id === supRef);
                  return sObj ? { ...sObj, score: riskMap[sObj.code]?.reliability_score ?? 0, riskLevel: riskMap[sObj.code]?.risk_level } : null;
                })
                .filter(Boolean);

              if (prodSuppliers.length) {
                // Sort by highest reliability score
                prodSuppliers.sort((a, b) => b.score - a.score);
                // If current sup was high risk and a better supplier exists for this product, use the better one
                if (!sup || prodSuppliers[0].score > (urlRisk?.reliability_score ?? 0)) {
                  sup = prodSuppliers[0];
                }
              }
            }
          }

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

  const set = (key) => (e) => {
    const val = e.target.value;
    setForm((f) => {
      const next = { ...f, [key]: val };
      // Keep PO number date synchronized with orderDate
      if (key === "orderDate" && val) {
        const dStr = val.replaceAll("-", "");
        if (/^PO-\d{8}-/i.test(f.poNumber)) {
          next.poNumber = f.poNumber.replace(/^PO-\d{8}-/i, `PO-${dStr}-`);
        }
      }
      // When items are partially received, mark as Partially Delivered; when fully received, mark as Delivered
      if (key === "qtyReceived") {
        const received = Number(val);
        const ordered = Number(f.qtyOrdered);
        if (ordered > 0 && received >= ordered) {
          next.status = "Delivered";
          if (!next.actualDeliveryDate) {
            next.actualDeliveryDate = todayInput();
          }
        } else if (ordered > 0 && received > 0 && received < ordered && f.status !== "Cancelled") {
          next.status = "Partially Delivered";
        }
      }
      return next;
    });
  };

  // Entering an actual delivery date marks the order as Delivered (or Partially Delivered if qty remaining).
  const setActual = (e) => {
    const v = e.target.value;
    setForm((f) => {
      const ord = Number(f.qtyOrdered || 0);
      const rec = Number(f.qtyReceived || 0);
      let status = f.status;
      if (v) {
        status = (rec > 0 && rec < ord) ? "Partially Delivered" : "Delivered";
      }
      return { ...f, actualDeliveryDate: v, status };
    });
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

  // Best alternative: highest reliability_score among OTHER suppliers who SUPPLY THIS PRODUCT
  const bestAlt = useMemo(() => {
    const currentProd = products.find((x) => x._id === form.product);
    const prodSupplierIds = new Set(
      (currentProd?.suppliers || []).map((sRef) => (typeof sRef === "object" ? sRef?._id : sRef))
    );

    // Prefer alternate suppliers that actually supply this product
    let candidates = Object.entries(riskBySupId)
      .filter(([sid]) => sid !== form.supplier && (prodSupplierIds.size === 0 || prodSupplierIds.has(sid)))
      .map(([, r]) => r)
      .filter((r) => r.reliability_score != null);

    // Fallback to any general supplier if product has no other linked supplier
    if (!candidates.length) {
      candidates = Object.entries(riskBySupId)
        .filter(([sid]) => sid !== form.supplier)
        .map(([, r]) => r)
        .filter((r) => r.reliability_score != null);
    }

    if (!candidates.length) return null;
    return candidates.reduce((a, b) => (b.reliability_score > a.reliability_score ? b : a));
  }, [riskBySupId, form.supplier, form.product, products]);

  // Show warning ONLY if the selected supplier is genuinely riskier than an available alternative
  const isWorseThanAlternative = Boolean(
    selectedRisk &&
    bestAlt &&
    (bestAlt.reliability_score ?? 0) > (selectedRisk.reliability_score ?? 0) &&
    selectedRisk.risk_level === "High"
  );

  return (
    <div>
      <PageHeader title={id ? "Edit purchase order" : "Add purchase order"} subtitle="Enter the supplier, product, quantity, and expected delivery details." />
      {error && <div className="alert">{error}</div>}
      {isWorseThanAlternative && (
        <div className="alert warning supplier-risk-banner">
          <strong>&#9888; Sub-optimal supplier selected</strong> — {selectedRisk._supObj?.code} {selectedRisk._supObj?.name} has reliability score{" "}
          <strong>{selectedRisk.reliability_score != null ? selectedRisk.reliability_score.toFixed(2) : "—"}</strong>.
          {bestAlt && (
            <span className="supplier-risk-alt">
              {" "}Recommended alternative: <strong>{bestAlt._supObj.code} {bestAlt._supObj.name}</strong> (higher reliability{" "}
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
