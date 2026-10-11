# Running Notes (decisions and formulas for the report)

## Day 1
- Monorepo: client (Vite+React), server (Express+Mongoose, ES modules), ml-service (FastAPI)
- Ports: client 5173, server 5000, ml-service 8000
- Each service exposes /health (server at /api/health)
- Secrets live in .env (git-ignored); .env.example committed

## Day 2: Data models and synthetic dataset
- Dataset: 40 products / 6 categories, 8 suppliers, 730 days of sales (29,200 rows), 398 purchase orders. Seed 42.
- Demand: daily = base x trend x seasonality x weekday x promo x noise (gamma noise; low/medium/high = X/Y/Z).
- ABC: rank by revenue, class A while cumulative share before the product < 70%, B < 90%, else C.
  Result: 9 A (71%), 12 B (19%), 19 C (10%). A has 9 products (not 8) so every ABC-XYZ cell can hold 3+.
- XYZ: coefficient of variation of daily units: X < 0.5, Y 0.5-1.0, Z > 1.0.
- Supplier delay: delay_days = actual - expected delivery; negative = early; on-time means delay <= 0.
- Stock history is built backwards from the current snapshot, so history and today's stock always agree.
  Sales are uncensored demand (no lost-sales effect).
- "Demand 85" for USB Hub and "120" for Keyboard are read as demand over the lead time (~17 and ~20 per day).
- Provisional rules in scenario_labels.csv (final versions on Days 8-9):
  stock_ratio = stock / (lead-time demand + safety stock); safety stock = 1.65 * sigma * sqrt(lead time);
  alert margin = days of cover - days to delivery (< 0 Critical, < 5 High, < 15 Medium, else Low);
  health = 0.65 cover + 0.15 supplier + 0.10 turnover + 0.10 stability (< 40 Critical, < 70 Warning).
- Stockout label (Day 7): stock < lead-time demand + safety stock; about 15.8% of rows.
- Anomalies: ~2.5% of sales rows (3-5x spikes, zero-sales days), ~1% stock count mismatches, one 17-day supplier delay.
  is_anomaly is only for evaluating Isolation Forest, never a model feature.
- scenario_labels.csv is for validation only, never a model input.
- ML service reads the CSVs directly; MongoDB holds the operational data for the app.
- Baseline weekly MAPE (4-week moving average) is about 29%, so the trained model has room to improve.