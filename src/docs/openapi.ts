import { extendZodWithOpenApi, OpenAPIRegistry, OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

const HealthResponse = z.object({ ok: z.boolean(), ts: z.string() }).openapi("HealthResponse");

registry.registerPath({
  method: "get",
  path: "/health",
  responses: {
    200: {
      description: "Health",
      content: {
        "application/json": {
          schema: HealthResponse
        }
      }
    }
  }
});

export function buildOpenApi(): any {
  const generator = new OpenApiGeneratorV31(registry.definitions);
  return generator.generateDocument({
    openapi: "3.1.0",
    info: { title: "API", version: "0.1.0" }
  });
}
