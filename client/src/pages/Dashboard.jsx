import { useEffect, useState } from "react";
import axios from "axios";
import api from "../services/api";
import { productService, supplierService, purchaseOrderService } from "../services";

function StatusCard({ name, status }) {
  const color = status === "ok" ? "green" : status === "loading" ? "orange" : "red";
  return (
    <div className="card" style={{ borderLeft: `5px solid ${color}`, minWidth: 190 }}>
      <h4>{name}</h4>
      <p style={{ color, margin: 0 }}>{status}</p>
    </div>
  );
}

export default function Dashboard() {
  const [server, setServer] = useState("loading");
  const [ml, setMl] = useState("loading");
  const [counts, setCounts] = useState({});

  useEffect(() => {
    api.get("/health").then((r) => setServer(r.data.status)).catch(() => setServer("down"));
    axios.get(`${import.meta.env.VITE_ML_URL}/health`).then((r) => setMl(r.data.status)).catch(() => setMl("down"));

    Promise.all([
      productService.list({ limit: 1 }),
      supplierService.list({ limit: 1 }),
      purchaseOrderService.list({ limit: 1 }),
    ])
      .then(([p, s, o]) =>
        setCounts({ products: p.data.pagination.total, suppliers: s.data.pagination.total, orders: o.data.pagination.total })
      )
      .catch(() => {});
  }, []);

  return (
    <div>
      <h2>Dashboard</h2>
      <p className="muted">The analytics dashboard arrives on Day 10. For now: service status and record counts.</p>

      <h3>Services</h3>
      <div className="cards">
        <StatusCard name="Client" status="ok" />
        <StatusCard name="Server (Express)" status={server} />
        <StatusCard name="ML Service (FastAPI)" status={ml} />
      </div>

      <h3>Records</h3>
      <div className="cards">
        <div className="card"><h4>Products</h4><p className="big">{counts.products ?? "-"}</p></div>
        <div className="card"><h4>Suppliers</h4><p className="big">{counts.suppliers ?? "-"}</p></div>
        <div className="card"><h4>Purchase orders</h4><p className="big">{counts.orders ?? "-"}</p></div>
      </div>
    </div>
  );
}