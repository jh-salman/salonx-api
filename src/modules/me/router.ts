import { Router } from "express";
import { auth } from "../../middleware/auth.js";
import { db } from "../../db/index.js";
import { memberships } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { issueAccessToken } from "../../auth/jwt.js";

export const router: import("express").Router = Router();

router.get("/", auth(true), async (req, res, _next) => {
  const user = (req as any).user as { id: string; role?: string; tenantId?: string | null } | undefined;
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

router.post("/tenants/switch", auth(true), async (req, res, next) => {
  try {
    const user = (req as any).user as { id: string; role?: string } | undefined;
    const body = z.object({ tenantId: z.string().uuid() }).parse(req.body);
    const mem = await db.query.memberships.findFirst({
      where: eq(memberships.userId, user!.id)
    });
    if (!mem) return res.status(403).json({ error: { code: "forbidden", message: "No membership in tenant" } });
    const access = issueAccessToken({ sub: user!.id, role: mem.role as any, tenantId: body.tenantId });
    res.json({ access });
  } catch (err) {
    next(err);
  }
});
