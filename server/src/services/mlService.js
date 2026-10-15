import AppError from "../utils/AppError.js";

const DEFAULT_TIMEOUT_MS = 20000;
const PASS_THROUGH = new Set([404, 422, 503]);

async function call(path, { method = "GET", body, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const base = process.env.ML_SERVICE_URL || "http://localhost:8000";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const detail = typeof data?.detail === "string" ? data.detail : `ML service returned ${res.status}`;
      throw new AppError(detail, PASS_THROUGH.has(res.status) ? res.status : 502);
    }
    return data;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(err.name === "AbortError" ? "ML service timed out" : "ML service is unreachable", 503);
  } finally {
    clearTimeout(timer);
  }
}

const mlService = {
  health: () => call("/health"),
  forecast: (body) => call("/forecast", { method: "POST", body }),
  risk: (body) => call("/risk", { method: "POST", body }),
  trend: (body) => call("/trend", { method: "POST", body }),
  insights: (body) => call("/insights", { method: "POST", body }),
  supplierRisk: () => call("/supplier-risk"),
  explain: (body) => call("/explain", { method: "POST", body }),
  anomalies: (params = {}) => call(`/anomalies?${new URLSearchParams(params)}`),
  simulate: (body) => call("/simulate", { method: "POST", body }),
  simulateAll: (body) => call("/simulate/all", { method: "POST", body, timeoutMs: 90000 }),
  performance: () => call("/model-performance"),
};

export default mlService;