import { Router } from "express";
import { auth } from "../../middleware/auth.js";

export const router: import("express").Router = Router();

router.use(auth(true));

router.get("/", (_req, res) => {
  res.json({ ok: true, module: "subscriptions" });
});

export default router;
