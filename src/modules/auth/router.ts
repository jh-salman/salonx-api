import { Router, type Router as ExpressRouter } from "express";
import { z } from "zod";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { getRedis } from "../../redis/index.js";
import { twilio } from "../../clients/twilio.js";
import { issueTokenPair, verifyJwt, isRefreshValid, rotateRefreshToken } from "../../auth/jwt.js";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { env } from "../../config/index.js";

export const router: ExpressRouter = Router();

const sendOtpSchema = z.object({
  phone: z.string().min(7).max(20)
});

const verifyOtpSchema = z.object({
  phone: z.string().min(7).max(20),
  code: z.string().length(6).regex(/^\d{6}$/)
});

function normalizePhone(input: string) {
  const p = parsePhoneNumberFromString(input);
  if (p && p.isValid()) return p.number;
  return input;
}

async function storeOtp(phone: string, code: string, ttlSec = 300) {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(`otp:${phone}`, code, "EX", ttlSec);
}

async function readOtp(phone: string) {
  const redis = getRedis();
  if (!redis) return null;
  return redis.get(`otp:${phone}`);
}

router.post("/send-otp", async (req, res, next) => {
  try {
    const body = sendOtpSchema.parse(req.body);
    const phone = normalizePhone(body.phone);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await storeOtp(phone, code, 300);

    if (twilio && process.env.TWILIO_FROM_NUMBER) {
      try {
        await twilio.messages.create({
          to: phone,
          from: process.env.TWILIO_FROM_NUMBER,
          body: `Your SalonX code is ${code}`
        });
      } catch {
        void 0;
      }
    }

    res.status(202).json({ ok: true, code: env.NODE_ENV !== "production" ? code : undefined });
  } catch (err) {
    next(err);
  }
});

router.post("/verify-otp", async (req, res, next) => {
  try {
    const body = verifyOtpSchema.parse(req.body);
    const phone = normalizePhone(body.phone);
    const expected = await readOtp(phone);

    if (!expected || expected !== body.code) {
      return res.status(400).json({ error: { code: "invalid_code", message: "Invalid or expired code" } });
    }

    const found = await db.query.users.findFirst({ where: eq(users.phone, phone) });
    let userId = found?.id;
    if (!found) {
      const placeholderEmail = `phone_${Buffer.from(phone).toString("hex")}@local.salonx`;
      const inserted = await db
        .insert(users)
        .values({ email: placeholderEmail, phone, phoneVerified: true })
        .returning({ id: users.id });
      userId = inserted[0]?.id;
    } else if (!found.phoneVerified) {
      await db.update(users).set({ phoneVerified: true }).where(eq(users.id, found.id));
    }

    const { access, refresh } = await issueTokenPair({ sub: String(userId ?? `phone:${phone}`), role: "staff" });

    res.json({ access, refresh });
  } catch (err) {
    next(err);
  }
});

router.post("/refresh", async (req, res) => {
  const hdr = req.headers.authorization;
  const token = hdr?.startsWith("Bearer ") ? hdr.slice(7) : null;
  if (!token) return res.status(401).json({ error: { code: "unauthorized", message: "Missing token" } });
  try {
    const payload = verifyJwt(token);
    if (payload.typ !== "refresh" || !payload.jti) {
      return res.status(401).json({ error: { code: "unauthorized", message: "Invalid token" } });
    }
    const valid = await isRefreshValid(payload.sub, payload.jti);
    if (!valid) {
      return res.status(401).json({ error: { code: "unauthorized", message: "Expired or rotated token" } });
    }
    const { access, refresh } = await rotateRefreshToken(payload.jti, {
      sub: payload.sub,
      role: payload.role,
      tenantId: payload.tenantId ?? null
    });
    res.json({ access, refresh });
  } catch {
    res.status(401).json({ error: { code: "unauthorized", message: "Invalid token" } });
  }
});

router.post("/signup", (_req, res) => res.status(501).json({ error: { code: "not_implemented", message: "signup" } }));
router.post("/set-password", (_req, res) => res.status(501).json({ error: { code: "not_implemented", message: "set-password" } }));
router.post("/login", (_req, res) => res.status(501).json({ error: { code: "not_implemented", message: "login" } }));
router.post("/logout", (_req, res) => res.status(501).json({ error: { code: "not_implemented", message: "logout" } }));
router.get("/me", (_req, res) => res.status(501).json({ error: { code: "not_implemented", message: "me" } }));

export default router;
