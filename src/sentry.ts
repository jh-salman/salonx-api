import * as Sentry from "@sentry/node";
import { env } from "./config/index.js";

export function initSentry() {
  if (!env.SENTRY_DSN) return;
  Sentry.init({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    environment: env.NODE_ENV
  });
}

export { Sentry };
