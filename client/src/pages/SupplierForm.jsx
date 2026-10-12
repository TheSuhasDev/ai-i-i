import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supplierService } from "../services";
import { errorMessage } from "../services/api";
import Field from "../components/Field";

const empty = { code: "", name: "", contactEmail: "", city: "" };

export default function SupplierForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    supplierService
      .get(id)
      .then(({ data }) => setForm({ ...empty, ...data.data }))
      .catch((e) => setError(errorMessage(e)));
  }, [id]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const payload = { code: form.code, name: form.name, contactEmail: form.contactEmail, city: form.city };
    try {
      if (id) await supplierService.update(id, payload);
      else await supplierService.create(payload);
      navigate("/suppliers");
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div>
      <h2>{id ? "Edit supplier" : "Add supplier"}</h2>
      {error && <div className="alert">{error}</div>}
      <form className="card form" onSubmit={submit}>
        <div className="grid">
          <Field label="Code"><input value={form.code} onChange={set("code")} placeholder="S9" required /></Field>
          <Field label="Name"><input value={form.name} onChange={set("name")} required /></Field>
          <Field label="Contact email"><input type="email" value={form.contactEmail} onChange={set("contactEmail")} /></Field>
          <Field label="City"><input value={form.city} onChange={set("city")} /></Field>
        </div>
        <div className="form-actions">
          <button className="btn primary" disabled={busy}>{busy ? "Saving..." : "Save"}</button>
          <Link className="btn" to="/suppliers">Cancel</Link>
        </div>
      </form>
    </div>
  );
}