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
        const res = await insightService.list();
        if (!mounted || !res) return;
        const insights = res.data?.data || [];
        const items = [];
        const stockouts = insights.filter((i) => i.priority === "Critical").length;
        const lowStock = insights.filter((i) => i.riskPct >= 30).length;
        const overdue = insights.filter((i) => i.orderQty > 0 && i.priority === "Critical").length;

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
              backgroundColor: "var(--danger)",
              borderRadius: "50%",
              boxShadow: "0 0 0 2px var(--surface)",
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
            width: "320px",
            background: "var(--surface)",
            border: "1px solid var(--border-strong)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-pop)",
            zIndex: 1000,
            overflow: "hidden",
            animation: "modalPopIn 160ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <div
            style={{
              padding: "10px 14px",
              borderBottom: "1px solid var(--border)",
              fontWeight: 600,
              fontSize: "13px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "var(--surface)",
            }}
          >
            <span>Live System Alerts</span>
            <span style={{ fontSize: "11px", color: "var(--muted)" }}>
              {loading ? "Checking..." : `${notifications.length} active`}
            </span>
          </div>

          <div style={{ maxHeight: "280px", overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "20px 16px", textAlign: "center", fontSize: "13px", color: "var(--muted)" }}>
                All systems normal. No critical supply bottlenecks.
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
                    borderBottom: "1px solid var(--border)",
                    transition: "background 100ms",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--surface-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        backgroundColor: n.type === "danger" ? "var(--danger)" : "var(--warning)",
                        display: "inline-block",
                      }}
                    />
                    <strong style={{ fontSize: "13px" }}>{n.title}</strong>
                  </div>
                  <p style={{ margin: 0, fontSize: "12px", color: "var(--muted)", lineHeight: 1.4 }}>
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

