import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import api, { errorMessage } from "../services/api";
import { insightService } from "../services";
import useAuth from "../context/useAuth";
import useFetch from "../hooks/useFetch";
import HealthChart from "../components/HealthChart";
import AbcXyzMatrix from "../components/AbcXyzMatrix";
import Pill from "../components/Pill";
import { num } from "../utils/format";

const fetchSummary = () => insightService.list();

function Stat({ label, value, sub, to, tone }) {
  const body = (
    <div className={`card stat ${tone || ""}`}>
      <h4>{label}</h4>
      <p className="big">{value}</p>
      {sub && <p className="muted small">{sub}</p>}
    </div>
  );
  return to ? <Link to={to} className="card-link">{body}</Link> : body;
}

export default function Dashboard() {
  const { canWrite } = useAuth();
  const { data, loading, error, reload } = useFetch(fetchSummary);
  const [refreshing, setRefreshing] = useState(false);
  const [msg, setMsg] = useState("");
  const [server, setServer] = useState("loading");
  const [ml, setMl] = useState("loading");

  useEffect(() => {
    api.get("/health").then((r) => setServer(r.data.status)).catch(() => setServer("down"));
    axios.get(`${import.meta.env.VITE_ML_URL}/health`).then((r) => setMl(r.data.status)).catch(() => setMl("down"));
  }, []);

  const items = data?.data ?? [];
  const critical = items.filter((i) => i.priority === "Critical").length;
  const atRisk = items.filter((i) => i.riskPct >= 30).length;
  const reorderNow = items.filter((i) => i.orderQty > 0).length;
  const avgHealth = items.length ? items.reduce((s, i) => s + i.healthScore, 0) / items.length : null;
  const latest = items.reduce((m, i) => (i.computedAt > m ? i.computedAt : m), "");

  const refresh = async () => {
    setRefreshing(true);
    setMsg("");
    try {
      const r = await insightService.refresh();
      const d = r.data.data;
      setMsg(`Refreshed ${d.ok} of ${d.total} products${d.failed.length ? `, ${d.failed.length} failed` : ""}.`);
      reload();
    } catch (e) {
      setMsg(errorMessage(e));
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div>
      <div className="page-head">
        <h2>Dashboard</h2>
        <div className="actions">
          {latest && <span className="muted small">Last computed {new Date(latest).toLocaleString()}</span>}
          {canWrite && (
            <button className="btn primary" onClick={refresh} disabled={refreshing}>
              {refreshing ? "Refreshing (about a minute)..." : "Refresh insights"}
            </button>
          )}
        </div>
      </div>
      {msg && <div className="alert info">{msg}</div>}
      {error && <div className="alert">{error}</div>}

      {!loading && !error && items.length === 0 ? (
        <div className="card empty">
          <h3>No insights yet</h3>
          <p className="muted">
            {canWrite
              ? "Make sure the ML service is running, then click Refresh insights."
              : "Ask an admin or manager to refresh the insights."}
          </p>
        </div>
      ) : (
        <>
          <div className="cards">
            <Stat label="Critical alerts" value={critical} sub="may stock out before delivery" to="/alerts" tone={critical ? "bad" : ""} />
            <Stat label="Products at risk" value={atRisk} sub="stockout risk 30% or more" />
            <Stat label="Average health" value={avgHealth == null ? "-" : num(avgHealth, 1)} sub="out of 100" />
            <Stat label="Reorder now" value={reorderNow} sub="products needing an order" to="/reorder" />
          </div>

          <div className="grid2">
            <div className="card">
              <h3>Health distribution</h3>
              <HealthChart items={items} />
            </div>
            <div className="card">
              <h3>ABC-XYZ matrix</h3>
              <AbcXyzMatrix items={items} />
            </div>
          </div>

          <h3>Most urgent products</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Product</th><th>Priority</th><th>Health</th><th>Stockout risk</th><th>Days of cover</th><th>Order qty</th></tr>
              </thead>
              <tbody>
                {items.slice(0, 8).map((i) => (
                  <tr key={i._id}>
                    <td><Link to={`/product/${i.productCode}`}>{i.productCode} {i.data?.name}</Link></td>
                    <td><Pill value={i.priority} /></td>
                    <td><Pill value={i.healthStatus} /> {num(i.healthScore, 0)}</td>
                    <td>{num(i.riskPct, 0)}%</td>
                    <td>{num(i.daysOfCover, 1)}</td>
                    <td>{i.orderQty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className="muted small status-line">
        Services: server {server} | ML service {ml}
      </p>
    </div>
  );
}