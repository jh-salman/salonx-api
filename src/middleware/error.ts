import { Request, Response, NextFunction } from "express";
import { Sentry } from "../sentry.js";
import { logger } from "../logger/index.js";

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: "Not Found" });
}

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  if (status >= 500) {
    logger.error({ err }, "Unhandled error");
    try {
      Sentry.captureException?.(err);
    } catch {
      void 0;
    }
  }
  res.status(status).json({ error: message });
}
