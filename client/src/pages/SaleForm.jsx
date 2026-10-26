import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { productService, saleService } from "../services";
import { errorMessage } from "../services/api";
import Field from "../components/Field";
import { money, toDateInput, todayInput } from "../utils/format";
import PageHeader from "../components/PageHeader";
import ProductSelect from "../components/ProductSelect";

const empty = { product: "", date: todayInput(), unitsSold: "", unitPrice: "", promoFlag: false };

export default function SaleForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    productService.list({ limit: 100, sort: "code" }).then((r) => setProducts(r.data.data)).catch((e) => setError(errorMessage(e)));
    if (id) {
      saleService
        .get(id)
        .then(({ data }) => {
          const s = data.data;
          setForm({
            product: s.product?._id || "",
            date: toDateInput(s.date),
            unitsSold: s.unitsSold,
            unitPrice: s.unitPrice,
            promoFlag: s.promoFlag,
          });
        })
        .catch((e) => setError(errorMessage(e)));
    }
  }, [id]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Choosing a product on a new sale pre-fills its list price.
  const pickProduct = (e) => {
    const pid = e.target.value;
    const p = products.find((x) => x._id === pid);
    setForm((f) => ({ ...f, product: pid, unitPrice: !id && p ? p.price : f.unitPrice }));
  };

  const revenue = Number(form.unitsSold || 0) * Number(form.unitPrice || 0);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const payload = {
      product: form.product,
      date: form.date,
      unitsSold: Number(form.unitsSold),
      unitPrice: Number(form.unitPrice),
      promoFlag: form.promoFlag,
    };
    try {
      if (id) await saleService.update(id, payload);
      else await saleService.create(payload);
      navigate("/sales");
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title={id ? "Edit sale" : "Record sale"} subtitle="Record product demand with its date, quantity, and sale details." />
      {error && <div className="alert">{error}</div>}
      <form className="card form" onSubmit={submit}>
        <div className="grid">
          <Field label="Product">
            <ProductSelect products={products} value={form.product} onChange={(product) => pickProduct({ target: { value: product } })} />
          </Field>
          <Field label="Date"><input type="date" value={form.date} onChange={set("date")} required /></Field>
          <Field label="Units sold"><input type="number" min="0" step="1" value={form.unitsSold} onChange={set("unitsSold")} required /></Field>
          <Field label="Unit price (INR)"><input type="number" min="0" step="0.01" value={form.unitPrice} onChange={set("unitPrice")} required /></Field>
        </div>
        <label className="inline">
          <input type="checkbox" checked={form.promoFlag} onChange={(e) => setForm((f) => ({ ...f, promoFlag: e.target.checked }))} />
          Promotion day
        </label>
        <p className="muted">Revenue (calculated): <strong>{money(revenue)}</strong></p>
        <p className="muted small">There can be only one sale record per product per day. A second one gives a duplicate error.</p>
        <div className="form-actions">
          <button className="btn primary" disabled={busy}>{busy ? "Saving..." : "Save"}</button>
          <Link className="btn" to="/sales">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
