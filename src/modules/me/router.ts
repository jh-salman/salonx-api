import { Router } from "express";
import { auth } from "../../middleware/auth.js";
import { db } from "../../db/index.js";
import { memberships } from "../../db/schema.js";
import { eq } from "drizzle-orm";

export const router: import("express").Router = Router();

router.get("/", auth(true), async (req, res, _next) => {
  const user = (req as any).user as { id: string; role?: string } | undefined;
  if (!user?.id) return res.status(200).json({ user: null, memberships: [] });
  try {
    const mems = await db.query.memberships.findMany({
      where: eq(memberships.userId, user.id)
    });
    return res.json({ user, memberships: mems });
  } catch {
    return res.json({ user, memberships: [] });
  }
});
