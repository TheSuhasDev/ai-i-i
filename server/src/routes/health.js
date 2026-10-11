import { Router } from "express";
import mongoose from "mongoose";

const router = Router();

router.get("/health", (req, res) => {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  res.json({
    status: "ok",
    service: "server",
    database: states[mongoose.connection.readyState],
    timestamp: new Date().toISOString(),
  });
});

export default router;