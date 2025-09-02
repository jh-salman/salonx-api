import { Router } from "express";
import { env } from "../../config/index.js";

export const router: import("express").Router = Router();

router.use((req, res, next) => {
  if (!env.usePublicBooking) {
    return res.status(501).json({ error: { code: "feature_disabled", message: "Public booking is disabled in this environment" } });
  }
  next();
});

router.get("/services", (_req, res) => {
  res.json({ categories: [], services: [] });
});

router.get("/availability", (req, res) => {
  const { date, serviceId, providerId } = req.query as Record<string, string | undefined>;
  res.json({ date, serviceId, providerId, slots: [] });
});

router.get("/availability/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  res.write(`event: ping\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);
  req.on("close", () => {
    res.end();
  });
});

export default router;
