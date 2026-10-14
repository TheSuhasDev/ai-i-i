import { insightService, supplierService } from "../services";
import useFetch from "../hooks/useFetch";
import Pill from "../components/Pill";
import { humanize, num } from "../utils/format";

const fetchRisk = () => insightService.supplierRisk();
const fetchSuppliers = () => supplierService.list({ limit: 100, sort: "code" });
const PREFERRED = ["reliability_score", "risk_level", "avg_delay_days", "delay_std_days"];

function cell(key, v) {
  if (key === "risk_level") return <Pill value={v} />;
  if (typeof v === "number") return num(v, 2);
  return v ?? "-";
}

export default function SupplierRisk() {
  const risk = useFetch(fetchRisk);
  const sup = useFetch(fetchSuppliers);

  const rows = risk.data?.data ?? [];
  const names = Object.fromEntries((sup.data?.data ?? []).map((s) => [s.code, s.name]));
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))].filter((k) => k !== "supplier_id");
  const cols = [...PREFERRED.filter((k) => keys.includes(k)), ...keys.filter((k) => !PREFERRED.includes(k))];

  return (
    <div>
      <div className="page-head"><h2>Supplier Risk</h2></div>
      <p className="muted">Reliability and risk from delivery history. Least reliable suppliers first.</p>
      {risk.error && <div className="alert">{risk.error}</div>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Supplier</th>{cols.map((c) => <th key={c}>{humanize(c)}</th>)}</tr>
          </thead>
          <tbody>
            {risk.loading ? (
              <tr><td colSpan={cols.length + 1} className="center">Loading...</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.supplier_id}>
                  <td>{r.supplier_id} {names[r.supplier_id]}</td>
                  {cols.map((c) => <td key={c}>{cell(c, r[c])}</td>)}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}