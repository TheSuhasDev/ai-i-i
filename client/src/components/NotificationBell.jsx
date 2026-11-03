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
            badge: "Critical",
            title: `${stockouts} Critical Stockout${stockouts > 1 ? "s" : ""}`,
            desc: "Items require immediate emergency replenishment.",
            link: "/alerts",
          });
        }
        if (lowStock > 0) {
          items.push({
            id: "low-stock",
            type: "warning",
            badge: "Warning",
            title: `${lowStock} Low Stock Alert${lowStock > 1 ? "s" : ""}`,
            desc: "Inventory levels approaching safety threshold.",
            link: "/reorder",
          });
        }
        if (overdue > 0) {
          items.push({
            id: "overdue",
            type: "warning",
            badge: "Attention",
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
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("pointerdown", handleOutsideClick);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const totalAlerts = notifications.length;

  return (
    <div ref={bellRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        className={`notification-bell-btn ${open ? "active" : ""}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-label={`System notifications (${totalAlerts} active)`}
        aria-expanded={open}
        title="System notifications"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>

        {totalAlerts > 0 && (
          <span className="notification-bell-badge" aria-hidden="true">
            {totalAlerts}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-dropdown" role="region" aria-label="Notifications panel">
          <div className="notification-dropdown-header">
            <div className="notification-dropdown-title">
              <span className="notification-live-dot" aria-hidden="true" />
              <span>Live System Alerts</span>
            </div>
            <span className="badge" style={{ fontSize: "11px" }}>
              {loading ? "Checking..." : `${totalAlerts} active`}
            </span>
          </div>

          <div className="notification-dropdown-list">
            {notifications.length === 0 ? (
              <div className="notification-empty-state">
                <div className="notification-empty-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--text)", marginBottom: "4px" }}>
                  All systems normal
                </div>
                <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                  No critical supply bottlenecks detected.
                </div>
              </div>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n.id}
                  to={n.link}
                  className="notification-item-card"
                  onClick={() => setOpen(false)}
                >
                  <div className={`notification-item-icon ${n.type}`}>
                    {n.type === "danger" ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    )}
                  </div>

                  <div className="notification-item-body">
                    <div className="notification-item-header">
                      <span className="notification-item-title">{n.title}</span>
                      <span className={`pill ${n.type === "danger" ? "status-critical" : "status-warning"}`} style={{ fontSize: "10px", padding: "1px 6px" }}>
                        {n.badge}
                      </span>
                    </div>
                    <p className="notification-item-desc">{n.desc}</p>
                  </div>

                  <span className="notification-item-arrow" aria-hidden="true">&rarr;</span>
                </Link>
              ))
            )}
          </div>

          <div className="notification-dropdown-footer">
            <span style={{ color: "var(--subtle)" }}>Real-time telemetry</span>
            <Link
              to="/alerts"
              className="notification-view-all"
              onClick={() => setOpen(false)}
            >
              <span>View all alerts</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
