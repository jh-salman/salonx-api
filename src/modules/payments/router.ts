import { Router } from "express";
import { z } from "zod";
import { auth } from "../../middleware/auth.js";
import { env } from "../../config/index.js";
import { stripe } from "../../clients/stripe.js";
import { db } from "../../db/index.js";
import { services } from "../../db/schema.js";
import { and, eq, inArray } from "drizzle-orm";

export const router: import("express").Router = Router();

router.use(auth(true));

const quoteSchema = z.object({
  tenantId: z.string().uuid(),
  items: z.array(z.object({ serviceId: z.string().uuid(), qty: z.number().int().positive().default(1) })).min(1)
});

const paySchema = z.object({
  tenantId: z.string().uuid(),
  orderId: z.string().uuid().optional(),
  items: z.array(z.object({ serviceId: z.string().uuid(), qty: z.number().int().positive().default(1) })).min(1).optional(),
  currency: z.string().default("usd")
});

const confirmSchema = z.object({
  tenantId: z.string().uuid(),
  paymentRef: z.string().min(1)
});

router.post("/booking/quote", async (req, res, next) => {
  try {
    const body = quoteSchema.parse(req.body);
    const svcIds = body.items.map(i => i.serviceId);
    const svcRows = await db
      .select({ id: services.id, priceCents: services.priceCents })
      .from(services)
      .where(and(eq(services.tenantId, body.tenantId), inArray(services.id, svcIds)));
    const priceMap = new Map<string, number>(svcRows.map(r => [r.id, r.priceCents]));
    let subtotalCents = 0;
    for (const it of body.items) {
      const price = priceMap.get(it.serviceId) ?? 0;
      subtotalCents += price * (it.qty ?? 1);
    }
    const taxesCents = Math.round(subtotalCents * 0.0);
    const totalCents = subtotalCents + taxesCents;
    res.json({ subtotalCents, taxesCents, totalCents, currency: "usd" });
  } catch (err) {
    next(err);
  }
});

router.post("/booking/pay", async (req, res, next) => {
  try {
    if (!env.useRealPayments || !stripe) {
      return res.status(501).json({ error: { code: "feature_disabled", message: "Payments are disabled in this environment" } });
    }
    const idempotencyKey = req.header("Idempotency-Key") || undefined;
    const body = paySchema.parse(req.body);

    let amountCents = 0;
    if (body.items && body.items.length > 0) {
      const svcIds = body.items.map(i => i.serviceId);
      const svcRows = await db
        .select({ id: services.id, priceCents: services.priceCents })
        .from(services)
        .where(and(eq(services.tenantId, body.tenantId), inArray(services.id, svcIds)));
      const priceMap = new Map<string, number>(svcRows.map(r => [r.id, r.priceCents]));
      for (const it of body.items) {
        amountCents += (priceMap.get(it.serviceId) ?? 0) * (it.qty ?? 1);
      }
    } else {
      return res.status(400).json({ error: { code: "bad_request", message: "items required for payment in this flow" } });
    }

    const pi = await stripe.paymentIntents.create(
      {
        amount: amountCents,
        currency: body.currency,
        automatic_payment_methods: { enabled: true },
        metadata: { tenantId: body.tenantId }
      },
      idempotencyKey ? { idempotencyKey } : undefined
    );

    res.status(201).json({ clientSecret: pi.client_secret, paymentIntentId: pi.id });
  } catch (err) {
    next(err);
  }
});

router.post("/booking/confirm", async (req, res, next) => {
  try {
    if (!env.useRealPayments || !stripe) {
      return res.status(501).json({ error: { code: "feature_disabled", message: "Payments are disabled in this environment" } });
    }
    const idempotencyKey = req.header("Idempotency-Key") || undefined;
    const body = confirmSchema.parse(req.body);

    const pi = await stripe.paymentIntents.retrieve(body.paymentRef, { expand: ["charges"] });
    if (pi.status !== "succeeded") {
      return res.status(400).json({ error: { code: "not_paid", message: "Payment not completed" } });
    }

    res.json({ ok: true, paymentIntentId: pi.id, status: pi.status });
  } catch (err) {
    next(err);
  }
});

export default router;
