import cors from "cors";
import helmet from "helmet";
import hpp from "hpp";
import compression from "compression";
import rateLimit from "express-rate-limit";
import type { RequestHandler } from "express";

export const securityMiddleware: RequestHandler[] = [
  cors({ origin: true, credentials: true }),
  helmet(),
  hpp(),
  compression(),
  rateLimit({ windowMs: 60_000, max: 100 })
];

export const otpSendLimiter = rateLimit({
  windowMs: 60_000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false
});

export const otpVerifyLimiter = rateLimit({
  windowMs: 5 * 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false
});
