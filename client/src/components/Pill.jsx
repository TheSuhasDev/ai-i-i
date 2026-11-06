import Icon from "./Icon";

function getTone(value) {
  const text = String(value).toLowerCase();
  if (text.includes("critical") || text === "high" || text.includes("high") || text.includes("cancelled") || text.includes("decreasing")) return ["status-critical", "alert"];
  if (text.includes("warning") || text.includes("medium") || text.includes("pending") || text.includes("in transit") || text.includes("trend + seasonal")) return ["status-warning", text.includes("trend") ? "trend" : "clock"];
  if (text.includes("healthy") || text === "low" || text.includes("low") || text.includes("delivered") || text.includes("increasing")) return ["status-healthy", "check"];
  if (text.includes("stable")) return ["status-info", "trend"];
  if (text.includes("seasonal") || /[abc][xyz]/i.test(text)) return ["status-info", text.includes("seasonal") ? "trend" : "layers"];
  return ["status-info", "info"];
}

export default function Pill({ value, label, tone: explicitTone, title }) {
  if (value == null && label == null) return "-";
  const display = label ?? value;
  const toneKey = explicitTone || value || label;
  const [tone, icon] = getTone(toneKey);
  return <span className={`pill ${tone}`} title={title}><Icon name={icon} size={13} />{display}</span>;
}
