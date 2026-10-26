import api from "./api";

const clean = (params) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v !== undefined && v !== null));

const make = (path) => ({
  list: (params = {}) => api.get(path, { params: clean(params) }),
  get: (id) => api.get(`${path}/${id}`),
  create: (body) => api.post(path, body),
  update: (id, body) => api.put(`${path}/${id}`, body),
  remove: (id) => api.delete(`${path}/${id}`),
});

export const productService = make("/products");
export const supplierService = {
  ...make("/suppliers"),
  deliveries: (id, params = {}) => api.get(`/suppliers/${id}/deliveries`, { params: clean(params) }),
};
export const purchaseOrderService = {
  ...make("/purchase-orders"),
  cancel: (id) => api.patch(`/purchase-orders/${id}/cancel`),
};
export const inventoryService = make("/inventory");
export const saleService = make("/sales");

export const insightService = {
  list: (params = {}) => api.get("/insights", { params }),
  get: (code) => api.get(`/insights/${code}`),
  history: (code, weeks = 52) => api.get(`/insights/${code}/history`, { params: { weeks } }),
  refresh: () => api.post("/insights/refresh"),
  supplierRisk: () => api.get("/supplier-risk"),
  explain: (code) => api.get(`/insights/${code}/explain`),
};

export const anomalyService = {
  list: (params = {}) => api.get("/anomalies", { params }),
};

export const simulatorService = {
  run: (body) => api.post("/simulator", body),
};

export const performanceService = {
  get: () => api.get("/ml-performance"),
};

export const assistantService = {
  status: () => api.get("/assistant/status"),
  ask: (messages) => api.post("/assistant", { messages }, { timeout: 120000 }),
};

export const authService = {
  login: (email, password) => api.post("/auth/login", { email, password }),
  me: () => api.get("/auth/me"),
};