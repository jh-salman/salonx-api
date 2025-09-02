import { Router } from "express";

export const router: import("express").Router = Router();

router.get("/", (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});
