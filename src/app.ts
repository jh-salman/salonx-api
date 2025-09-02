import express from "express";
import pinoHttp from "pino-http";
import cookie from "cookie";
import swaggerUi from "swagger-ui-express";
import { securityMiddleware } from "./middleware/security.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { logger } from "./logger/index.js";
import { buildOpenApi } from "./docs/openapi.js";
import routes from "./routes.js";
import { router as health } from "./modules/health/router.js";
import { deserializeUser, bindTenant } from "./middleware/tenant.js";
import { env } from "./config/index.js";

export function createApp() {
  const app: import("express").Express = express();

  app.use(pinoHttp({ logger }));

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use((req, _res, next) => {
    const cookies = req.headers.cookie ? cookie.parse(req.headers.cookie) : {};
    (req as any).cookies = cookies;
    next();
  });

  securityMiddleware.forEach((mw) => app.use(mw));

  app.use(deserializeUser);
  app.use(bindTenant);

  app.use(env.API_PREFIX, routes);
  app.use("/health", health);

  const openapi = buildOpenApi();
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
