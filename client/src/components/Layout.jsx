import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import useAuth from "../context/useAuth";
import AssistantChatProvider from "../context/AssistantChatProvider";
import AssistantWidget from "./AssistantWidget";
import { ProductImageProvider } from "../context/ProductImageViewer";

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
];

export default function Layout() {
  const { user, logout } = useAuth();
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
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("inventory-theme");
    return saved || (window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark");
  });

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
      if (event.key === "Escape") {
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
  }, [desktopOpen, isOverlayMode, sidebarOpen, closeDesktop, cancelClose]);

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
          {links.map((l) =>
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
          <span className="topbar-user"><span className="topbar-user-name">{user.name}</span><span className="badge">{user.role}</span></span>
          <button type="button" className="theme-toggle" onClick={() => setTheme((value) => value === "dark" ? "light" : "dark")} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>
            {theme === "dark" ? "☼" : "◐"}
          </button>
          <button className="btn" onClick={logout}>Logout</button>
        </header>
        <AssistantChatProvider>
          <ProductImageProvider>
            <main className="content"><Outlet /></main>
            <AssistantWidget />
          </ProductImageProvider>
        </AssistantChatProvider>
      </div>
    </div>
  );
}
