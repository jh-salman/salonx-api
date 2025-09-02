import { Router } from "express";
import { auth, requireRoles } from "../../middleware/auth.js";

export const router: import("express").Router = Router();

router.get("/ping", auth(true), requireRoles("admin"), (_req, res) => {
  res.json({ ok: true });
});
