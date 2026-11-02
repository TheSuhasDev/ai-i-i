import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supplierService } from "../services";
import { errorMessage } from "../services/api";
import PageHeader from "../components/PageHeader";
import Field from "../components/Field";
import useToast from "../context/useToast";

const empty = { code: "", name: "", contactEmail: "", city: "" };

export default function SupplierForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
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
      if (id) {
        await supplierService.update(id, payload);
        toast.success(`Supplier "${payload.name}" updated`);
      } else {
        await supplierService.create(payload);
        toast.success(`Supplier "${payload.name}" created`);
      }
      navigate("/suppliers");
    } catch (err) {
      const msg = errorMessage(err);
      setError(msg);
      toast.error(msg);
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title={id ? "Edit supplier" : "Add supplier"} subtitle="Maintain supplier contact details and delivery information." />
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
