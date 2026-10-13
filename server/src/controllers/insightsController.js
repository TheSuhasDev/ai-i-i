import Product from "../models/Product.js";
import Inventory from "../models/Inventory.js";
import Insight from "../models/Insight.js";
import mlService from "../services/mlService.js";
import AppError from "../utils/AppError.js";

const RANK = { Critical: 0, High: 1, Medium: 2, Low: 3 };

async function computeAndStore(product) {
  const inv = await Inventory.findOne({ product: product._id });
  const body = { product_id: product.code };
  if (inv) {
    body.stock = inv.currentStock;
    body.on_order = inv.inTransitQty;
  }
  const data = await mlService.insights(body);
  return Insight.findOneAndUpdate(
    { product: product._id },
    {
      productCode: product.code,
      asOf: data.as_of,
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

// GET /api/insights/:code  -> forecast, risk, reorder, health and alerts for one product (recomputed and stored)
export async function getInsight(req, res) {
  const product = await Product.findOne({ code: req.params.code.toUpperCase() });
  if (!product) throw new AppError(`Unknown product ${req.params.code}`, 404);
  const doc = await computeAndStore(product);
  res.json({ success: true, data: { ...doc.data, computedAt: doc.computedAt } });
}

// GET /api/insights?priority=Critical&status=Warning  -> stored summaries, most urgent first
export async function listInsights(req, res) {
  const filter = {};
  if (req.query.priority) filter.priority = req.query.priority;
  if (req.query.status) filter.healthStatus = req.query.status;
  const docs = await Insight.find(filter)
    .select("productCode priority healthScore healthStatus riskPct orderQty daysOfCover marginDays computedAt data.name data.classification.abc_xyz")
    .lean();
  docs.sort((a, b) => RANK[a.priority] - RANK[b.priority] || a.healthScore - b.healthScore);
  res.json({ success: true, count: docs.length, data: docs });
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
      else result.failed.push({ code: batch[j].code, error: s.reason?.message });
    });
  }
  res.json({ success: true, data: result });
}