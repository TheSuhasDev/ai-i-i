import Icon from "./Icon";
import { formatDate, getDataAgeDays } from "../utils/format";

export default function StaleDataBanner({ date, daysOld: explicitDaysOld }) {
  if (!date) return null;
  const daysOld = explicitDaysOld != null ? explicitDaysOld : getDataAgeDays(date);
  if (daysOld == null || daysOld <= 2) return null;

  return (
    <div className="alert warning stale-data-banner" role="alert">
      <Icon name="clock" size={15} />
      <span>Data as of {formatDate(date)} ({daysOld} days old)</span>
    </div>
  );
}
