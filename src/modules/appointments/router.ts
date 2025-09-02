import { Router } from "express";
import { z } from "zod";
import { auth, requireRoles } from "../../middleware/auth.js";
import { db } from "../../db/index.js";
import { appointments, services, clients as clientsTable } from "../../db/schema.js";
import { and, eq, gte, lte, lt, gt, sql } from "drizzle-orm";
import { getRedis } from "../../redis/index.js";
import { Roles } from "../../auth/rbac.js";

export const router: import("express").Router = Router();

router.use(auth(true));

const availabilityQuery = z.object({
  tenantId: z.string().uuid(),
  date: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/),
  serviceId: z.string().uuid(),
  providerId: z.string().uuid().optional()
});

const holdCreateSchema = z.object({
  tenantId: z.string().uuid(),
  startAt: z.string().datetime(),
  serviceId: z.string().uuid(),
  providerId: z.string().uuid().optional(),
  clientRef: z.string().optional()
});

const createApptSchema = z.object({
  tenantId: z.string().uuid(),
  clientId: z.string().uuid(),
  serviceId: z.string().uuid(),
  providerId: z.string().uuid().optional(),
  startAt: z.string().datetime()
});

function dateToIsoMinute(d: Date) {
  d.setSeconds(0, 0);
  return d.toISOString();
}

router.get("/availability", async (req, res, next) => {
  try {
    const q = availabilityQuery.parse({
      tenantId: (req as any).tenantId || (req.query.tenantId as string),
      date: req.query.date,
      serviceId: req.query.serviceId,
      providerId: req.query.providerId
    });

    const svc = await db.query.services.findFirst({
      where: and(eq(services.id, q.serviceId), eq(services.tenantId, q.tenantId)),
      columns: { durationMin: true }
    });
    if (!svc) return res.status(404).json({ error: { code: "not_found", message: "service not found" } });

    const startDay = new Date(`${q.date}T00:00:00.000Z`);
    const endDay = new Date(`${q.date}T23:59:59.999Z`);

    const existing = await db
      .select({
        startAt: appointments.startAt,
        endAt: appointments.endAt,
        providerId: appointments.providerId
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.tenantId, q.tenantId),
          gte(appointments.startAt, startDay),
          lte(appointments.endAt, endDay),
          q.providerId ? eq(appointments.providerId, q.providerId) : sql`true`
        )
      );

    const businessStart = new Date(`${q.date}T09:00:00.000Z`);
    const businessEnd = new Date(`${q.date}T17:00:00.000Z`);
    const stepMin = svc.durationMin;
    const holds = await readHoldsForDay(q.tenantId, q.providerId || "any", q.date);

    const slots: { start: string; end: string; status: "free" | "busy" | "hold" }[] = [];
    for (let t = new Date(businessStart); t < businessEnd; t = new Date(t.getTime() + stepMin * 60000)) {
      const start = new Date(t);
      const end = new Date(t.getTime() + stepMin * 60000);
      const overlapsAppt = existing.some(
        (a) => !(end <= a.startAt || start >= a.endAt)
      );
      const key = slotKey(q.tenantId, q.providerId || "any", start.toISOString(), end.toISOString());
      const isHeld = holds.has(key);
      slots.push({
        start: dateToIsoMinute(start),
        end: dateToIsoMinute(end),
        status: overlapsAppt ? "busy" : isHeld ? "hold" : "free"
      });
    }

    res.json({ date: q.date, serviceId: q.serviceId, providerId: q.providerId, slots });
  } catch (err) {
    next(err);
  }
});

router.post("/hold", async (req, res, next) => {
  try {
    const body = holdCreateSchema.parse(req.body);
    const svc = await db.query.services.findFirst({
      where: and(eq(services.id, body.serviceId), eq(services.tenantId, body.tenantId)),
      columns: { durationMin: true }
    });
    if (!svc) return res.status(404).json({ error: { code: "not_found", message: "service not found" } });

    const start = new Date(body.startAt);
    const end = new Date(start.getTime() + svc.durationMin * 60000);
    const prov = body.providerId || "any";

    const lockId = `lock:${body.tenantId}:${prov}:${start.toISOString()}:${end.toISOString()}`;
    const holdId = `hold:${body.tenantId}:${prov}:${start.toISOString()}:${end.toISOString()}`;
    const redis = getRedis();
    if (!redis) return res.status(503).json({ error: { code: "unavailable", message: "cache unavailable" } });

    const ok = await redis.set(lockId, "1", "PX", 10_000, "NX");
    if (!ok) return res.status(409).json({ error: { code: "conflict", message: "slot is locked" } });

    try {
      const overlap = await db
        .select({ id: appointments.id })
        .from(appointments)
        .where(
          and(
            eq(appointments.tenantId, body.tenantId),
            lt(appointments.startAt, end),
            gt(appointments.endAt, start),
            body.providerId ? eq(appointments.providerId, body.providerId) : sql`true`
          )
        );
      if (overlap.length > 0) {
        return res.status(409).json({ error: { code: "conflict", message: "slot already booked" } });
      }
      await redis.set(holdId, JSON.stringify({ serviceId: body.serviceId, clientRef: body.clientRef || null }), "EX", 180);
      res.status(201).json({ holdId, expiresInSec: 180 });
    } finally {
      await redis.del(lockId);
    }
  } catch (err) {
    next(err);
  }
});

router.delete("/hold/:id", async (req, res, next) => {
  try {
    const redis = getRedis();
    if (!redis) return res.status(503).json({ error: { code: "unavailable", message: "cache unavailable" } });
    await redis.del(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const tenantId = (req as any).tenantId || (req.query.tenantId as string);
    if (!tenantId) return res.status(400).json({ error: { code: "bad_request", message: "tenantId required" } });
    const rows = await db.select().from(appointments).where(eq(appointments.tenantId, tenantId));
    res.json({ items: rows });
  } catch (err) {
    next(err);
  }
});

router.post("/", requireRoles(Roles.Owner, Roles.Admin, Roles.Staff), async (req, res, next) => {
  try {
    const body = createApptSchema.parse(req.body);
    const svc = await db.query.services.findFirst({
      where: and(eq(services.id, body.serviceId), eq(services.tenantId, body.tenantId)),
      columns: { durationMin: true }
    });
    if (!svc) return res.status(404).json({ error: { code: "not_found", message: "service not found" } });

    const client = await db.query.clients.findFirst({
      where: and(eq(clientsTable.id, body.clientId), eq(clientsTable.tenantId, body.tenantId)),
      columns: { id: true }
    });
    if (!client) return res.status(404).json({ error: { code: "not_found", message: "client not found" } });

    const start = new Date(body.startAt);
    const end = new Date(start.getTime() + svc.durationMin * 60000);
    const prov = body.providerId || "any";
    const lockId = `lock:${body.tenantId}:${prov}:${start.toISOString()}:${end.toISOString()}`;
    const redis = getRedis();
    if (!redis) return res.status(503).json({ error: { code: "unavailable", message: "cache unavailable" } });

    const ok = await redis.set(lockId, "1", "PX", 10_000, "NX");
    if (!ok) return res.status(409).json({ error: { code: "conflict", message: "slot is locked" } });

    try {
      const overlap = await db
        .select({ id: appointments.id })
        .from(appointments)
        .where(
          and(
            eq(appointments.tenantId, body.tenantId),
            lt(appointments.startAt, end),
            gt(appointments.endAt, start),
            body.providerId ? eq(appointments.providerId, body.providerId) : sql`true`
          )
        );

      if (overlap.length > 0) {
        return res.status(409).json({ error: { code: "conflict", message: "slot already booked" } });
      }

      const [row] = await db
        .insert(appointments)
        .values({
          tenantId: body.tenantId,
          clientId: body.clientId,
          serviceId: body.serviceId,
          providerId: body.providerId || null,
          startAt: start,
          endAt: end,
          status: "scheduled"
        })
        .returning({ id: appointments.id });

      res.status(201).json({ id: row.id });
    } finally {
      await redis.del(lockId);
    }
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", requireRoles(Roles.Owner, Roles.Admin, Roles.Staff), async (req, res, next) => {
  try {
    const tenantId = (req as any).tenantId || (req.query.tenantId as string);
    if (!tenantId) return res.status(400).json({ error: { code: "bad_request", message: "tenantId required" } });
    const id = req.params.id;
    await db.delete(appointments).where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)));
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

function slotKey(tenantId: string, providerId: string, startIso: string, endIso: string) {
  return `hold:${tenantId}:${providerId}:${startIso}:${endIso}`;
}

async function readHoldsForDay(tenantId: string, providerId: string, date: string) {
  const redis = getRedis();
  const res = new Set<string>();
  if (!redis) return res;
  const prefix = `hold:${tenantId}:${providerId}:`;
  const start = `${date}T00:00:00.000Z`;
  const end = `${date}T23:59:59.999Z`;
  const keys = await redis.keys(`${prefix}*`);
  for (const k of keys) {
    const parts = k.split(":");
    const startIso = parts[3];
    if (startIso >= start && startIso <= end) {
      res.add(k);
    }
  }
  return res;
}

export default router;
