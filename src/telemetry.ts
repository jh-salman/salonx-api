import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { env } from "./config/env.js";

let sdk: NodeSDK | null = null;

export function startTelemetry() {
  if (sdk) return sdk;
  sdk = new NodeSDK({
    serviceName: env.OTEL_SERVICE_NAME,
    instrumentations: [getNodeAutoInstrumentations()]
  });
  void sdk.start();
  return sdk;
}

export async function shutdownTelemetry() {
  if (sdk) {
    try {
      await sdk.shutdown();
    } catch {
      void 0;
    }
    sdk = null;
  }
}
