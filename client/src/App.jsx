import { useEffect, useState } from "react";
import axios from "axios";

function StatusCard({ name, status }) {
  const color = status === "ok" ? "green" : status === "loading" ? "orange" : "red";
  return (
    <div style={{ border: `2px solid ${color}`, padding: 16, borderRadius: 8, minWidth: 180 }}>
      <h3>{name}</h3>
      <p style={{ color }}>{status}</p>
    </div>
  );
}

export default function App() {
  const [server, setServer] = useState("loading");
  const [ml, setMl] = useState("loading");

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/health`)
      .then((r) => setServer(r.data.status))
      .catch(() => setServer("down"));
    axios.get(`${import.meta.env.VITE_ML_URL}/health`)
      .then((r) => setMl(r.data.status))
      .catch(() => setMl("down"));
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h1>AI Inventory Intelligence</h1>
      <div style={{ display: "flex", gap: 16 }}>
        <StatusCard name="Client" status="ok" />
        <StatusCard name="Server (Express)" status={server} />
        <StatusCard name="ML Service (FastAPI)" status={ml} />
      </div>
    </div>
  );
}