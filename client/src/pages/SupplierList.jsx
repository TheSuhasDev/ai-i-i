import { useState } from "react";
import { Link } from "react-router-dom";
import useAuth from "../context/useAuth";
import useList from "../hooks/useList";
import { supplierService } from "../services";
import { errorMessage } from "../services/api";
import SearchBar from "../components/SearchBar";
import Pagination from "../components/Pagination";

export default function SupplierList() {
  const { canWrite, isAdmin } = useAuth();
  const { data, pagination, loading, error, filter, setPage, reload } = useList(supplierService, { sort: "code" });
  const [actionError, setActionError] = useState("");

  const remove = async (s) => {
    if (!window.confirm(`Delete supplier "${s.name}"?`)) return;
    try {
      await supplierService.remove(s._id);
      setActionError("");
      reload();
    } catch (e) {
      setActionError(errorMessage(e));
    }
  };

  return (
    <div>
      <div className="page-head">
        <h2>Suppliers</h2>
        {canWrite && <Link className="btn primary" to="/suppliers/new">+ Add supplier</Link>}
      </div>

      <div className="toolbar">
        <SearchBar onSearch={(search) => filter({ search })} placeholder="Search name, code or city" />
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
            {loading ? (
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
                      {isAdmin && <button className="btn small danger" onClick={() => remove(s)}>Delete</button>}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination pagination={pagination} onPage={setPage} />
    </div>
  );
}