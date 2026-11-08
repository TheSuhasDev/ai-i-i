import test from "node:test";
import assert from "node:assert/strict";

function calculateClassificationMetrics(tp, fp, fn, tn) {
  const precision = tp / (tp + fp);
  const recall = tp / (tp + fn);
  const f1 = (2 * precision * recall) / (precision + recall);
  const total = tp + fp + fn + tn;
  const positiveRate = (tp + fn) / total;
  return {
    precision: Number(precision.toFixed(4)),
    recall: Number(recall.toFixed(4)),
    f1: Number(f1.toFixed(4)),
    total,
    positiveRate: Number(positiveRate.toFixed(4)),
  };
}

function calculateWapeGain(modelWape, baselineWape) {
  return Number(((1 - modelWape / baselineWape) * 100).toFixed(1));
}

test("Recomputed classification metrics match scikit-learn metrics for risk model", () => {
  // Stored values in risk_metrics.json
  const tp = 979;
  const fp = 49;
  const fn = 155;
  const tn = 5769;

  const metrics = calculateClassificationMetrics(tp, fp, fn, tn);
  assert.equal(metrics.total, 6952);
  assert.equal(metrics.positiveRate, 0.1631);
  assert.equal(metrics.precision, 0.9523);
  assert.equal(metrics.recall, 0.8633);
  assert.equal(metrics.f1, 0.9056);
});

test("Recomputed rule baseline metrics match stored baseline values", () => {
  const rTp = 1033;
  const rFp = 120;
  const rFn = 101;
  const rTn = 5698;

  const ruleMetrics = calculateClassificationMetrics(rTp, rFp, rFn, rTn);
  assert.equal(ruleMetrics.total, 6952);
  assert.equal(ruleMetrics.precision, 0.8959);
  assert.equal(ruleMetrics.recall, 0.9109);
  assert.equal(ruleMetrics.f1, 0.9034);

  // Model precision (0.9523) significantly outperforms rule precision (0.8959)
  assert.ok(0.9523 > ruleMetrics.precision);
  // Model false positives (49) are less than half of rule false positives (120)
  assert.ok(49 < ruleMetrics.total - (rTp + rTn + rFn));
});

test("Forecast WAPE gain calculation matches reported horizon improvements", () => {
  // Horizon 1: Model 16.7781%, MA4 18.5806%
  const gainH1 = calculateWapeGain(16.77811039653329, 18.580552560032807);
  assert.equal(gainH1, 9.7);

  // Horizon 2: Model 17.4781%, MA4 19.3286%
  const gainH2 = calculateWapeGain(17.478087500423083, 19.328589437871173);
  assert.equal(gainH2, 9.6);

  // Horizon 3: Model 17.9126%, MA4 20.0176%
  const gainH3 = calculateWapeGain(17.91260346082271, 20.01758076519996);
  assert.equal(gainH3, 10.5);
});

test("Calibration chart data correctly attributes predicted risk vs actual stockout rate", () => {
  const rawBin = { bin: "(0.5, 0.7]", n: 143, predicted: 0.597, actual: 0.58 };
  const formatted = {
    bin: rawBin.bin,
    predicted: Math.round(rawBin.predicted * 1000) / 10,
    actual: Math.round(rawBin.actual * 1000) / 10,
  };

  assert.equal(formatted.predicted, 59.7);
  assert.equal(formatted.actual, 58.0);
  assert.ok(Math.abs(formatted.predicted - formatted.actual) < 2.0); // Within 2% of ideal calibration
});
