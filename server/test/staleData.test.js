import test from "node:test";
import assert from "node:assert/strict";

function isDataStale(dateStr, thresholdDays = 2, referenceDate = new Date("2026-10-26T00:00:00Z")) {
  if (!dateStr) return { isStale: false, daysOld: 0 };
  const target = new Date(String(dateStr).slice(0, 10) + "T00:00:00Z");
  const diffMs = referenceDate.getTime() - target.getTime();
  const daysOld = Math.max(0, Math.floor(diffMs / 86400000));
  return {
    isStale: daysOld > thresholdDays,
    daysOld,
    severity: daysOld <= 2 ? "none" : daysOld <= 7 ? "warning" : "danger",
    ageText: daysOld === 0 ? "today" : `${daysOld} ${daysOld === 1 ? "day" : "days"} old`,
  };
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatStaleBanner(dateStr, daysOld) {
  const [y, m, dt] = String(dateStr).slice(0, 10).split("-");
  const monthIdx = parseInt(m, 10) - 1;
  const day = String(parseInt(dt, 10)).padStart(2, "0");
  const formattedDate = `${day} ${MONTH_NAMES[monthIdx]} ${y}`;
  const ageText = daysOld === 0 ? "today" : `${daysOld} ${daysOld === 1 ? "day" : "days"} old`;
  return `Data as of ${formattedDate} (${ageText})`;
}

function computeLiveSalesDataAsOf(salesRecords) {
  if (!salesRecords || !salesRecords.length) return null;
  const maxDate = salesRecords.reduce((max, s) => {
    const d = new Date(s.date);
    return !max || d > max ? d : max;
  }, null);
  return maxDate ? maxDate.toISOString().slice(0, 10) : null;
}

test("Data from 11 Oct 2026 is flagged as stale (> 2 days old) on 26 Oct 2026", () => {
  const result = isDataStale("2026-10-11", 2, new Date("2026-10-26T00:00:00Z"));
  assert.equal(result.isStale, true);
  assert.equal(result.daysOld, 15);
  assert.equal(result.severity, "danger");
  assert.equal(formatStaleBanner("2026-10-11", result.daysOld), "Data as of 11 Oct 2026 (15 days old)");
});

test("Data 2 days old or newer is not flagged as stale", () => {
  const ref = new Date("2026-10-26T00:00:00Z");
  const result2Days = isDataStale("2026-10-24", 2, ref);
  assert.equal(result2Days.isStale, false);
  assert.equal(result2Days.daysOld, 2);
  assert.equal(result2Days.severity, "none");

  const result1Day = isDataStale("2026-10-25", 2, ref);
  assert.equal(result1Day.isStale, false);
  assert.equal(result1Day.daysOld, 1);
  assert.equal(result1Day.ageText, "1 day old");

  const resultToday = isDataStale("2026-10-26", 2, ref);
  assert.equal(resultToday.isStale, false);
  assert.equal(resultToday.daysOld, 0);
  assert.equal(resultToday.ageText, "today");
});

test("Data 3 to 7 days old is flagged as amber warning", () => {
  const ref = new Date("2026-10-26T00:00:00Z");
  const result3Days = isDataStale("2026-10-23", 2, ref);
  assert.equal(result3Days.isStale, true);
  assert.equal(result3Days.daysOld, 3);
  assert.equal(result3Days.severity, "warning");
  assert.equal(result3Days.ageText, "3 days old");

  const result7Days = isDataStale("2026-10-19", 2, ref);
  assert.equal(result7Days.isStale, true);
  assert.equal(result7Days.daysOld, 7);
  assert.equal(result7Days.severity, "warning");
});

test("Live sales query resolves latest sale date dynamically without hard-coded fallback", () => {
  const mockSales = [
    { date: "2026-10-24T00:00:00Z", unitsSold: 4 },
    { date: "2026-10-26T00:00:00Z", unitsSold: 8 },
    { date: "2026-10-25T00:00:00Z", unitsSold: 2 },
  ];
  const liveDate = computeLiveSalesDataAsOf(mockSales);
  assert.equal(liveDate, "2026-10-26");
  const result = isDataStale(liveDate, 2, new Date("2026-10-26T00:00:00Z"));
  assert.equal(result.isStale, false);
  assert.equal(result.daysOld, 0);
  assert.equal(result.ageText, "today");
});
