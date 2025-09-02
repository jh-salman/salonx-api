import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { env } from "../config/index.js";

let sdk: NodeSDK | null = null;

export function startTelemetry() {
  try {
    sdk = new NodeSDK({
      serviceName: env.OTEL_SERVICE_NAME,
      instrumentations: [getNodeAutoInstrumentations()]
    });
    sdk.start();
  } catch {
    void 0;
  }
}

export async function shutdownTelemetry() {
  try {
    await sdk?.shutdown();
  } catch {
    void 0;
  }
}
