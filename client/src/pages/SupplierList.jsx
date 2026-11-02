import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import useAuth from "../context/useAuth";
import useToast from "../context/useToast";
import useList from "../hooks/useList";
import { supplierService } from "../services";
import { errorMessage } from "../services/api";
import SearchBar from "../components/SearchBar";
import Pagination from "../components/Pagination";
import ConfirmModal from "../components/ConfirmModal";
import MetricCard from "../components/MetricCard";
import PageHeader from "../components/PageHeader";

export default function SupplierList() {
  const { canWrite, isAdmin } = useAuth();
  const toast = useToast();
  const { data, pagination, loading, error, filter, setPage, reload } = useList(supplierService, { sort: "code" });
  const [actionError, setActionError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const handleSearch = useCallback((search) => {
    filter({ search });
  }, [filter]);

  const confirmRemove = async () => {
    if (!deleteTarget) return;
    try {
      await supplierService.remove(deleteTarget._id);
      setActionError("");
      toast.success(`Supplier "${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      reload();
    } catch (e) {
      const msg = errorMessage(e);
      setActionError(msg);
      toast.error(msg);
      setDeleteTarget(null);
    }
  };

  const citiesCount = new Set(data.map((s) => s.city).filter(Boolean)).size;

  return (
    <div>
      <PageHeader title="Suppliers" subtitle="Manage supplier records and review delivery performance." actions={canWrite && <Link className="btn primary" to="/suppliers/new">+ Add supplier</Link>} />

      <div className="cards" style={{ marginBottom: "16px" }}>
        <MetricCard label="Registered Suppliers" value={pagination?.total || data.length} sub="Approved vendor partners" tone="tone-healthy" />
        <MetricCard label="Supply Hubs" value={citiesCount} sub="Geographic locations" tone="tone-healthy" />
      </div>

      <div className="toolbar">
        <SearchBar onSearch={handleSearch} placeholder="Search name, code or city" />
      </div>

      {(error || actionError) && <div className="alert">{error || actionError}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Code</th><th>Name</th><th>Email</th><th>City</th>
              {canWrite && <th></th>}
            </tr>
          </thead>
          <tbody>
            {loading && data.length === 0 ? (
              <tr><td colSpan={5} className="center">Loading...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={5} className="center">No suppliers found</td></tr>
            ) : (
              data.map((s) => (
                <tr key={s._id}>
                  <td>{s.code}</td>
                  <td>{s.name}</td>
                  <td>{s.contactEmail}</td>
                  <td>{s.city}</td>
                  {canWrite && (
                    <td className="actions">
                      <Link className="btn small" to={`/suppliers/${s._id}/edit`}>Edit</Link>
                      {isAdmin && <button className="btn small danger" onClick={() => setDeleteTarget(s)}>Delete</button>}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination pagination={pagination} onPage={setPage} />

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete supplier"
        message={`Are you sure you want to permanently delete supplier "${deleteTarget?.name}" (${deleteTarget?.code})?`}
        confirmLabel="Delete supplier"
        isDanger={true}
        onConfirm={confirmRemove}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
