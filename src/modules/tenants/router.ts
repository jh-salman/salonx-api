import { Router } from "express";
import { z } from "zod";
import { auth, requireRoles } from "../../middleware/auth.js";
import { db } from "../../db/index.js";
import { tenants, brands, memberships, tenantDomains } from "../../db/schema.js";
import { eq, and } from "drizzle-orm";
import { Roles } from "../../auth/rbac.js";

export const router: import("express").Router = Router();

router.use(auth(true));

const tenantCreateSchema = z.object({
  name: z.string().min(2),
  brand: z.object({
    name: z.string().min(2),
    slug: z.string().min(2).regex(/^[a-z0-9-]+$/)
  }),
  domain: z.object({
    subdomain: z.string().min(2).regex(/^[a-z0-9-]+$/)
  }).optional()
});

router.get("/", async (req, res, next) => {
  try {
    const user = (req as any).user as { id: string };
    const rows = await db
      .select({
        tenantId: tenants.id,
        tenantName: tenants.name
      })
      .from(memberships)
      .leftJoin(tenants, eq(memberships.tenantId, tenants.id))
      .where(eq(memberships.userId, user.id));
    res.json({ items: rows });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const user = (req as any).user as { id: string };
    const body = tenantCreateSchema.parse(req.body);
    const [ten] = await db.insert(tenants).values({ name: body.name }).returning({ id: tenants.id });
    const tenantId = ten.id;
    await db.insert(brands).values({ tenantId, name: body.brand.name, slug: body.brand.slug });
    if (body.domain?.subdomain) {
      await db.insert(tenantDomains).values({ tenantId, subdomain: body.domain.subdomain, isPrimary: true });
    }
    await db.insert(memberships).values({ userId: user.id, tenantId, role: Roles.Owner, isDefault: true });
    res.status(201).json({ id: tenantId });
  } catch (err) {
    next(err);
  }
});

const brandSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/)
});

router.get("/:tenantId/brands", async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const items = await db.select().from(brands).where(eq(brands.tenantId, tenantId));
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

router.post("/:tenantId/brands", requireRoles(Roles.Owner, Roles.Admin), async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const body = brandSchema.parse(req.body);
    const [row] = await db.insert(brands).values({ tenantId, name: body.name, slug: body.slug }).returning({ id: brands.id });
    res.status(201).json({ id: row.id });
  } catch (err) {
    next(err);
  }
});

router.put("/:tenantId/brands/:id", requireRoles(Roles.Owner, Roles.Admin), async (req, res, next) => {
  try {
    const { tenantId, id } = req.params;
    const body = brandSchema.partial().parse(req.body);
    await db.update(brands).set(body).where(and(eq(brands.tenantId, tenantId), eq(brands.id, id)));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete("/:tenantId/brands/:id", requireRoles(Roles.Owner, Roles.Admin), async (req, res, next) => {
  try {
    const { tenantId, id } = req.params;
    await db.delete(brands).where(and(eq(brands.tenantId, tenantId), eq(brands.id, id)));
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

const inviteSchema = z.object({
  userId: z.string().uuid(),
  role: z.nativeEnum(Roles as any).or(z.enum([Roles.Owner, Roles.Admin, Roles.Staff, Roles.Unassigned] as any))
});

router.get("/:tenantId/memberships", async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const rows = await db.select().from(memberships).where(eq(memberships.tenantId, tenantId));
    res.json({ items: rows });
  } catch (err) {
    next(err);
  }
});

router.post("/:tenantId/memberships", requireRoles(Roles.Owner, Roles.Admin), async (req, res, next) => {
  try {
    const { tenantId } = req.params;
    const body = inviteSchema.parse(req.body);
    const [row] = await db
      .insert(memberships)
      .values({ userId: body.userId, tenantId, role: body.role, isDefault: false })
      .onConflictDoNothing()
      .returning({ id: memberships.id });
    res.status(201).json({ id: row?.id });
  } catch (err) {
    next(err);
  }
});

router.put("/:tenantId/memberships/:id", requireRoles(Roles.Owner, Roles.Admin), async (req, res, next) => {
  try {
    const { tenantId, id } = req.params;
    const body = z.object({ role: z.string().min(3) }).parse(req.body);
    await db.update(memberships).set({ role: body.role }).where(and(eq(memberships.tenantId, tenantId), eq(memberships.id, id)));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete("/:tenantId/memberships/:id", requireRoles(Roles.Owner, Roles.Admin), async (req, res, next) => {
  try {
    const { tenantId, id } = req.params;
    await db.delete(memberships).where(and(eq(memberships.tenantId, tenantId), eq(memberships.id, id)));
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
