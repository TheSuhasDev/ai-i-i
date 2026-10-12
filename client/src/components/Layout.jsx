import { NavLink, Outlet } from "react-router-dom";
import useAuth from "../context/useAuth";

const links = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/products", label: "Products" },
  { to: "/inventory", label: "Inventory" },
  { to: "/sales", label: "Sales" },
  { to: "/suppliers", label: "Suppliers" },
  { to: "/purchase-orders", label: "Purchase Orders" },
];

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          AI Inventory
          <br />
          Intelligence
        </div>
        <nav>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}>
              {l.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <span>
            {user.name} <span className="badge">{user.role}</span>
          </span>
          <button className="btn" onClick={logout}>
            Logout
          </button>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}