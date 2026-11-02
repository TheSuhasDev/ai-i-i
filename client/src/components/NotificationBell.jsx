import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { insightService } from "../services";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const bellRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    const fetchAlerts = async () => {
      try {
        setLoading(true);
        const res = await insightService.dashboard();
        if (!mounted || !res) return;
        const items = [];
        const stockouts = res.stockouts || res.summary?.stockouts || 0;
        const lowStock = res.low_stock || res.summary?.low_stock || 0;
        const overdue = res.overdue_pos || res.summary?.overdue_pos || 0;

        if (stockouts > 0) {
          items.push({
            id: "stockout",
            type: "danger",
            title: `${stockouts} Critical Stockout${stockouts > 1 ? "s" : ""}`,
            desc: "Items require immediate emergency replenishment.",
            link: "/alerts",
          });
        }
        if (lowStock > 0) {
          items.push({
            id: "low-stock",
            type: "warning",
            title: `${lowStock} Low Stock Alert${lowStock > 1 ? "s" : ""}`,
            desc: "Inventory levels approaching safety threshold.",
            link: "/reorder",
          });
        }
        if (overdue > 0) {
          items.push({
            id: "overdue",
            type: "warning",
            title: `${overdue} Overdue Purchase Order${overdue > 1 ? "s" : ""}`,
            desc: "Supplier deliveries delayed past expected date.",
            link: "/supplier-risk",
          });
        }
        setNotifications(items);
      } catch {
        // Keep resilient if backend is warming up
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 120000); // Poll every 2m
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("pointerdown", handleOutsideClick);
    }
    return () => document.removeEventListener("pointerdown", handleOutsideClick);
  }, [open]);

  return (
    <div ref={bellRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="System notifications"
        title="System notifications"
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontSize: "18px",
          padding: "6px 8px",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          color: "inherit",
        }}
      >
        <span>🔔</span>
        {notifications.length > 0 && (
          <span
            style={{
              position: "absolute",
              top: "2px",
              right: "4px",
              width: "8px",
              height: "8px",
              backgroundColor: "var(--danger, #ef4444)",
              borderRadius: "50%",
              boxShadow: "0 0 0 2px var(--card-bg, #1e293b)",
            }}
          />
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            width: "300px",
            background: "var(--card-bg, #1e293b)",
            border: "1px solid var(--border, rgba(255, 255, 255, 0.1))",
            borderRadius: "12px",
            boxShadow: "0 12px 28px -6px rgba(0,0,0,0.35)",
            zIndex: 1000,
            overflow: "hidden",
            animation: "fadeIn 120ms ease-out",
          }}
        >
          <div
            style={{
              padding: "10px 14px",
              borderBottom: "1px solid var(--border, rgba(255, 255, 255, 0.08))",
              fontWeight: 600,
              fontSize: "13px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>Live System Alerts</span>
            <span style={{ fontSize: "11px", color: "var(--text-muted, #94a3b8)" }}>
              {loading ? "Checking..." : `${notifications.length} active`}
            </span>
          </div>

          <div style={{ maxHeight: "260px", overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "18px", textAlign: "center", fontSize: "13px", color: "var(--text-muted, #94a3b8)" }}>
                ✅ All systems normal. No critical supply bottlenecks.
              </div>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n.id}
                  to={n.link}
                  onClick={() => setOpen(false)}
                  style={{
                    display: "block",
                    padding: "10px 14px",
                    textDecoration: "none",
                    color: "inherit",
                    borderBottom: "1px solid var(--border, rgba(255, 255, 255, 0.05))",
                    transition: "background 100ms",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--hover-bg, rgba(255,255,255,0.05))")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        backgroundColor: n.type === "danger" ? "var(--danger, #ef4444)" : "var(--warning, #f59e0b)",
                        display: "inline-block",
                      }}
                    />
                    <strong style={{ fontSize: "13px" }}>{n.title}</strong>
                  </div>
                  <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted, #94a3b8)", lineHeight: 1.4 }}>
                    {n.desc}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
