import { Router } from "express";
import { env } from "../../config/index.js";

export const router: import("express").Router = Router();

router.post("/stripe", (req, res) => {
  const sig = req.headers["stripe-signature"];
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return res.status(202).json({ ok: true });
  }
  if (!sig) {
    return res.status(400).json({ error: { code: "bad_request", message: "Missing signature" } });
  }
  res.status(200).json({ ok: true });
});

export default router;
