import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { connectDB } from "./config/db.js";
import healthRoutes from "./routes/health.js";
import authRoutes from "./routes/auth.js";
import supplierRoutes from "./routes/suppliers.js";
import productRoutes from "./routes/products.js";
import inventoryRoutes from "./routes/inventory.js";
import saleRoutes from "./routes/sales.js";
import purchaseOrderRoutes from "./routes/purchaseOrders.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import insightsRoutes from "./routes/insights.js";
import supplierRiskRoutes from "./routes/supplierRisk.js";
import anomalyRoutes from "./routes/anomalies.js";
import simulatorRoutes from "./routes/simulator.js";
import assistantRoutes from "./routes/assistant.js";
import mlPerformanceRoutes from "./routes/mlPerformance.js";
import auditLogRoutes from "./routes/auditLogs.js";

const app = express();

app.use(helmet());

const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  process.env.CLIENT_URL,
].filter(Boolean));

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.use("/api", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/products", productRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/purchase-orders", purchaseOrderRoutes);
app.use("/api/insights", insightsRoutes);
app.use("/api/supplier-risk", supplierRiskRoutes);
app.use("/api/anomalies", anomalyRoutes);
app.use("/api/simulator", simulatorRoutes);
app.use("/api/assistant", assistantRoutes);
app.use("/api/ml-performance", mlPerformanceRoutes);
app.use("/api/audit-logs", auditLogRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const jwtSecret = String(process.env.JWT_SECRET || "").trim();
const knownJwtPlaceholders = new Set([
  "secret",
  "changeme",
  "your_jwt_secret",
  "change_me_to_a_long_random_string",
]);

if (jwtSecret.length < 32 || knownJwtPlaceholders.has(jwtSecret.toLowerCase())) {
  console.error("JWT_SECRET must be at least 32 characters and must not be a known placeholder");
  process.exit(1);
}

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
