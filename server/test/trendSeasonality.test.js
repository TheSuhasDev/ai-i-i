import test from "node:test";
import assert from "node:assert/strict";

const PATTERNS = [
  { key: "increasing", label: "Increasing" },
  { key: "decreasing", label: "Decreasing" },
  { key: "stable", label: "Stable" },
  { key: "seasonal", label: "Seasonal" },
  { key: "increasing+seasonal", label: "Increasing + Seasonal" },
  { key: "decreasing+seasonal", label: "Decreasing + Seasonal" },
];

function patternKey(trend) {
  const pattern = String(trend?.pattern || "").toLowerCase().replace(/[\s_-]/g, "");
  if (pattern.includes("seasonal") && pattern.startsWith("decreasing")) {
    return "decreasing+seasonal";
  }
  if (pattern.includes("seasonal") && (pattern.startsWith("increasing") || pattern.startsWith("trend"))) {
    if (trend?.trend === "decreasing") {
      return "decreasing+seasonal";
    }
    return "increasing+seasonal";
  }
  return PATTERNS.some(({ key }) => key === pattern) ? pattern : "unknown";
}

function badgeClass(key) {
  if (key === "increasing+seasonal" || key === "decreasing+seasonal") {
    return "trend-pattern-trend-seasonal";
  }
  return `trend-pattern-${key}`;
}

function formatTakeaway(yoyVal) {
  if (yoyVal == null || Number.isNaN(Number(yoyVal))) {
    return "Year-over-year sales demand data is unavailable.";
  }
  const val = Number(yoyVal);
  const signedYoy = `${val > 0 ? "+" : ""}${val.toFixed(1)}%`;
  let salesTrendText = "flat";
  if (Math.abs(val) >= 1) {
    salesTrendText = val > 0 ? `up ${Math.abs(val).toFixed(1)}%` : `down ${Math.abs(val).toFixed(1)}%`;
  }
  return `Sales are ${salesTrendText} year over year (${signedYoy} overall).`;
}

function formatSeasonalityTakeaway(trend, lowestMonthEntry, lowestMonthName) {
  const hasSeasonality = Boolean(trend?.seasonal && trend?.peak_month && Array.isArray(trend?.monthly_index) && trend.monthly_index.length === 12);
  if (!hasSeasonality) {
    return "No recurring seasonal pattern detected. Demand does not show predictable month-to-month cycles.";
  }
  const peakUplift = trend.peak_uplift_pct != null ? `${Number(trend.peak_uplift_pct).toFixed(1)}%` : null;
  const peakText = peakUplift ? `+${peakUplift} above average` : "above average";
  const lowText = lowestMonthEntry?.pctDiff != null ? `${lowestMonthEntry.pctDiff > 0 ? "+" : ""}${lowestMonthEntry.pctDiff}%` : "0%";
  return `Seasonal peak in ${trend.peak_month} (${peakText}); lowest in ${lowestMonthName || "off-season"} (${lowText}).`;
}

test("patternKey correctly categorizes decreasing + seasonal (Air Cooler)", () => {
  const airCoolerTrend = {
    pattern: "decreasing + seasonal",
    trend: "decreasing",
    seasonal: true,
    yoy_change_pct: -23.9,
    peak_month: "May",
  };
  const key = patternKey(airCoolerTrend);
  assert.equal(key, "decreasing+seasonal");
  assert.equal(badgeClass(key), "trend-pattern-trend-seasonal");
  const patternObj = PATTERNS.find((p) => p.key === key);
  assert.ok(patternObj);
  assert.equal(patternObj.label, "Decreasing + Seasonal");
});

test("patternKey categorizes all standard pattern types without returning unknown", () => {
  const cases = [
    { trend: { pattern: "increasing" }, expected: "increasing" },
    { trend: { pattern: "decreasing" }, expected: "decreasing" },
    { trend: { pattern: "stable" }, expected: "stable" },
    { trend: { pattern: "seasonal" }, expected: "seasonal" },
    { trend: { pattern: "increasing + seasonal" }, expected: "increasing+seasonal" },
    { trend: { pattern: "decreasing + seasonal" }, expected: "decreasing+seasonal" },
    { trend: { pattern: "trend + seasonal", trend: "decreasing" }, expected: "decreasing+seasonal" },
    { trend: { pattern: "trend + seasonal", trend: "increasing" }, expected: "increasing+seasonal" },
  ];

  for (const c of cases) {
    assert.equal(patternKey(c.trend), c.expected, `Failed for ${JSON.stringify(c.trend)}`);
  }
});

test("Chip counts sum to exactly 40 products including Air Cooler", () => {
  // Simulating catalog distribution: 19 stable, 8 increasing, 4 decreasing, 6 seasonal, 2 increasing+seasonal, 1 decreasing+seasonal
  const mockProducts = [
    ...Array(19).fill({ trend: { pattern: "stable" } }),
    ...Array(8).fill({ trend: { pattern: "increasing" } }),
    ...Array(4).fill({ trend: { pattern: "decreasing" } }),
    ...Array(6).fill({ trend: { pattern: "seasonal" } }),
    ...Array(2).fill({ trend: { pattern: "increasing + seasonal" } }),
    { trend: { pattern: "decreasing + seasonal", trend: "decreasing" } }, // Air Cooler
  ];

  assert.equal(mockProducts.length, 40);

  const byPattern = Object.fromEntries(PATTERNS.map(({ key }) => [key, 0]));
  mockProducts.forEach((product) => {
    const key = patternKey(product.trend);
    assert.ok(key in byPattern, `Pattern key ${key} missing from byPattern chips`);
    byPattern[key] += 1;
  });

  assert.equal(byPattern["stable"], 19);
  assert.equal(byPattern["increasing"], 8);
  assert.equal(byPattern["decreasing"], 4);
  assert.equal(byPattern["seasonal"], 6);
  assert.equal(byPattern["increasing+seasonal"], 2);
  assert.equal(byPattern["decreasing+seasonal"], 1);

  const totalChipCount = Object.values(byPattern).reduce((sum, count) => sum + count, 0);
  assert.equal(totalChipCount, 40, "Total chip counts must equal catalog size (40)");
});

test("Key takeaway text is grammatically clean and not garbled", () => {
  // Decreasing YoY (e.g. Air Cooler -23.9%)
  const decreasingText = formatTakeaway(-23.9);
  assert.equal(decreasingText, "Sales are down 23.9% year over year (-23.9% overall).");
  assert.ok(!decreasingText.includes("demand is down"), "Must not contain garbled duplicate phrase");
  assert.ok(!decreasingText.includes("Sales are demand"), "Must not contain 'Sales are demand'");

  // Increasing YoY
  const increasingText = formatTakeaway(18.5);
  assert.equal(increasingText, "Sales are up 18.5% year over year (+18.5% overall).");
  assert.ok(!increasingText.includes("Sales are demand"));

  // Flat YoY
  const flatText = formatTakeaway(0.2);
  assert.equal(flatText, "Sales are flat year over year (+0.2% overall).");

  // Null YoY
  const nullText = formatTakeaway(null);
  assert.equal(nullText, "Year-over-year sales demand data is unavailable.");
});

test("Seasonality takeaway handles peak and off-season cleanly", () => {
  const airCoolerTrend = {
    seasonal: true,
    peak_month: "May",
    peak_uplift_pct: 124.9,
    monthly_index: [0.514, 0.622, 1.438, 1.915, 2.249, 1.449, 1.113, 0.696, 0.699, 0.572, 0.286, 0.377],
  };

  const takeaway = formatSeasonalityTakeaway(airCoolerTrend, { month: "Nov", pctDiff: -71 }, "November");
  assert.equal(takeaway, "Seasonal peak in May (+124.9% above average); lowest in November (-71%).");
  assert.ok(!takeaway.includes("+peak"));
});

