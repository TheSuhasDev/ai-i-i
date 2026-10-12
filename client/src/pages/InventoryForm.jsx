import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { inventoryService, productService } from "../services";
import { errorMessage } from "../services/api";
import Field from "../components/Field";
import { todayInput } from "../utils/format";

const empty = { product: "", currentStock: "", inTransitQty: 0, snapshotDate: todayInput() };

export default function InventoryForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [productLabel, setProductLabel] = useState("");
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (id) {
      inventoryService
        .get(id)
        .then(({ data }) => {
          const r = data.data;
          setProductLabel(`${r.product?.code} ${r.product?.name}`);
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
      <h2>{id ? "Update stock" : "Add inventory record"}</h2>
      {error && <div className="alert">{error}</div>}
      <form className="card form" onSubmit={submit}>
        <div className="grid">
          {id ? (
            <Field label="Product"><input value={productLabel} disabled /></Field>
          ) : (
            <Field label="Product">
              <select value={form.product} onChange={set("product")} required>
                <option value="">Select product</option>
                {products.map((p) => <option key={p._id} value={p._id}>{p.code} {p.name}</option>)}
              </select>
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