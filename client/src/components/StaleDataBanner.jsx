import Icon from "./Icon";
import { formatDate, getDataAgeDays } from "../utils/format";

export default function StaleDataBanner({ date, daysOld: explicitDaysOld, showUpToDate = false }) {
  if (!date) return null;
  const daysOld = explicitDaysOld != null ? explicitDaysOld : getDataAgeDays(date);
  if (daysOld == null) return null;

  // 0-2 days old: hide banner by default or show green "Data up to date" chip
  if (daysOld <= 2) {
    if (!showUpToDate) return null;
    return (
      <div className="alert ok stale-data-banner" role="status" style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "99px", fontSize: "12px", marginBottom: "14px" }}>
        <Icon name="check" size={14} />
        <span>Data up to date ({daysOld === 0 ? "today" : `${daysOld} day${daysOld === 1 ? "" : "s"} ago`})</span>
      </div>
    );
  }

  // Singular/plural wording; say "today" when 0 days
  const ageText = daysOld === 0 ? "today" : `${daysOld} ${daysOld === 1 ? "day" : "days"} old`;
  // Amber for 3-7 days, red above 7
  const isSevere = daysOld > 7;

  return (
    <div className={`alert ${isSevere ? "danger" : "warning"} stale-data-banner`} role="alert">
      <Icon name="clock" size={15} />
      <span>Data as of {formatDate(date)} ({ageText})</span>
    </div>
  );
}
