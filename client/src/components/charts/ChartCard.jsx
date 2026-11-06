import InfoTooltip from "./InfoTooltip";
import ChartSkeleton from "./ChartSkeleton";

export default function ChartCard({
  title,
  subtitle,
  jargon,
  takeaway,
  takeawayTone = "info",
  badge,
  actions,
  loading = false,
  error = "",
  empty = false,
  emptyMessage = "No data available for the selected period.",
  ariaLabel,
  children,
  className = "",
  style = {},
  height = 260,
}) {
  const toneClasses = {
    healthy: "takeaway-healthy",
    warning: "takeaway-warning",
    critical: "takeaway-critical",
    info: "takeaway-info",
  };

  const toneBorder = {
    healthy: "var(--success, #10b981)",
    warning: "var(--warning, #f59e0b)",
    critical: "var(--danger, #ef4444)",
    info: "var(--accent, #818cf8)",
  };

  return (
    <section
      className={`card chart-card ${className}`}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        padding: "18px 20px",
        ...style,
      }}
      aria-label={ariaLabel || (typeof title === "string" ? title : "Data chart")}
    >
      <div
        className="chart-card-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: "220px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 600, color: "var(--text)" }}>{title}</h3>
            {jargon && (
              Array.isArray(jargon)
                ? jargon.map((j) => <InfoTooltip key={j} term={j} />)
                : <InfoTooltip term={jargon} />
            )}
            {badge && <div>{badge}</div>}
          </div>
          {subtitle && (
            <p className="muted small" style={{ margin: "4px 0 0 0", fontSize: "0.82rem", lineHeight: 1.4 }}>
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="chart-card-actions" style={{ display: "flex", alignItems: "center", gap: "8px" }}>{actions}</div>}
      </div>

      <div className="chart-card-body" style={{ width: "100%", position: "relative" }}>
        {loading ? (
          <ChartSkeleton height={height} />
        ) : error ? (
          <div className="alert" style={{ margin: "16px 0" }}>{error}</div>
        ) : empty ? (
          <div
            style={{
              height,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--muted)",
              background: "var(--surface-raised, #171c27)",
              borderRadius: "10px",
              padding: "20px",
              textAlign: "center",
              fontSize: "0.9rem",
            }}
          >
            {emptyMessage}
          </div>
        ) : (
          children
        )}
      </div>

      {takeaway && !loading && !error && !empty && (
        <div
          className={`chart-takeaway ${toneClasses[takeawayTone] || "takeaway-info"}`}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "8px",
            padding: "8px 12px",
            borderRadius: "8px",
            background: "var(--surface-raised, #171c27)",
            borderLeft: `3px solid ${toneBorder[takeawayTone] || "var(--accent)"}`,
            fontSize: "0.85rem",
            lineHeight: 1.45,
            color: "var(--text)",
          }}
        >
          <span style={{ fontWeight: 600, color: toneBorder[takeawayTone] || "var(--text)", flexShrink: 0 }}>
            Key takeaway:
          </span>
          <span>{takeaway}</span>
        </div>
      )}
    </section>
  );
}
