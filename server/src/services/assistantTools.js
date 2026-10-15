import { z } from "zod";
import Product from "../models/Product.js";
import Inventory from "../models/Inventory.js";
import Insight from "../models/Insight.js";
import Supplier from "../models/Supplier.js";
import mlService from "./mlService.js";
import AppError from "../utils/AppError.js";
import { computeAndStore } from "../controllers/insightsController.js";

const RANK = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const MAX_RESULT_CHARS = Number(process.env.LLM_MAX_RESULT_CHARS) || 7000;

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const round = (n, d = 1) => (typeof n === "number" && Number.isFinite(n) ? Number(n.toFixed(d)) : (n ?? null));
const upper = (s) => String(s || "").trim().toUpperCase();
const sortUrgent = (a, b) => RANK[a.priority] - RANK[b.priority] || a.healthScore - b.healthScore;

// ---------------------------------------------------------------- tool definitions (sent to the model)

const codeProp = { type: "string", description: "Product code such as P001. Use search_products if you only know the name." };

export const toolDefinitions = [
  {
    name: "search_products",
    description: "Find products by name, code, SKU or category. Use this to turn a product name the user typed into a product code.",
    input_schema: { type: "object", properties: { query: { type: "string", description: "Part of a product name, e.g. 'usb hub'" } }, required: ["query"] },
  },
  {
    name: "list_reorder_recommendations",
    description: "Products that need an order right now (recommended order quantity above zero), most urgent first. Uses the stored insights.",
    input_schema: { type: "object", properties: { limit: { type: "integer", description: "Max rows, default 15" } } },
  },
  {
    name: "get_product_insight",
    description: "Full, freshly computed analysis of one product: alert priority, health score, stockout risk, days of cover, expected stockout and delivery dates, 3-week forecast, reorder recommendation, trend, ABC-XYZ class and supplier.",
    input_schema: { type: "object", properties: { product_code: codeProp }, required: ["product_code"] },
  },
  {
    name: "explain_stockout_risk",
    description: "Why a product has its stockout risk: the factors that raise or lower it (SHAP-based), with plain-language reasons. Use this for 'why is X critical / at risk?'.",
    input_schema: { type: "object", properties: { product_code: codeProp }, required: ["product_code"] },
  },
  {
    name: "list_alerts",
    description: "Current alerts across all products (stockout before delivery, low cover margin, reorder now, overstock, supplier risk), most urgent first.",
    input_schema: {
      type: "object",
      properties: {
        priority: { type: "string", enum: ["Critical", "High", "Medium", "Low"], description: "Only alerts of this priority" },
        limit: { type: "integer", description: "Max rows, default 15" },
      },
    },
  },
  {
    name: "get_supplier_risk",
    description: "Reliability and risk score of every supplier from delivery history (on-time rate, average delay, delay variability, quality issues), least reliable first. Use this for questions about supplier delays.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "list_overstocked",
    description: "Products holding more stock than demand needs (days of cover at or above a threshold), most overstocked first.",
    input_schema: {
      type: "object",
      properties: {
        min_days_of_cover: { type: "number", description: "Default 90 days" },
        limit: { type: "integer", description: "Max rows, default 15" },
      },
    },
  },
  {
    name: "simulate_product",
    description: "What-if for ONE product: change demand (%), extra supplier delay (days), stock, or a new order quantity, and compare before and after (risk, alert priority, stockout date, reorder quantity).",
    input_schema: {
      type: "object",
      properties: {
        product_code: codeProp,
        demand_pct: { type: "number", description: "Demand change in percent, e.g. 20 for +20%" },
        extra_delay_days: { type: "integer", description: "Additional supplier delay in days" },
        stock: { type: "number", description: "Scenario stock on hand (default: current stock)" },
        order_qty: { type: "number", description: "A new order placed today (units)" },
      },
      required: ["product_code"],
    },
  },
  {
    name: "simulate_all",
    description: "What-if across ALL products at once, e.g. demand +20% or supplier delay +3 days. Returns a portfolio summary and the most affected products. Use this for general questions like 'what happens if demand increases by 20%?'.",
    input_schema: {
      type: "object",
      properties: {
        demand_pct: { type: "number", description: "Demand change in percent" },
        extra_delay_days: { type: "integer", description: "Additional supplier delay in days" },
      },
    },
  },
  {
    name: "get_model_performance",
    description: "Measured accuracy of the ML models on held-out data: forecast MAE/RMSE/MAPE/WAPE versus baselines, stockout classifier precision/recall/F1, anomaly detection.",
    input_schema: { type: "object", properties: {} },
  },
];

// ---------------------------------------------------------------- input validation

const limitSchema = z.coerce.number().int().min(1).max(25).default(15);
const codeSchema = z.string().trim().min(1).max(20);
const pctSchema = z.coerce.number().min(-90).max(300).default(0);
const delaySchema = z.coerce.number().int().min(0).max(30).default(0);

const schemas = {
  search_products: z.object({ query: z.string().trim().min(1).max(60) }),
  list_reorder_recommendations: z.object({ limit: limitSchema }),
  get_product_insight: z.object({ product_code: codeSchema }),
  explain_stockout_risk: z.object({ product_code: codeSchema }),
  list_alerts: z.object({ priority: z.enum(["Critical", "High", "Medium", "Low"]).optional(), limit: limitSchema }),
  get_supplier_risk: z.object({}),
  list_overstocked: z.object({ min_days_of_cover: z.coerce.number().min(30).max(365).default(90), limit: limitSchema }),
  simulate_product: z.object({
    product_code: codeSchema,
    demand_pct: pctSchema,
    extra_delay_days: delaySchema,
    stock: z.coerce.number().min(0).max(1000000).optional(),
    order_qty: z.coerce.number().min(0).max(1000000).default(0),
  }),
  simulate_all: z.object({ demand_pct: pctSchema, extra_delay_days: delaySchema }),
  get_model_performance: z.object({}),
};

// ---------------------------------------------------------------- helpers

async function storedInsights() {
  const docs = await Insight.find().lean();
  if (!docs.length) {
    throw new AppError("No insights have been computed yet. An admin or manager must click 'Refresh insights' on the Dashboard.", 409);
  }
  const computedAt = docs.reduce((m, d) => (d.computedAt > m ? d.computedAt : m), docs[0].computedAt);
  return { docs, meta: { as_of: docs[0].data?.as_of ?? null, computed_at: computedAt } };
}

const row = (d) => ({
  code: d.productCode,
  name: d.data?.name,
  priority: d.priority,
  health_score: round(d.healthScore, 0),
  health_status: d.healthStatus,
  risk_pct: round(d.riskPct, 0),
  days_of_cover: round(d.daysOfCover),
  order_qty: d.orderQty,
  abc_xyz: d.data?.classification?.abc_xyz,
  supplier_id: d.data?.reorder?.supplier_id,
});

async function findProduct(codeInput) {
  const product = await Product.findOne({ code: upper(codeInput) });
  if (!product) throw new AppError(`Unknown product '${codeInput}'. Use search_products to find the right code.`, 404);
  return product;
}

function compactInsight(d, computedAt) {
  return {
    product: `${d.product_id} ${d.name}`,
    as_of: d.as_of,
    computed_at: computedAt,
    priority: d.priority,
    health: d.health,
    stock: d.inputs,
    stockout: d.stockout,
    risk: { risk_pct: d.risk?.risk_pct, risk_level: d.risk?.risk_level, flagged: d.risk?.flagged, signals: d.risk?.signals },
    forecast: {
      weeks: (d.forecast?.weeks || []).map((w) => ({ week_start: w.week_start, forecast: w.forecast, low: w.low, high: w.high })),
      lead_time_days: d.forecast?.lead_time_days,
      lead_time_demand: d.forecast?.lead_time_demand,
      lead_time_demand_high: d.forecast?.lead_time_demand_high,
    },
    reorder: d.reorder,
    trend: d.trend ? { pattern: d.trend.pattern, yoy_change_pct: d.trend.yoy_change_pct, seasonal: d.trend.seasonal, peak_month: d.trend.peak_month } : null,
    classification: d.classification,
    supplier: d.supplier,
    alerts: d.alerts,
  };
}

const pickScenario = (s) => ({
  priority: s.priority,
  risk_pct: s.risk_pct,
  risk_level: s.risk_level,
  days_of_cover: s.days_of_cover,
  days_to_delivery: s.days_to_delivery,
  margin_days: s.margin_days,
  expected_stockout_date: s.expected_stockout_date,
  units_short_30d: s.units_short_30d,
  health_score: s.health?.score,
  health_status: s.health?.status,
  suggested_order_qty: s.reorder?.order_qty,
});

// ---------------------------------------------------------------- tool handlers (read-only)

const handlers = {
  async search_products({ query }) {
    const find = (conds) => Product.find({ $or: conds }).limit(8).select("code name category").lean();
    const rx = new RegExp(escapeRegex(query), "i");
    let items = await find([{ name: rx }, { code: rx }, { sku: rx }, { category: rx }]);
    if (!items.length) {
      const tokens = query.split(/\s+/).filter((t) => t.length > 2);
      if (tokens.length) items = await find(tokens.map((t) => ({ name: new RegExp(escapeRegex(t), "i") })));
    }
    return { count: items.length, products: items.map((p) => ({ code: p.code, name: p.name, category: p.category })) };
  },

  async list_reorder_recommendations({ limit }) {
    const { docs, meta } = await storedInsights();
    const rows = docs.filter((d) => d.orderQty > 0).sort(sortUrgent);
    return { ...meta, total_needing_order: rows.length, total_units: rows.reduce((s, d) => s + d.orderQty, 0), products: rows.slice(0, limit).map(row) };
  },

  async get_product_insight({ product_code }) {
    const doc = await computeAndStore(await findProduct(product_code));
    return compactInsight(doc.data, doc.computedAt);
  },

  async explain_stockout_risk({ product_code }) {
    const product = await findProduct(product_code);
    const inv = await Inventory.findOne({ product: product._id });
    const body = { product_id: product.code };
    if (inv) body.stock = inv.currentStock;
    const e = await mlService.explain(body);
    return {
      product: `${e.product_id} ${e.name}`,
      as_of: e.as_of,
      risk_pct: e.risk_pct,
      risk_level: e.risk_level,
      summary: e.summary,
      method: e.method,
      factors: (e.factors || []).map((f) => ({ factor: f.label, direction: f.direction, share_pct: f.share_pct, reason: f.reason })),
      note: e.note,
    };
  },

  async list_alerts({ priority, limit }) {
    const { docs, meta } = await storedInsights();
    const alerts = docs
      .flatMap((d) => (d.data?.alerts || []).map((a) => ({ code: d.productCode, name: d.data?.name, ...a })))
      .filter((a) => !priority || a.priority === priority)
      .sort((a, b) => RANK[a.priority] - RANK[b.priority]);
    return { ...meta, total: alerts.length, alerts: alerts.slice(0, limit) };
  },

  async get_supplier_risk() {
    const [rows, suppliers] = await Promise.all([mlService.supplierRisk(), Supplier.find().select("code name city").lean()]);
    const byCode = Object.fromEntries(suppliers.map((s) => [s.code, s]));
    const out = rows.map((r) => {
      const clean = Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === "number" ? round(v, 2) : v]));
      return { ...clean, name: byCode[r.supplier_id]?.name, city: byCode[r.supplier_id]?.city };
    });
    return { count: out.length, note: "Sorted least reliable first. Delays are in days.", suppliers: out };
  },

  async list_overstocked({ min_days_of_cover, limit }) {
    const { docs, meta } = await storedInsights();
    const rows = docs
      .filter((d) => d.daysOfCover != null && d.daysOfCover >= min_days_of_cover)
      .sort((a, b) => b.daysOfCover - a.daysOfCover);
    return {
      ...meta,
      threshold_days_of_cover: min_days_of_cover,
      total: rows.length,
      products: rows.slice(0, limit).map((d) => ({ ...row(d), stock: d.data?.inputs?.stock, trend: d.data?.trend?.pattern })),
    };
  },

  async simulate_product({ product_code, demand_pct, extra_delay_days, stock, order_qty }) {
    const product = await findProduct(product_code);
    const inv = await Inventory.findOne({ product: product._id });
    const body = { product_id: product.code, demand_pct, extra_delay_days, order_qty };
    if (inv) {
      body.base_stock = inv.currentStock;
      body.base_on_order = inv.inTransitQty;
    }
    if (stock !== undefined) body.stock = stock;
    const r = await mlService.simulate(body);
    return {
      product: `${r.product_id} ${r.name}`,
      as_of: r.as_of,
      scenario: r.scenario,
      summary: r.summary,
      before: pickScenario(r.before),
      after: pickScenario(r.after),
      assumptions: r.assumptions,
    };
  },

  async simulate_all({ demand_pct, extra_delay_days }) {
    const invs = await Inventory.find().populate("product", "code").lean();
    const live = {};
    invs.forEach((i) => {
      if (i.product?.code) live[i.product.code] = { stock: i.currentStock, on_order: i.inTransitQty };
    });
    const r = await mlService.simulateAll({ demand_pct, extra_delay_days, live });
    return { scenario: r.scenario, summary: r.summary, most_affected_products: r.products.slice(0, 15) };
  },

  async get_model_performance() {
    const p = await mlService.performance();
    const forecast = Object.entries(p.forecast?.results || {}).map(([h, r]) => ({
      horizon_weeks: Number(h),
      model: r.selected_model,
      wape_pct: r.test?.model?.wape,
      mape_pct: r.test?.model?.mape,
      mae: r.test?.model?.mae,
      rmse: r.test?.model?.rmse,
      baseline_4week_average_wape_pct: r.test?.ma4?.wape,
      interval_80_coverage_pct: r.interval_80_coverage_pct,
    }));
    const risk = p.risk
      ? {
          model: p.risk.selected_model,
          precision: p.risk.test?.at_threshold?.precision,
          recall: p.risk.test?.at_threshold?.recall,
          f1: p.risk.test?.at_threshold?.f1,
          roc_auc: p.risk.test?.roc_auc,
          simple_rule_f1: p.risk.rule_baseline_stock_ratio_lt_1?.f1,
        }
      : null;
    return {
      note: "Measured on held-out data (last 6 months, time-based split) of the synthetic dataset.",
      forecast,
      stockout_risk: risk,
      anomaly_detection: p.anomaly?.results
        ? { sales_f1: p.anomaly.results.sales?.isolation_forest?.f1, stock_f1: p.anomaly.results.stock?.isolation_forest?.f1 }
        : null,
      missing_metrics: p.missing,
    };
  },
};

// ---------------------------------------------------------------- entry point

const clip = (text) => (text.length > MAX_RESULT_CHARS ? `${text.slice(0, MAX_RESULT_CHARS)} ...[truncated]` : text);

export async function runTool(name, input) {
  const schema = schemas[name];
  if (!schema) return { error: true, text: JSON.stringify({ error: `Unknown tool ${name}` }) };
  const parsed = schema.safeParse(input ?? {});
  if (!parsed.success) {
    const why = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return { error: true, text: JSON.stringify({ error: `Invalid input: ${why}` }) };
  }
  try {
    return { error: false, text: clip(JSON.stringify(await handlers[name](parsed.data))) };
  } catch (e) {
    if (!(e instanceof AppError)) console.error(`Tool ${name} failed`, e);
    return { error: true, text: JSON.stringify({ error: e instanceof AppError ? e.message : "The lookup failed." }) };
  }
}