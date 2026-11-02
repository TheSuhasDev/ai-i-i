import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { productService, supplierService } from "../services";
import { errorMessage } from "../services/api";
import Field from "../components/Field";
import useToast from "../context/useToast";
import { CATEGORIES } from "../utils/format";
import PageHeader from "../components/PageHeader";
import ProductThumb from "../components/ProductThumb";

const empty = {
  code: "", sku: "", name: "", imageUrl: "", category: CATEGORIES[0],
  price: "", cost: "", leadTimeDays: "", suppliers: [], isActive: true,
};

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(empty);
  const [allSuppliers, setAllSuppliers] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supplierService.list({ limit: 100, sort: "code" }).then((r) => setAllSuppliers(r.data.data)).catch((e) => setError(errorMessage(e)));
    if (id) {
      productService
        .get(id)
        .then(({ data }) => {
          const p = data.data;
          setForm({ ...empty, ...p, suppliers: (p.suppliers || []).map((s) => s._id) });
        })
        .catch((e) => setError(errorMessage(e)));
    }
  }, [id]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const toggleSupplier = (sid) =>
    setForm((f) => ({
      ...f,
      suppliers: f.suppliers.includes(sid) ? f.suppliers.filter((x) => x !== sid) : [...f.suppliers, sid],
    }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const payload = {
      code: form.code, sku: form.sku, name: form.name, imageUrl: form.imageUrl.trim() || undefined, category: form.category,
      price: Number(form.price), cost: Number(form.cost), leadTimeDays: Number(form.leadTimeDays),
      suppliers: form.suppliers, isActive: form.isActive,
    };
    try {
      if (id) {
        await productService.update(id, payload);
        toast.success(`Product "${payload.name}" updated successfully`);
      } else {
        await productService.create(payload);
        toast.success(`Product "${payload.name}" created successfully`);
      }
      navigate("/products");
    } catch (err) {
      const msg = errorMessage(err);
      setError(msg);
      toast.error(msg);
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title={id ? "Edit product" : "Add product"} subtitle="Enter the product details used across inventory and forecasting." />
      {error && <div className="alert">{error}</div>}
      <form className="card form" onSubmit={submit}>
        <div className="grid">
          <Field label="Code"><input value={form.code} onChange={set("code")} placeholder="P041" required /></Field>
          <Field label="SKU"><input value={form.sku} onChange={set("sku")} placeholder="SKU-1041" required /></Field>
          <Field label="Name"><input value={form.name} onChange={set("name")} required /></Field>
          <Field label="Image URL (optional)"><input type="url" value={form.imageUrl || ""} onChange={set("imageUrl")} placeholder="https://example.com/product.jpg" /></Field>
          <Field label="Category">
            <select value={form.category} onChange={set("category")}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Price (INR)"><input type="number" min="0" step="0.01" value={form.price} onChange={set("price")} required /></Field>
          <Field label="Cost (INR)"><input type="number" min="0" step="0.01" value={form.cost} onChange={set("cost")} required /></Field>
          <Field label="Lead time (days)"><input type="number" min="1" step="1" value={form.leadTimeDays} onChange={set("leadTimeDays")} required /></Field>
        </div>

        <div className="product-image-preview">
          <ProductThumb product={{ ...form, code: form.code }} size="lg" />
          <span><strong>Image preview</strong><span className="muted small">Uses the product photo by code unless an image URL is provided.</span></span>
        </div>

        <div className="field">
          <span>Suppliers (choose 1 or 2)</span>
          <div className="checks">
            {allSuppliers.map((s) => {
              const checked = form.suppliers.includes(s._id);
              return (
                <label key={s._id}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!checked && form.suppliers.length >= 2}
                    onChange={() => toggleSupplier(s._id)}
                  />
                  {s.code} {s.name}
                </label>
              );
            })}
          </div>
        </div>

        <label className="inline">
          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
          Active
        </label>

        <div className="form-actions">
          <button className="btn primary" disabled={busy || form.suppliers.length === 0}>
            {busy ? "Saving..." : "Save"}
          </button>
          <Link className="btn" to="/products">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
