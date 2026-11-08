import test from "node:test";
import assert from "node:assert/strict";

// Mirror reliability score calculation from ml-service/app/decision.py
const W_ONTIME = 0.40;
const W_DELAY = 0.25;
const W_VARIANCE = 0.20;
const W_QUALITY = 0.15;
const DELAY_CAP_DAYS = 7.0;
const STD_CAP_DAYS = 5.0;
const QUALITY_CAP = 0.20;

function calculateReliabilityScore({ onTimeRate, avgDelay, delayStd, qualityRate }) {
  const score =
    100 *
    (W_ONTIME * Math.min(Math.max(onTimeRate, 0.0), 1.0) +
      W_DELAY * (1 - Math.min(avgDelay / DELAY_CAP_DAYS, 1)) +
      W_VARIANCE * (1 - Math.min(delayStd / STD_CAP_DAYS, 1)) +
      W_QUALITY * (1 - Math.min(qualityRate / QUALITY_CAP, 1)));
  return Math.round(score * 10) / 10;
}

function calculateRiskLevel(reliabilityScore) {
  if (reliabilityScore < 60) return "High";
  if (reliabilityScore <= 80) return "Medium";
  return "Low";
}

function computeTargetTakeaway(rows) {
  const belowTarget = rows.filter((r) => Math.round((r.on_time_rate || 0) * 100) < 80).length;
  let tone = "tone-healthy";
  let text = "All suppliers meet or exceed the 80% on-time delivery target.";
  if (belowTarget > 0) {
    tone = belowTarget > 2 ? "tone-critical" : "tone-warning";
    text = `${belowTarget} of ${rows.length} suppliers fall below the 80% on-time delivery target. Review delivery timelines and lead-time buffers.`;
  }
  return { belowTarget, tone, text };
}

function formatDiscrete(value) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function normalizeSupplierCode(code) {
  return String(code || "").trim().toUpperCase();
}

test("calculateReliabilityScore mirrors ml-service formula", () => {
  // S1 benchmark values: on-time 0.956, avg delay 0.029, delay std 0.169, quality 0.006 -> reliability 97.0
  const scoreHighPerf = calculateReliabilityScore({
    onTimeRate: 0.956,
    avgDelay: 0.029,
    delayStd: 0.169,
    qualityRate: 0.006,
  });
  assert.equal(scoreHighPerf, 97.0);
  assert.equal(calculateRiskLevel(scoreHighPerf), "Low");

  // S6 benchmark values: on-time 0.610, delay 4.553, delay std 5.622, quality 0.099 -> reliability 40.7
  const scoreLowPerf = calculateReliabilityScore({
    onTimeRate: 0.61,
    avgDelay: 4.553,
    delayStd: 5.622,
    qualityRate: 0.099,
  });
  assert.equal(scoreLowPerf, 40.7);
  assert.equal(calculateRiskLevel(scoreLowPerf), "High");
});

test("computeTargetTakeaway accurately evaluates the 80% on-time threshold", () => {
  const mockRows = [
    { supplier_id: "S1", on_time_rate: 0.96, reliability_score: 97.0, risk_level: "Low" },
    { supplier_id: "S2", on_time_rate: 0.96, reliability_score: 95.8, risk_level: "Low" },
    { supplier_id: "S3", on_time_rate: 0.88, reliability_score: 87.1, risk_level: "Low" },
    { supplier_id: "S4", on_time_rate: 0.85, reliability_score: 82.2, risk_level: "Low" },
    { supplier_id: "S5", on_time_rate: 0.82, reliability_score: 79.2, risk_level: "Medium" },
    { supplier_id: "S6", on_time_rate: 0.61, reliability_score: 40.7, risk_level: "High" },
    { supplier_id: "S7", on_time_rate: 0.64, reliability_score: 42.3, risk_level: "High" },
    { supplier_id: "S8", on_time_rate: 0.76, reliability_score: 56.3, risk_level: "High" },
  ];

  const result = computeTargetTakeaway(mockRows);
  // S6 (61%), S7 (64%), S8 (76%) are below 80%
  assert.equal(result.belowTarget, 3);
  assert.equal(result.tone, "tone-critical");
  assert.match(result.text, /3 of 8 suppliers fall below the 80% on-time delivery target/);
});

test("computeTargetTakeaway gives healthy tone when all suppliers achieve target", () => {
  const mockRowsAllGood = [
    { supplier_id: "S1", on_time_rate: 0.95 },
    { supplier_id: "S2", on_time_rate: 0.85 },
  ];
  const result = computeTargetTakeaway(mockRowsAllGood);
  assert.equal(result.belowTarget, 0);
  assert.equal(result.tone, "tone-healthy");
  assert.equal(result.text, "All suppliers meet or exceed the 80% on-time delivery target.");
});

test("formatDiscrete formats PO counts as integers without decimal point", () => {
  assert.equal(formatDiscrete(38), "38");
  assert.equal(formatDiscrete(38.0), "38");
  assert.equal(formatDiscrete(92), "92");
  assert.equal(formatDiscrete(0), "0");
  assert.equal(formatDiscrete(null), "—");
  assert.equal(formatDiscrete(undefined), "—");
});

test("normalizeSupplierCode handles case and whitespace variants", () => {
  assert.equal(normalizeSupplierCode("s1"), "S1");
  assert.equal(normalizeSupplierCode("  S7  "), "S7");
  assert.equal(normalizeSupplierCode("s8"), "S8");
  assert.equal(normalizeSupplierCode(undefined), "");
});
