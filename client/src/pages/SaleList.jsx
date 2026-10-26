import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import useAuth from "../context/useAuth";
import useList from "../hooks/useList";
import { saleService, productService } from "../services";
import { errorMessage } from "../services/api";
import Pagination from "../components/Pagination";
import { fmtDate, money } from "../utils/format";
import PageHeader from "../components/PageHeader";
import ProductCell from "../components/ProductCell";
import ProductSelect from "../components/ProductSelect";
import { exportCsv } from "../utils/exportCsv";

const SALE_COLS = [
  { header: "Date", key: "date", format: fmtDate },
  { header: "Product code", key: "product.code" },
  { header: "Product name", key: "product.name" },
  { header: "Units sold", key: "unitsSold" },
  { header: "Unit price (INR)", key: "unitPrice" },
  { header: "Revenue (INR)", key: "revenue" },
  { header: "Promo", key: "promoFlag", format: (v) => v ? "Yes" : "No" },
];

export default function SaleList() {
  const { isAdmin } = useAuth();
  const { data, pagination, loading, error, params, filter, setPage, reload } = useList(saleService, {
    sort: "-date",
  });
  const [products, setProducts] = useState([]);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    productService.list({ limit: 100, sort: "code" }).then((r) => setProducts(r.data.data)).catch(() => {});
  }, []);

  const remove = async (s) => {
    if (!window.confirm(`Delete this sale (${s.product?.name}, ${fmtDate(s.date)})?`)) return;
    try {
      await saleService.remove(s._id);
      setActionError("");
      reload();
    } catch (e) {
      setActionError(errorMessage(e));
    }
  };

  return (
    <div>
      <PageHeader
        title="Sales"
        subtitle="Review recorded demand history and add new sales."
        actions={isAdmin ? <Link className="btn primary" to="/sales/new">+ Record sale</Link> : null}
      />

      <div className="toolbar">
        <ProductSelect products={products} value={params.product || ""} onChange={(product) => filter({ product })} allLabel="All products" />
        <label className="inline">From <input type="date" value={params.from || ""} onChange={(e) => filter({ from: e.target.value })} /></label>
        <label className="inline">To <input type="date" value={params.to || ""} onChange={(e) => filter({ to: e.target.value })} /></label>
        <select value={params.promoFlag || ""} onChange={(e) => filter({ promoFlag: e.target.value })}>
          <option value="">Promo: any</option>
          <option value="true">Promo days only</option>
          <option value="false">Non-promo days</option>
        </select>
        <button className="btn" onClick={() => exportCsv("sales", SALE_COLS, data)} disabled={!data.length}>Export CSV</button>
      </div>

      {(error || actionError) && <div className="alert">{error || actionError}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th><th>Product</th><th>Units sold</th><th>Unit price</th><th>Revenue</th><th>Promo</th>
              {isAdmin && <th></th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={isAdmin ? 7 : 6} className="center">Loading...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={isAdmin ? 7 : 6} className="center">No sales found</td></tr>
            ) : (
              data.map((s) => (
                <tr key={s._id}>
                  <td>{fmtDate(s.date)}</td>
                  <td><ProductCell product={s.product || {}} imageList={data.map((row) => row.product).filter(Boolean)} /></td>
                  <td>{s.unitsSold}</td>
                  <td>{money(s.unitPrice)}</td>
                  <td>{money(s.revenue)}</td>
                  <td>{s.promoFlag ? "Yes" : "-"}</td>
                  {isAdmin && (
                    <td className="actions">
                      <Link className="btn small" to={`/sales/${s._id}/edit`}>Edit</Link>
                      <button className="btn small danger" onClick={() => remove(s)}>Delete</button>
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
