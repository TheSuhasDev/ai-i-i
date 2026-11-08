import Product from "../models/Product.js";
import Supplier from "../models/Supplier.js";
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
  const [data, maxSale] = await Promise.all([
    mlService.insights(body),
    Sale.findOne().sort({ date: -1 }).select("date").lean(),
  ]);
  const liveDataDate = maxSale?.date
    ? maxSale.date.toISOString().slice(0, 10)
    : data.data_as_of || data.inputs?.data_as_of || null;

  return Insight.findOneAndUpdate(
    { product: product._id },
    {
      productCode: product.code,
      asOf: data.as_of,
      dataAsOf: liveDataDate,
      priority: data.priority,
      healthScore: data.health.score,
      healthStatus: data.health.status,
      riskPct: data.risk.risk_pct,
      orderQty: data.reorder.order_qty,
      daysOfCover: data.stockout.days_of_cover,
      marginDays: data.stockout.margin_days,
      data: {
        ...data,
        data_as_of: liveDataDate,
        inputs: {
          ...(data.inputs || {}),
          data_as_of: liveDataDate,
        },
      },
      computedAt: new Date(),
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );
}

// GET /api/insights/:code  -> full combined result for one product (recomputed and stored)
export async function getInsight(req, res) {
  const product = await Product.findOne({ code: req.params.code.toUpperCase() }).populate("suppliers");
  if (!product) throw new AppError(`Unknown product ${req.params.code}`, 404);
  const doc = await computeAndStore(product);
  const maxSale = await Sale.findOne().sort({ date: -1 }).select("date").lean();
  const liveDataDate = maxSale?.date ? maxSale.date.toISOString().slice(0, 10) : null;
  const liveDataAgeDays = maxSale?.date
    ? Math.max(0, Math.floor((new Date(new Date().toISOString().slice(0, 10)) - new Date(liveDataDate)) / 86400000))
    : null;

  const suppliers = await Supplier.find().select("code name").lean();
  const supMap = Object.fromEntries(suppliers.map((s) => [s.code, s.name]));

  const primarySupplierId = doc.data?.supplier?.id || doc.data?.reorder?.supplier_id;
  const primarySupplierName = supMap[primarySupplierId] || primarySupplierId;

  const altSupplier = doc.data?.reorder?.alternate_supplier;
  const altSupplierId = altSupplier?.supplier_id;
  const altSupplierName = altSupplierId ? (supMap[altSupplierId] || altSupplierId) : null;

  res.json({
    success: true,
    dataDate: liveDataDate,
    dataAsOf: liveDataDate,
    data: {
      ...doc.data,
      category: product.category,
      price: product.price,
      cost: product.cost,
      lead_time_days: product.leadTimeDays,
      moq: 10,
      imageUrl: product.imageUrl,
      computedAt: doc.computedAt,
      dataAsOf: liveDataDate,
      data_as_of: liveDataDate,
      supplier: {
        ...(doc.data?.supplier || {}),
        id: primarySupplierId,
        name: primarySupplierName,
      },
      reorder: {
        ...(doc.data?.reorder || {}),
        supplier_id: primarySupplierId,
        supplier_name: primarySupplierName,
        moq: 10,
        alternate_supplier: altSupplier ? {
          ...altSupplier,
          supplier_name: altSupplierName,
        } : null,
      },
      inputs: {
        ...(doc.data?.inputs || {}),
        data_as_of: liveDataDate,
        data_age_days: liveDataAgeDays,
      },
    },
  });
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
      "productCode asOf dataAsOf priority healthScore healthStatus riskPct orderQty daysOfCover marginDays computedAt data.name data.as_of data.data_as_of data.inputs.data_as_of data.inputs.data_age_days data.classification data.reorder.supplier_id data.reorder.supplier_risk_level data.reorder.alternate_supplier data.reorder.order_qty data.trend.pattern data.trend.trend data.trend.yoy_change_pct data.trend.monthly_index data.trend.weekly_series data.alerts"
    );
  }
  const [docs, maxSale] = await Promise.all([
    query.lean(),
    Sale.findOne().sort({ date: -1 }).select("date").lean(),
  ]);
  const liveDataDate = maxSale?.date ? maxSale.date.toISOString().slice(0, 10) : null;

  // Sorting within severity tiers by urgency: smallest margin / largest days-short first;
  // Overstock by days of cover descending; tie-break by alert count, then SKU.
  function compareUrgency(a, b) {
    const prioA = RANK[a.priority] ?? 99;
    const prioB = RANK[b.priority] ?? 99;
    if (prioA !== prioB) return prioA - prioB;

    const alertsA = a.data?.alerts || [];
    const alertsB = b.data?.alerts || [];
    const isOverstockA = alertsA.some((x) => x.type === "overstock") && !alertsA.some((x) => (x.type || "").includes("margin") || (x.type || "").includes("stockout"));
    const isOverstockB = alertsB.some((x) => x.type === "overstock") && !alertsB.some((x) => (x.type || "").includes("margin") || (x.type || "").includes("stockout"));

    if (isOverstockA && isOverstockB) {
      const covA = a.daysOfCover ?? a.data?.stockout?.days_of_cover ?? 0;
      const covB = b.daysOfCover ?? b.data?.stockout?.days_of_cover ?? 0;
      if (covB !== covA) return covB - covA;
    } else if (!isOverstockA && !isOverstockB) {
      const marA = a.marginDays ?? a.data?.stockout?.margin_days ?? 999;
      const marB = b.marginDays ?? b.data?.stockout?.margin_days ?? 999;
      if (marA !== marB) return marA - marB;
    } else {
      return isOverstockA ? 1 : -1;
    }

    const countA = alertsA.length;
    const countB = alertsB.length;
    if (countB !== countA) return countB - countA;

    const codeA = a.productCode || a.code || "";
    const codeB = b.productCode || b.code || "";
    return codeA.localeCompare(codeB);
  }

  docs.sort(compareUrgency);

  // Compute KPI counts both as alerts and as distinct products per priority
  const kpi = {
    critical: { alerts: 0, products: 0 },
    high: { alerts: 0, products: 0 },
    medium: { alerts: 0, products: 0 },
    low: { alerts: 0, products: 0 },
    totalAlerts: 0,
    totalProductsWithAlerts: 0,
  };

  const productsByPriority = {
    critical: new Set(),
    high: new Set(),
    medium: new Set(),
    low: new Set(),
  };
  const allAlertProducts = new Set();

  for (const doc of docs) {
    const pid = doc.productCode || doc.code || String(doc._id || "");
    const alerts = doc.data?.alerts || [];
    if (alerts.length > 0) {
      allAlertProducts.add(pid);
    }
    for (const a of alerts) {
      const p = (a.priority || "Low").toLowerCase();
      if (kpi[p]) {
        kpi[p].alerts += 1;
        kpi.totalAlerts += 1;
        productsByPriority[p].add(pid);
      }
    }
  }

  for (const p of ["critical", "high", "medium", "low"]) {
    kpi[p].products = productsByPriority[p].size;
  }
  kpi.totalProductsWithAlerts = allAlertProducts.size;

  res.json({
    success: true,
    count: docs.length,
    kpi,
    dataDate: liveDataDate,
    dataAsOf: liveDataDate,
    data: docs,
  });
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
