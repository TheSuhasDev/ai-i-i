import { useState } from "react";
import { Link } from "react-router-dom";
import useAuth from "../context/useAuth";
import useList from "../hooks/useList";
import { productService } from "../services";
import { errorMessage } from "../services/api";
import SearchBar from "../components/SearchBar";
import Pagination from "../components/Pagination";
import { CATEGORIES, money } from "../utils/format";

export default function ProductList() {
  const { canWrite, isAdmin } = useAuth();
  const { data, pagination, loading, error, params, filter, setPage, reload } = useList(productService, {
    sort: "code",
  });
  const [actionError, setActionError] = useState("");

  const remove = async (p) => {
    if (!window.confirm(`Delete product "${p.name}"?`)) return;
    try {
      await productService.remove(p._id);
      setActionError("");
      reload();
    } catch (e) {
      setActionError(errorMessage(e));
    }
  };

  return (
    <div>
      <div className="page-head">
        <h2>Products</h2>
        {canWrite && (
          <Link className="btn primary" to="/products/new">
            + Add product
          </Link>
        )}
      </div>

      <div className="toolbar">
        <SearchBar onSearch={(search) => filter({ search })} placeholder="Search name, SKU or code" />
        <select value={params.category || ""} onChange={(e) => filter({ category: e.target.value })}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      {(error || actionError) && <div className="alert">{error || actionError}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>SKU</th>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Cost</th>
              <th>Lead time</th>
              <th>Suppliers</th>
              {canWrite && <th></th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="center">Loading...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={9} className="center">No products found</td></tr>
            ) : (
              data.map((p) => (
                <tr key={p._id}>
                  <td>{p.code}</td>
                  <td>{p.sku}</td>
                  <td>{p.name}</td>
                  <td>{p.category}</td>
                  <td>{money(p.price)}</td>
                  <td>{money(p.cost)}</td>
                  <td>{p.leadTimeDays} d</td>
                  <td>{p.suppliers?.map((s) => s.name).join(", ")}</td>
                  {canWrite && (
                    <td className="actions">
                      <Link className="btn small" to={`/products/${p._id}/edit`}>Edit</Link>
                      {isAdmin && <button className="btn small danger" onClick={() => remove(p)}>Delete</button>}
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