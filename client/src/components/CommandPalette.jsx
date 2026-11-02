import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../context/useAuth";

const PAGES = [
  { label: "Dashboard", path: "/", category: "Overview", icon: "📊" },
  { label: "Active Alerts", path: "/alerts", category: "Intelligence", icon: "⚠️" },
  { label: "Smart Reorder", path: "/reorder", category: "Intelligence", icon: "🔄" },
  { label: "Trend & Seasonality", path: "/trend", category: "Intelligence", icon: "📈" },
  { label: "Supplier Risk", path: "/supplier-risk", category: "Intelligence", icon: "🛡️" },
  { label: "Products Catalog", path: "/products", category: "Data", icon: "📦" },
  { label: "Inventory Stock", path: "/inventory", category: "Data", icon: "📋" },
  { label: "Sales Orders", path: "/sales", category: "Data", icon: "💵" },
  { label: "Suppliers Directory", path: "/suppliers", category: "Data", icon: "🚚" },
  { label: "Purchase Orders", path: "/purchase-orders", category: "Data", icon: "📑" },
  { label: "Anomaly Detection", path: "/anomalies", category: "Analytics", icon: "🔍" },
  { label: "What-If Simulator", path: "/simulator", category: "Analytics", icon: "🎛️" },
  { label: "ML Performance", path: "/performance", category: "Analytics", icon: "⚡" },
  { label: "AI Assistant", path: "/assistant", category: "AI Tools", icon: "🤖" },
  { label: "Audit Logs", path: "/audit-logs", category: "Management", icon: "📜", adminOnly: true },
  { label: "Settings & Profile", path: "/settings", category: "Management", icon: "⚙️" },
];

export default function CommandPalette({ isOpen, onClose }) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const availablePages = PAGES.filter((p) => !p.adminOnly || isAdmin);
  const filtered = availablePages.filter((p) =>
    p.label.toLowerCase().includes(query.toLowerCase()) ||
    p.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const selectItem = (path) => {
    navigate(path);
    onClose();
  };

  const handleQueryChange = (e) => {
    setQuery(e.target.value);
    setSelectedIndex(0);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((idx) => (idx + 1) % Math.max(1, filtered.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((idx) => (idx - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      selectItem(filtered[selectedIndex].path);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Quick Command Palette"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "14vh",
        zIndex: 9999,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        style={{
          width: "90%",
          maxWidth: "560px",
          background: "var(--card-bg, #1e293b)",
          color: "var(--text, #f8fafc)",
          borderRadius: "14px",
          boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.45), 0 0 0 1px var(--border, rgba(255, 255, 255, 0.1))",
          overflow: "hidden",
          animation: "fadeIn 150ms ease-out",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid var(--border, rgba(255, 255, 255, 0.1))", padding: "12px 16px", gap: "10px" }}>
          <span style={{ fontSize: "16px", opacity: 0.6 }}>🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder="Type a page or command to navigate..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "inherit",
              fontSize: "15px",
            }}
          />
          <kbd
            style={{
              fontSize: "11px",
              padding: "2px 6px",
              borderRadius: "4px",
              background: "var(--bg-muted, rgba(255, 255, 255, 0.08))",
              color: "var(--text-muted, #94a3b8)",
              border: "1px solid var(--border, rgba(255, 255, 255, 0.1))",
            }}
          >
            ESC
          </kbd>
        </div>

        <div style={{ maxHeight: "320px", overflowY: "auto", padding: "6px" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted, #94a3b8)", fontSize: "14px" }}>
              No matches found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map((item, idx) => (
              <div
                key={item.path}
                onClick={() => selectItem(item.path)}
                onMouseEnter={() => setSelectedIndex(idx)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  background: selectedIndex === idx ? "var(--hover-bg, rgba(59, 130, 246, 0.15))" : "transparent",
                  color: selectedIndex === idx ? "var(--brand, #3b82f6)" : "inherit",
                  transition: "background 100ms ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "16px" }}>{item.icon}</span>
                  <span style={{ fontWeight: selectedIndex === idx ? 600 : 400, fontSize: "14px" }}>
                    {item.label}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "11px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: "var(--text-muted, #94a3b8)",
                    opacity: 0.75,
                  }}
                >
                  {item.category}
                </span>
              </div>
            ))
          )}
        </div>

        <div
          style={{
            padding: "8px 16px",
            borderTop: "1px solid var(--border, rgba(255, 255, 255, 0.08))",
            fontSize: "11px",
            color: "var(--text-muted, #94a3b8)",
            display: "flex",
            justifyContent: "space-between",
            background: "var(--bg-muted, rgba(0,0,0,0.15))",
          }}
        >
          <span>Use <strong>↑</strong> <strong>↓</strong> to navigate, <strong>Enter</strong> to select</span>
          <span>Quick Jump (<strong>Ctrl+K</strong>)</span>
        </div>
      </div>
    </div>
  );
}
