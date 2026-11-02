import Icon from "./Icon";

export default function MetricCard({ label, value, sub, icon = "info", trend, progress, tone = "" }) {
  const boundedProgress = progress == null ? null : Math.min(100, Math.max(0, Number(progress) || 0));
  return (
    <div className={`card stat metric-card ${tone}`} style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div className="metric-content">
        <div className="metric-heading"><span className="metric-icon"><Icon name={icon} size={17} /></span><h4>{label}</h4></div>
        <p className="big">{value}</p>
        {sub && <p className="muted small">{sub}</p>}
        {trend != null && <span className={`metric-trend ${Number(trend) < 0 ? "negative" : "positive"}`}><Icon name={Number(trend) < 0 ? "down" : "trend"} size={13} /> {Number(trend) > 0 ? "+" : ""}{trend}%</span>}
      </div>
      {boundedProgress != null ? (
        <div className="metric-progress" role="progressbar" aria-label={label} aria-valuemin="0" aria-valuemax="100" aria-valuenow={boundedProgress}>
          <span style={{ width: `${boundedProgress}%` }} />
        </div>
      ) : (
        <div className="metric-progress-spacer" style={{ height: "6px", marginTop: "8px", visibility: "hidden" }} aria-hidden="true" />
      )}
    </div>
  );
}
