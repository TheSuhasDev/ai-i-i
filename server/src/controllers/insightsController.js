import Product from "../models/Product.js";
import { syncInTransit } from "../models/PurchaseOrder.js";
import Inventory from "../models/Inventory.js";
import Insight from "../models/Insight.js";
import Sale from "../models/Sale.js";
import mlService from "../services/mlService.js";
import { getOpenPurchaseOrderSummary } from "../services/openPurchaseOrders.js";
import AppError from "../utils/AppError.js";

const RANK = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const DAY = 86400000;

export async function computeAndStore(product) {
  await syncInTransit(product._id);
  const inv = await Inventory.findOne({ product: product._id });
  const purchaseOrders = await getOpenPurchaseOrderSummary(product._id);
  const body = { product_id: product.code };
  if (inv) {
    body.stock = inv.currentStock;
  }
  body.on_order = purchaseOrders.onOrder;
  if (purchaseOrders.expectedDeliveryDate) {
    body.expected_delivery_date = purchaseOrders.expectedDeliveryDate.toISOString().slice(0, 10);
  }
  const data = await mlService.insights(body);
  return Insight.findOneAndUpdate(
    { product: product._id },
    {
      productCode: product.code,
      asOf: data.as_of,
      dataAsOf: data.data_as_of || data.inputs?.data_as_of || null,
      priority: data.priority,
      healthScore: data.health.score,
      healthStatus: data.health.status,
      riskPct: data.risk.risk_pct,
      orderQty: data.reorder.order_qty,
      daysOfCover: data.stockout.days_of_cover,
      marginDays: data.stockout.margin_days,
      data,
      computedAt: new Date(),
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );
}

// GET /api/insights/:code  -> full combined result for one product (recomputed and stored)
export async function getInsight(req, res) {
  const product = await Product.findOne({ code: req.params.code.toUpperCase() });
  if (!product) throw new AppError(`Unknown product ${req.params.code}`, 404);
  const doc = await computeAndStore(product);
  res.json({ success: true, data: { ...doc.data, computedAt: doc.computedAt } });
}

// GET /api/insights?priority=&status=&full=1  -> stored results, most urgent first.
// Default returns light summaries; full=1 includes the whole payload (alerts, reorder, ...).
export async function listInsights(req, res) {
  const filter = {};
  if (req.query.priority) filter.priority = req.query.priority;
  if (req.query.status) filter.healthStatus = req.query.status;
  let query = Insight.find(filter);
  if (req.query.full !== "1") {
    query = query.select(
      "productCode asOf dataAsOf priority healthScore healthStatus riskPct orderQty daysOfCover marginDays computedAt data.name data.as_of data.data_as_of data.inputs.data_as_of data.inputs.data_age_days data.classification data.trend.pattern data.trend.trend data.trend.yoy_change_pct data.trend.monthly_index data.trend.weekly_series"
    );
  }
  const docs = await query.lean();
  docs.sort((a, b) => RANK[a.priority] - RANK[b.priority] || a.healthScore - b.healthScore);
  res.json({ success: true, count: docs.length, data: docs });
}

// GET /api/insights/:code/history?weeks=52  -> complete Monday-Sunday weeks of units sold
export async function getHistory(req, res) {
  const product = await Product.findOne({ code: req.params.code.toUpperCase() });
  if (!product) throw new AppError(`Unknown product ${req.params.code}`, 404);
  const weeks = Math.min(Math.max(parseInt(req.query.weeks) || 52, 4), 156);

  const last = await Sale.findOne({ product: product._id }).sort("-date").select("date").lean();
  if (!last) return res.json({ success: true, data: { code: product.code, weeks: [] } });

  const since = new Date(last.date.getTime() - (weeks + 1) * 7 * DAY);
  const rows = await Sale.aggregate([
    { $match: { product: product._id, date: { $gt: since } } },
    {
      $group: {
        _id: { y: { $isoWeekYear: "$date" }, w: { $isoWeek: "$date" } },
        weekStart: { $min: "$date" },
        units: { $sum: "$unitsSold" },
        days: { $sum: 1 },
      },
    },
    { $sort: { weekStart: 1 } },
  ]);
  const data = rows
    .filter((r) => r.days === 7) // complete weeks only, like the ML service
    .slice(-weeks)
    .map((r) => ({ weekStart: r.weekStart.toISOString().slice(0, 10), units: r.units }));
  res.json({ success: true, data: { code: product.code, weeks: data } });
}

// POST /api/insights/refresh  -> recompute every active product (admin, manager)
export async function refreshAll(req, res) {
  const products = await Product.find({ isActive: true });
  const result = { total: products.length, ok: 0, failed: [] };
  for (let i = 0; i < products.length; i += 5) {
    const batch = products.slice(i, i + 5);
    const settled = await Promise.allSettled(batch.map(computeAndStore));
    settled.forEach((s, j) => {
      if (s.status === "fulfilled") result.ok += 1;
      else {
        console.error(`Insight refresh failed for ${batch[j].code}:`, s.reason);
        result.failed.push({ code: batch[j].code, error: "INSIGHT_COMPUTE_FAILED" });
      }
    });
  }
  res.json({ success: true, data: result });
}

// GET /api/insights/:code/explain  -> why the stockout risk is what it is (uses live MongoDB stock)
export async function getExplanation(req, res) {
  const product = await Product.findOne({ code: req.params.code.toUpperCase() });
  if (!product) throw new AppError(`Unknown product ${req.params.code}`, 404);
  const inv = await Inventory.findOne({ product: product._id });
  const body = { product_id: product.code };
  if (inv) body.stock = inv.currentStock;
  res.json({ success: true, data: await mlService.explain(body) });
}
