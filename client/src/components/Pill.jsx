import Icon from "./Icon";

function getTone(value) {
  const text = String(value).toLowerCase();
  if (text === "critical" || text === "high" || text === "cancelled" || text.includes("decreasing")) return ["status-critical", "alert"];
  if (text === "warning" || text === "medium" || text === "pending" || text.includes("in transit") || text.includes("trend + seasonal")) return ["status-warning", text.includes("trend") ? "trend" : "clock"];
  if (text === "healthy" || text === "low" || text === "delivered" || text.includes("increasing")) return ["status-healthy", "check"];
  if (text === "stable") return ["status-info", "trend"];
  if (text.includes("seasonal") || /^[abc][xyz]$/i.test(text)) return ["status-info", text.includes("seasonal") ? "trend" : "layers"];
  return ["status-info", "info"];
}

export default function Pill({ value, title }) {
  if (value == null) return "-";
  const [tone, icon] = getTone(value);
  return <span className={`pill ${tone}`} title={title}><Icon name={icon} size={13} />{value}</span>;
}
