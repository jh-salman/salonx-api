import { createServer } from "http";
import { createApp } from "./app.js";
import { env } from "./config/index.js";
import { logger } from "./logger/index.js";
import { startTelemetry, shutdownTelemetry } from "./telemetry/otel.js";
import { initSentry, Sentry } from "./sentry.js";
import "./db/index.js";
import { initQueues } from "./queues/index.js";

const app = createApp();
let server: import("http").Server | null = null;

if (env.NODE_ENV !== "test") {
  initSentry();
  startTelemetry();
  initQueues();

  if (env.SENTRY_DSN) {
    try {
      (Sentry as any).setupExpressErrorHandler?.(app);
    } catch {
      void 0;
    }
  }

  server = createServer(app).listen(env.PORT, () => {
    logger.info(`Server listening on :${env.PORT} (${env.NODE_ENV})`);
    logger.info(`Docs at /docs`);
  });

  process.on("SIGINT", async () => {
    server?.close();
    await shutdownTelemetry();
    process.exit(0);
  });
}

export default app;
