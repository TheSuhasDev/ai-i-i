export const SEMANTIC_COLORS = {
  danger: "var(--danger, #ef4444)",
  warning: "var(--warning, #f59e0b)",
  success: "var(--success, #10b981)",
  primary: "var(--chart-1, #818cf8)",
  secondary: "var(--chart-2, #34d399)",
  forecast: "var(--chart-3, #fbbf24)",
  muted: "var(--muted, #9ca3af)",
  subtle: "var(--subtle, #6f7787)",
  grid: "var(--chart-grid, #2b3140)",
  surface: "var(--surface, #11151e)",
  text: "var(--text, #f3f4f7)",
};

export const COLOR_HEX = {
  danger: "#ef4444",
  dangerSoft: "rgba(239, 68, 68, 0.15)",
  warning: "#f59e0b",
  warningSoft: "rgba(245, 158, 11, 0.15)",
  success: "#10b981",
  successSoft: "rgba(16, 185, 129, 0.15)",
  primary: "#818cf8",
  forecast: "#fbbf24",
  forecastSoft: "rgba(251, 191, 36, 0.18)",
  muted: "#9ca3af",
  grid: "#2b3140",
};

export const JARGON_DEFINITIONS = {
  "ABC-XYZ":
    "ABC categorises products by revenue value (A = top 80%, B = next 15%, C = bottom 5%). XYZ categorises demand predictability (X = steady, Y = variable, Z = erratic).",
  WAPE: "Weighted Absolute Percentage Error: overall forecast error as a percentage of total volume. Unlike MAPE, it cannot be distorted by low-demand weeks. Lower is better.",
  MAPE: "Mean Absolute Percentage Error: average percentage miss per week. It can look very high when sales numbers are small. Lower is better.",
  MAE: "Mean Absolute Error: average difference between forecasted and actual sales, measured in units per week. Lower is better.",
  RMSE: "Root Mean Squared Error: average forecast miss that penalises large forecasting errors more heavily than small ones. Lower is better.",
  F1: "F1 Score: a balanced metric from 0.0 to 1.0 combining accuracy in catching stockouts (recall) with avoiding false alarms (precision). Higher is better (1.0 is perfect).",
  "ROC-AUC":
    "Area Under the ROC Curve: measures how accurately the model ranks risky items above safe items (0.5 is random guessing, 1.0 is perfect).",
  "PR-AUC":
    "Precision-Recall AUC: model accuracy on rare events like stockouts. Useful when most items are healthy and stockouts are infrequent.",
  SHAP: "SHAP (SHapley Additive exPlanations): explainable AI values showing how much each inventory, demand, and supplier factor contributed to raising or lowering risk.",
  YoY: "Year over Year: compares current demand with the same time last year to show growth or decline without seasonal confusion.",
  "80% range":
    "80% Confidence Interval: the range where actual sales are expected to fall 8 out of 10 times. A wider band means higher demand uncertainty.",
  "Safety Stock":
    "Buffer inventory kept on hand to protect against unexpected demand surges or supplier shipping delays.",
  "Reorder Point":
    "Inventory threshold that triggers a purchase order so replenishment arrives before stock runs out.",
  "Lead Time":
    "Number of days between placing an order with a supplier and the shipment arriving in inventory.",
  "Stock Ratio":
    "Ratio of available stock to required replenishment inventory. A value below 1.0 means stock is short.",
  "Stockout Risk":
    "Risk reflects current stock and recent sales. Orders in transit are not included, so a new order changes the stockout date and units short, not this %.",
};

export const CHART_GRID_PROPS = {
  strokeDasharray: "3 3",
  stroke: "var(--chart-grid, #2b3140)",
  vertical: false,
};

export const X_AXIS_PROPS = {
  stroke: "var(--muted, #9ca3af)",
  tickLine: false,
  axisLine: { stroke: "var(--border, #252b39)" },
  tick: { fill: "var(--muted, #9ca3af)", fontSize: 12 },
};

export const Y_AXIS_PROPS = {
  stroke: "var(--muted, #9ca3af)",
  tickLine: false,
  axisLine: false,
  tick: { fill: "var(--muted, #9ca3af)", fontSize: 12 },
};
