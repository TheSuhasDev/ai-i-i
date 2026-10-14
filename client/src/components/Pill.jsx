export default function Pill({ value }) {
  if (value == null) return "-";
  return <span className={`pill ${String(value).toLowerCase()}`}>{value}</span>;
}