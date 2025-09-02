import { Router } from "express";
import { z } from "zod";
import { auth, requireRoles } from "../../middleware/auth.js";
import { db } from "../../db/index.js";
import { services, serviceCategories, servicePolicies } from "../../db/schema.js";
import { and, eq } from "drizzle-orm";
import { Roles } from "../../auth/rbac.js";

export const router: import("express").Router = Router();

router.use(auth(true));

const baseSchema = z.object({
  tenantId: z.string().uuid(),
  categoryId: z.string().uuid(),
  name: z.string().min(2),
  description: z.string().optional(),
  durationMin: z.number().int().positive(),
  priceCents: z.number().int().nonnegative()
});

router.get("/", async (req, res, next) => {
  try {
    const tenantId = (req as any).user?.tenantId || (req.query.tenantId as string | undefined);
    if (!tenantId) return res.status(400).json({ error: { code: "bad_request", message: "tenantId required" } });
    const rows = await db.select().from(services).where(eq(services.tenantId, tenantId));
    res.json({ items: rows });
  } catch (err) {
    next(err);
  }
});

router.post("/", requireRoles(Roles.Owner, Roles.Admin), async (req, res, next) => {
  try {
    const body = baseSchema.parse(req.body);
    const [row] = await db
      .insert(services)
      .values({
        tenantId: body.tenantId,
        categoryId: body.categoryId,
        name: body.name,
        description: body.description,
        durationMin: body.durationMin,
        priceCents: body.priceCents
      })
      .returning({ id: services.id });
    res.status(201).json({ id: row.id });
  } catch (err) {
    next(err);
  }
});

router.put("/:id", requireRoles(Roles.Owner, Roles.Admin), async (req, res, next) => {
  try {
    const id = req.params.id;
    const partial = baseSchema.partial().parse(req.body);
    if (!partial.tenantId) return res.status(400).json({ error: { code: "bad_request", message: "tenantId required" } });
    await db.update(services).set(partial as any).where(and(eq(services.id, id), eq(services.tenantId, partial.tenantId)));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", requireRoles(Roles.Owner, Roles.Admin), async (req, res, next) => {
  try {
    const id = req.params.id;
    const tenantId = z.string().uuid().parse(req.query.tenantId);
    await db.delete(services).where(and(eq(services.id, id), eq(services.tenantId, tenantId)));
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

const policySchema = z.object({
  tenantId: z.string().uuid(),
  serviceId: z.string().uuid(),
  depositRequired: z.boolean(),
  depositAmountCents: z.number().int().nonnegative()
});

router.get("/policies", async (req, res, next) => {
  try {
    const tenantId = z.string().uuid().parse(req.query.tenantId);
    const rows = await db.select().from(servicePolicies).where(eq(servicePolicies.tenantId, tenantId));
    res.json({ items: rows });
  } catch (err) {
    next(err);
  }
});

router.post("/policies", requireRoles(Roles.Owner, Roles.Admin), async (req, res, next) => {
  try {
    const body = policySchema.parse(req.body);
    const [row] = await db
      .insert(servicePolicies)
      .values(body)
      .onConflictDoUpdate({
        target: [servicePolicies.tenantId, servicePolicies.serviceId] as any,
        set: {
          depositRequired: (servicePolicies.depositRequired as any),
          depositAmountCents: (servicePolicies.depositAmountCents as any)
        }
      })
      .returning({ id: servicePolicies.id });
    res.status(201).json({ id: row.id });
  } catch (err) {
    next(err);
  }
});

router.get("/categories", async (req, res, next) => {
  try {
    const tenantId = z.string().uuid().parse(req.query.tenantId);
    const rows = await db.select().from(serviceCategories).where(eq(serviceCategories.tenantId, tenantId));
    res.json({ items: rows });
  } catch (err) {
    next(err);
  }
});

export default router;
