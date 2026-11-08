import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";

const simulatorSchema = z.object({
  productCode: z.string().trim().min(1),
  demandPct: z.coerce.number().min(-90).max(300).default(0),
  extraDelayDays: z.coerce.number().int().min(0).max(30).default(0),
  stock: z.coerce.number().min(0).optional(),
  orderQty: z.coerce.number().min(0).default(0),
});

function projectStockJs(stock, daily, arrivals, days = 30) {
  let s = Number(stock);
  const levels = [];
  let shortTotal = 0;
  let firstShort = null;

  for (let t = 1; t <= days; t++) {
    const arrivalsOnDay = arrivals
      .filter(([d]) => Math.max(Math.round(d), 0) === t - 1)
      .reduce((sum, [, q]) => sum + q, 0);

    s += arrivalsOnDay;
    if (s >= daily) {
      s -= daily;
    } else {
      shortTotal += daily - s;
      s = 0.0;
      if (firstShort === null) {
        firstShort = t;
      }
    }
    levels.push(Math.round(s * 10) / 10);
  }

  return { levels, firstShortfallDay: firstShort, unitsShort: Math.round(shortTotal * 10) / 10 };
}

test("Simulator schema validates allowable bounds for demandPct (-90 to 300%) and delays (0 to 30)", () => {
  const valid = simulatorSchema.parse({
    productCode: "P001",
    demandPct: 20,
    extraDelayDays: 3,
    stock: 150,
    orderQty: 50,
  });
  assert.equal(valid.demandPct, 20);
  assert.equal(valid.extraDelayDays, 3);
  assert.equal(valid.stock, 150);
  assert.equal(valid.orderQty, 50);

  // Large shock bounds
  assert.doesNotThrow(() => simulatorSchema.parse({ productCode: "P001", demandPct: -90 }));
  assert.doesNotThrow(() => simulatorSchema.parse({ productCode: "P001", demandPct: 300 }));
  assert.doesNotThrow(() => simulatorSchema.parse({ productCode: "P001", extraDelayDays: 30 }));

  // Rejects out of bound inputs
  assert.throws(() => simulatorSchema.parse({ productCode: "P001", demandPct: -95 }));
  assert.throws(() => simulatorSchema.parse({ productCode: "P001", demandPct: 350 }));
  assert.throws(() => simulatorSchema.parse({ productCode: "P001", extraDelayDays: -1 }));
  assert.throws(() => simulatorSchema.parse({ productCode: "P001", extraDelayDays: 35 }));
  assert.throws(() => simulatorSchema.parse({ productCode: "P001", orderQty: -10 }));
  assert.throws(() => simulatorSchema.parse({ productCode: "P001", stock: -5 }));
});

test("30-day projection rigorously satisfies Stock_t = max(0, Stock_{t-1} - Demand_t + Deliveries_t)", () => {
  const stock0 = 60;
  const daily = 10;
  const arrivals = [[4, 40], [10, 50]]; // deliveries arriving on day 5 and day 11
  const { levels } = projectStockJs(stock0, daily, arrivals, 30);

  let prev = stock0;
  for (let t = 1; t <= 30; t++) {
    const deliv = arrivals
      .filter(([d]) => Math.max(Math.round(d), 0) === t - 1)
      .reduce((sum, [, q]) => sum + q, 0);
    const expected = Math.max(0, prev - daily + deliv);
    assert.equal(levels[t - 1], expected);
    prev = levels[t - 1];
  }
});

test("Edge case: zero stock without deliveries produces immediate stockout on Day 1", () => {
  const { levels, firstShortfallDay, unitsShort } = projectStockJs(0, 15, [], 30);
  assert.equal(firstShortfallDay, 1);
  assert.equal(unitsShort, 450);
  assert.ok(levels.every((l) => l === 0));
});

test("Edge case: new order placed today arrives after lead time and recovers stock", () => {
  // Stock starts at 20, daily demand 10. Without order, runs out at Day 3.
  const baseline = projectStockJs(20, 10, [], 10);
  assert.equal(baseline.firstShortfallDay, 3);
  assert.equal(baseline.unitsShort, 80);

  // New order of 100 units arrives on day 5 (d=4)
  const scenario = projectStockJs(20, 10, [[4, 100]], 10);
  assert.equal(scenario.firstShortfallDay, 3);
  // shortfall on days 3 and 4: 10 + 10 = 20 units. On day 5, +100 units arrives!
  assert.equal(scenario.unitsShort, 20);
  assert.equal(scenario.levels[4], 90); // day 5 end stock
});

test("Edge case: delayed deliveries prolong out-of-stock periods", () => {
  // Normal arrival on day 4 (d=3)
  const onTime = projectStockJs(10, 10, [[3, 50]], 15);
  // Delayed by 5 days -> day 9 (d=8)
  const delayed = projectStockJs(10, 10, [[8, 50]], 15);

  // During days 4 to 7, onTime has inventory while delayed remains completely stocked out
  assert.equal(onTime.levels[3], 40); // day 4 stock
  assert.equal(delayed.levels[3], 0);  // day 4 stock delayed
  assert.ok(delayed.levels.slice(3, 8).every((l) => l === 0));
  assert.ok(onTime.levels.slice(3, 7).every((l) => l > 0));

  // If delay pushes arrival past the 15-day horizon (d=16), unitsShort increases
  const delayedPastHorizon = projectStockJs(10, 10, [[16, 50]], 15);
  assert.equal(delayedPastHorizon.unitsShort, 140);
  assert.ok(delayedPastHorizon.unitsShort > onTime.unitsShort);
});
