import { useEffect, useState } from "react";
import useAuth from "../context/useAuth";
import useToast from "../context/useToast";
import api from "../services/api";
import axios from "axios";
import PageHeader from "../components/PageHeader";

export default function Settings() {
  const { user } = useAuth();
  const toast = useToast();
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || "dark");
  const [serverHealth, setServerHealth] = useState("checking...");
  const [mlHealth, setMlHealth] = useState("checking...");

  useEffect(() => {
    api.get("/health")
      .then((r) => setServerHealth(`Operational (DB: ${r.data.database})`))
      .catch(() => setServerHealth("Offline"));

    axios.get(`${import.meta.env.VITE_ML_URL}/health`)
      .then((r) => setMlHealth(`Operational (${r.data.service})`))
      .catch(() => setMlHealth("Offline"));
  }, []);

  const switchTheme = (newTheme) => {
    setTheme(newTheme);
    document.documentElement.dataset.theme = newTheme;
    localStorage.setItem("inventory-theme", newTheme);
    toast.info(`Theme set to ${newTheme} mode`);
  };

  return (
    <div>
      <PageHeader
        title="Settings & Preferences"
        subtitle="Manage your profile, theme appearance, and inspect system service status."
      />

      <div className="grid2">
        <section className="card">
          <h3>User Profile</h3>
          <p className="muted small">Your authenticated user details and active role permissions.</p>
          <dl className="kv" style={{ marginTop: "14px" }}>
            <div>
              <dt>Name</dt>
              <dd><strong>{user?.name || "User"}</strong></dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{user?.email || "user@inventory.com"}</dd>
            </div>
            <div>
              <dt>Assigned Role</dt>
              <dd>
                <span className={`role-badge ${user?.role || "staff"}`}>
                  {user?.role || "staff"}
                </span>
              </dd>
            </div>
          </dl>
        </section>

        <section className="card">
          <h3>Appearance &amp; Theme</h3>
          <p className="muted small">Choose between dark and light themes. Saved in your browser.</p>
          <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
            <button
              type="button"
              className={`btn ${theme === "dark" ? "primary" : ""}`}
              onClick={() => switchTheme("dark")}
            >
              🌙 Dark Mode
            </button>
            <button
              type="button"
              className={`btn ${theme === "light" ? "primary" : ""}`}
              onClick={() => switchTheme("light")}
            >
              ☀️ Light Mode
            </button>
          </div>
        </section>

        <section className="card">
          <h3>Microservices Status</h3>
          <p className="muted small">Live connectivity health across backend gateways and Python ML nodes.</p>
          <dl className="kv" style={{ marginTop: "14px" }}>
            <div>
              <dt>Backend Server (:5000)</dt>
              <dd><code>{serverHealth}</code></dd>
            </div>
            <div>
              <dt>ML Service (:8000)</dt>
              <dd><code>{mlHealth}</code></dd>
            </div>
            <div>
              <dt>Client Environment</dt>
              <dd><code>Vite + React 19</code></dd>
            </div>
          </dl>
        </section>

        <section className="card">
          <h3>Help &amp; Operational Guide</h3>
          <p className="muted small">Quick reference for inventory calculation rules and machine learning baselines.</p>
          <ul style={{ paddingLeft: "18px", marginTop: "12px", lineHeight: 1.8 }} className="small muted">
            <li><strong>Reorder Point (ROP):</strong> Calculated as <code>Lead Time Demand + Safety Stock</code>.</li>
            <li><strong>Stockout Risk:</strong> Supervised ML classifier predicting probability of stock exhaustion within delivery window.</li>
            <li><strong>TreeSHAP:</strong> Feature attribution ranking exact positive and negative drivers of shortage risk.</li>
            <li><strong>Audit Logging:</strong> All create, edit, and delete operations on sales and purchase orders are logged immutably.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
