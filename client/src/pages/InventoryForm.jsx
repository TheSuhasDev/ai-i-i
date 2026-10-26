import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { inventoryService, productService } from "../services";
import { errorMessage } from "../services/api";
import Field from "../components/Field";
import { todayInput } from "../utils/format";
import PageHeader from "../components/PageHeader";
import ProductCell from "../components/ProductCell";
import ProductSelect from "../components/ProductSelect";

const empty = { product: "", currentStock: "", inTransitQty: 0, snapshotDate: todayInput() };

export default function InventoryForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [existingProduct, setExistingProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (id) {
      inventoryService
        .get(id)
        .then(({ data }) => {
          const r = data.data;
          setExistingProduct(r.product || null);
          // Updating a record means recording a new count, so the date defaults to today.
          setForm({
            product: r.product?._id || "",
            currentStock: r.currentStock,
            inTransitQty: r.inTransitQty,
            snapshotDate: todayInput(),
          });
        })
        .catch((e) => setError(errorMessage(e)));
    } else {
      productService.list({ limit: 100, sort: "code" }).then((r) => setProducts(r.data.data)).catch((e) => setError(errorMessage(e)));
    }
  }, [id]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const payload = {
      currentStock: Number(form.currentStock),
      inTransitQty: Number(form.inTransitQty),
      snapshotDate: form.snapshotDate,
    };
    try {
      if (id) await inventoryService.update(id, payload);
      else await inventoryService.create({ ...payload, product: form.product });
      navigate("/inventory");
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title={id ? "Update stock" : "Add inventory record"} subtitle="Record the current quantity and inventory details for a product." />
      {error && <div className="alert">{error}</div>}
      <form className="card form" onSubmit={submit}>
        <div className="grid">
          {id ? (
            <Field label="Product"><ProductCell product={existingProduct || {}} size="sm" to={null} /></Field>
          ) : (
            <Field label="Product">
              <ProductSelect products={products} value={form.product} onChange={(product) => setForm((f) => ({ ...f, product }))} />
            </Field>
          )}
          <Field label="Current stock (units)"><input type="number" min="0" step="1" value={form.currentStock} onChange={set("currentStock")} required /></Field>
          <Field label="In transit (units)"><input type="number" min="0" step="1" value={form.inTransitQty} onChange={set("inTransitQty")} /></Field>
          <Field label="Snapshot date"><input type="date" value={form.snapshotDate} onChange={set("snapshotDate")} required /></Field>
        </div>
        {!id && <p className="muted small">Each product can have only one inventory record. Adding a second one gives a duplicate error.</p>}
        <div className="form-actions">
          <button className="btn primary" disabled={busy}>{busy ? "Saving..." : "Save"}</button>
          <Link className="btn" to="/inventory">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
