import { Router } from "express";
import mongoose from "mongoose";

const router = Router();

router.get("/health", async (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  let mlStatus = "down";
  try {
    const mlUrl = process.env.ML_SERVICE_URL || "http://localhost:8000";
    const mlRes = await fetch(`${mlUrl}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    if (mlRes.ok) {
      const mlData = await mlRes.json();
      if (mlData.status === "ok") {
        mlStatus = "operational";
      }
    }
  } catch {
    mlStatus = "down";
  }

  res.json({
    status: "ok",
    service: "server",
    timestamp: new Date().toISOString(),
    services: {
      backend: "operational",
      database: dbConnected ? "operational" : "down",
      ml: mlStatus,
    },
    database: dbConnected ? "connected" : "disconnected",
  });
});

export default router;