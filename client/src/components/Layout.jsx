import { NavLink, Outlet } from "react-router-dom";
import useAuth from "../context/useAuth";

const links = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/alerts", label: "Alerts" },
  { to: "/reorder", label: "Smart Reorder" },
  { to: "/supplier-risk", label: "Supplier Risk" },
  { section: "Data" },
  { to: "/products", label: "Products" },
  { to: "/inventory", label: "Inventory" },
  { to: "/sales", label: "Sales" },
  { to: "/suppliers", label: "Suppliers" },
  { to: "/purchase-orders", label: "Purchase Orders" },
  { to: "/anomalies", label: "Anomalies" },
  { to: "/simulator", label: "What-If Simulator" },
];

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">AI Inventory<br />Intelligence</div>
        <nav>
          {links.map((l) =>
            l.section ? (
              <div key={l.section} className="nav-section">{l.section}</div>
            ) : (
              <NavLink key={l.to} to={l.to} end={l.end}>{l.label}</NavLink>
            )
          )}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <span>{user.name} <span className="badge">{user.role}</span></span>
          <button className="btn" onClick={logout}>Logout</button>
        </header>
        <main className="content"><Outlet /></main>
      </div>
    </div>
  );
}