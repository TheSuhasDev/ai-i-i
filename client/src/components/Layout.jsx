import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import useAuth from "../context/useAuth";
import AssistantChatProvider from "../context/AssistantChatProvider";
import AssistantWidget from "./AssistantWidget";
import { ProductImageProvider } from "../context/ProductImageViewer";
import CommandPalette from "./CommandPalette";
import NotificationBell from "./NotificationBell";

const links = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/alerts", label: "Alerts" },
  { to: "/reorder", label: "Smart Reorder" },
  { to: "/trend", label: "Trend & Seasonality" },
  { to: "/supplier-risk", label: "Supplier Risk" },
  { section: "Data" },
  { to: "/products", label: "Products" },
  { to: "/inventory", label: "Inventory" },
  { to: "/sales", label: "Sales" },
  { to: "/suppliers", label: "Suppliers" },
  { to: "/purchase-orders", label: "Purchase Orders" },
  { to: "/anomalies", label: "Anomalies" },
  { to: "/simulator", label: "What-If Simulator" },
  { to: "/performance", label: "ML Performance" },
  { to: "/assistant", label: "AI Assistant" },
  { section: "Management" },
  { to: "/audit-logs", label: "Audit Logs", adminOnly: true },
  { to: "/settings", label: "Settings & Profile" },
];

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [desktopPinned, setDesktopPinned] = useState(false);
  const [desktopFocus, setDesktopFocus] = useState(false);
  const [isOverlayMode, setIsOverlayMode] = useState(() => window.matchMedia("(max-width: 700px)").matches);
  const [finePointer, setFinePointer] = useState(() => window.matchMedia("(hover: hover) and (pointer: fine)").matches);
  const closeTimer = useRef(null);
  const sidebarRef = useRef(null);
  const toggleRef = useRef(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("inventory-theme");
    return saved || (window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark");
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const path = location.pathname;
    let title = "Dashboard";
    if (path === "/alerts") title = "Alerts";
    else if (path === "/reorder") title = "Smart Reorder";
    else if (path === "/trend") title = "Trend & Seasonality";
    else if (path === "/supplier-risk") title = "Supplier Risk";
    else if (path === "/products") title = "Products";
    else if (path === "/products/new") title = "New Product";
    else if (path.startsWith("/products/")) title = "Product Intelligence";
    else if (path === "/inventory") title = "Inventory";
    else if (path === "/inventory/new") title = "Adjust Inventory";
    else if (path === "/sales") title = "Sales";
    else if (path === "/sales/new") title = "Record Sale";
    else if (path === "/suppliers") title = "Suppliers";
    else if (path === "/suppliers/new") title = "New Supplier";
    else if (path.includes("/deliveries")) title = "Supplier Deliveries";
    else if (path === "/purchase-orders") title = "Purchase Orders";
    else if (path === "/purchase-orders/new") title = "New Purchase Order";
    else if (path === "/anomalies") title = "Anomalies";
    else if (path === "/simulator") title = "What-If Simulator";
    else if (path === "/performance") title = "ML Performance";
    else if (path === "/assistant") title = "AI Assistant";
    else if (path === "/audit-logs") title = "Audit Logs";
    else if (path === "/settings") title = "Settings & Profile";
    document.title = `${title} | AI Inventory Intelligence`;
  }, [location.pathname]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("inventory-theme", theme);
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 700px)");
    const pointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const syncOverlayMode = () => {
      setIsOverlayMode(media.matches);
      setSidebarOpen(false);
      setDesktopOpen(false);
      setDesktopPinned(false);
      setDesktopFocus(false);
    };
    const syncPointer = () => setFinePointer(pointer.matches);
    media.addEventListener("change", syncOverlayMode);
    pointer.addEventListener("change", syncPointer);
    return () => {
      media.removeEventListener("change", syncOverlayMode);
      pointer.removeEventListener("change", syncPointer);
    };
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);
  const closeDesktop = useCallback(() => {
    cancelClose();
    setDesktopOpen(false);
    setDesktopPinned(false);
    setDesktopFocus(false);
  }, [cancelClose]);
  const scheduleDesktopClose = (leavingKeyboardFocus = false) => {
    cancelClose();
    if (desktopPinned || (desktopFocus && !leavingKeyboardFocus)) return;
    closeTimer.current = window.setTimeout(() => {
      if (!sidebarRef.current?.matches(":hover")) {
        setDesktopOpen(false);
        setDesktopFocus(false);
      }
      closeTimer.current = null;
    }, 250);
  };
  const revealOnHover = () => {
    if (isOverlayMode || !finePointer) return;
    cancelClose();
    setDesktopOpen(true);
  };
  const focusNav = () => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => sidebarRef.current?.querySelector("nav a")?.focus({ preventScroll: true })));
  };
  const toggleSidebar = () => {
    if (isOverlayMode) {
      const opening = !sidebarOpen;
      setSidebarOpen(opening);
      if (opening) focusNav();
      return;
    }
    if (desktopOpen) {
      closeDesktop();
      window.setTimeout(() => toggleRef.current?.focus(), 0);
    } else {
      cancelClose();
      setDesktopOpen(true);
      setDesktopPinned(true);
      focusNav();
    }
  };
  const closeSidebar = () => {
    if (isOverlayMode) setSidebarOpen(false);
    else closeDesktop();
  };
  const openForNavFocus = () => {
    if (isOverlayMode) return;
    cancelClose();
    setDesktopOpen(true);
    setDesktopFocus(true);
  };
  const leaveNavFocus = (event) => {
    if (isOverlayMode || event.currentTarget.contains(event.relatedTarget)) return;
    setDesktopFocus(false);
    if (!sidebarRef.current?.matches(":hover")) scheduleDesktopClose(true);
  };

  useEffect(() => {
    // Route transitions close either drawer; nav clicks also close immediately.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isOverlayMode) setSidebarOpen(false);
    else closeDesktop();
  }, [location.pathname, isOverlayMode, closeDesktop]);

  useEffect(() => {
    document.querySelector("#primary-navigation nav a.active")?.scrollIntoView({ block: "nearest" });
  }, [location.pathname]);

  useEffect(() => {
    if (!isOverlayMode || !sidebarOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isOverlayMode, sidebarOpen]);

  useEffect(() => {
    const handleKeys = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((prev) => !prev);
        return;
      }
      if (event.key === "Escape") {
        if (commandOpen) {
          setCommandOpen(false);
          return;
        }
        if (isOverlayMode && sidebarOpen) {
          setSidebarOpen(false);
          window.setTimeout(() => toggleRef.current?.focus(), 0);
        } else if (!isOverlayMode && desktopOpen) {
          closeDesktop();
          window.setTimeout(() => toggleRef.current?.focus(), 0);
        }
        return;
      }
      const target = event.target;
      const editing = target instanceof HTMLElement && target.closest("input, textarea, select, [contenteditable='true']");
      if (isOverlayMode || !event.ctrlKey || event.altKey || event.metaKey || event.key.toLowerCase() !== "b" || editing) return;
      event.preventDefault();
      if (desktopOpen) {
        closeDesktop();
        window.setTimeout(() => toggleRef.current?.focus(), 0);
      } else {
        cancelClose();
        setDesktopOpen(true);
        setDesktopPinned(true);
        focusNav();
      }
    };
    window.addEventListener("keydown", handleKeys);
    return () => window.removeEventListener("keydown", handleKeys);
  }, [desktopOpen, isOverlayMode, sidebarOpen, closeDesktop, cancelClose, commandOpen]);

  useEffect(() => {
    if (isOverlayMode || !desktopOpen || !desktopPinned) return undefined;
    const closeOnOutsideClick = (event) => {
      if (event.target.closest?.("#primary-navigation, .mobile-menu-button, .sidebar-hover-zone")) return;
      closeDesktop();
    };
    window.addEventListener("pointerdown", closeOnOutsideClick);
    return () => window.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [desktopOpen, desktopPinned, isOverlayMode, closeDesktop]);

  useEffect(() => () => cancelClose(), [cancelClose]);

  const sidebarExpanded = isOverlayMode ? sidebarOpen : desktopOpen;
  const sidebarToggleTitle = sidebarExpanded ? "Close sidebar" : "Open sidebar";

  return (
    <div className="app">
      {isOverlayMode && sidebarOpen && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={closeSidebar} />}
      {!isOverlayMode && <div className="sidebar-hover-zone" aria-hidden="true" onMouseEnter={revealOnHover} onMouseLeave={scheduleDesktopClose} />}
      <aside
        id="primary-navigation"
        ref={sidebarRef}
        aria-hidden={!sidebarExpanded}
        inert={!sidebarExpanded}
        className={`sidebar ${isOverlayMode && sidebarOpen ? "mobile-open" : ""} ${!isOverlayMode && desktopOpen ? "desktop-open" : ""}`}
        onMouseEnter={revealOnHover}
        onMouseLeave={scheduleDesktopClose}
        onFocusCapture={openForNavFocus}
        onBlurCapture={leaveNavFocus}
      >
        <div className="brand">AI Inventory<br />Intelligence</div>
        <nav>
          {links
            .filter((l) => !l.adminOnly || isAdmin)
            .map((l) =>
              l.section ? (
                <div key={l.section} className="nav-section">{l.section}</div>
              ) : (
                <NavLink key={l.to} to={l.to} end={l.end} onClick={closeSidebar}>{l.label}</NavLink>
              )
            )}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              type="button"
              className="mobile-menu-button"
              ref={toggleRef}
              aria-label={sidebarToggleTitle}
              aria-expanded={sidebarExpanded}
              aria-controls="primary-navigation"
              onClick={toggleSidebar}
              title={sidebarToggleTitle}
            >
              {sidebarExpanded ? "✕" : "☰"}
            </button>
            <nav className="breadcrumbs" aria-label="Breadcrumb">
              <NavLink to="/">Home</NavLink>
              {location.pathname !== "/" && (
                <>
                  <span className="breadcrumb-separator">/</span>
                  <span className="breadcrumb-current">
                    {location.pathname.slice(1).split("/")[0].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                </>
              )}
            </nav>
          </div>
          <div className="topbar-right">
            <button
              type="button"
              className="quick-search-btn"
              onClick={() => setCommandOpen(true)}
              title="Quick Jump / Search (Ctrl+K)"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "var(--bg-muted, rgba(255,255,255,0.06))",
                border: "1px solid var(--border, rgba(255,255,255,0.12))",
                color: "var(--text-muted, #94a3b8)",
                padding: "4px 8px",
                borderRadius: "6px",
                fontSize: "12px",
                cursor: "pointer",
                marginRight: "4px",
              }}
            >
              <span>🔍 Quick Jump</span>
              <kbd style={{ fontSize: "10px", padding: "1px 4px", borderRadius: "3px", background: "rgba(0,0,0,0.2)" }}>Ctrl K</kbd>
            </button>
            <NotificationBell />
            <span className="topbar-user">
              <NavLink to="/settings" style={{ color: "inherit", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "8px" }} title="User Settings">
                <span className="topbar-user-name">{user?.name}</span>
                <span className={`role-badge ${user?.role || "staff"}`}>{user?.role}</span>
              </NavLink>
            </span>
            <button
              type="button"
              className="theme-toggle"
              onClick={() => setTheme((value) => (value === "dark" ? "light" : "dark"))}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            >
              {theme === "dark" ? "☼" : "◐"}
            </button>
            <button type="button" className="btn small" onClick={logout}>Logout</button>
          </div>
        </header>
        {!isOnline && (
          <div style={{ backgroundColor: "var(--danger, #ef4444)", color: "#fff", padding: "6px 16px", fontSize: "13px", textAlign: "center", display: "flex", justifyContent: "center", alignItems: "center", gap: "10px" }}>
            <span>⚠️ Network connection lost. Operating in offline mode.</span>
            <button className="btn small" style={{ background: "#fff", color: "#111", padding: "2px 8px" }} onClick={() => window.location.reload()}>Retry</button>
          </div>
        )}
        <AssistantChatProvider>
          <ProductImageProvider>
            <main className="content"><Outlet /></main>
            <AssistantWidget />
          </ProductImageProvider>
        </AssistantChatProvider>
      </div>
      <CommandPalette isOpen={commandOpen} onClose={() => setCommandOpen(false)} />
    </div>
  );
}
