import "dotenv/config";
import { z } from "zod";

const base = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  API_PREFIX: z.string().default("/v1"),

  DATABASE_URL: z.string().default("postgres://postgres:postgres@localhost:5432/salonx"),
  REDIS_URL: z.string().optional(),

  JWT_SECRET: z.string().default("dev-secret"),
  JWT_EXPIRES: z.string().optional(),
  JWT_EXPIRES_IN: z.string().optional(),
  JWT_REFRESH_EXPIRES: z.string().optional(),
  HASH_ROUNDS: z.coerce.number().optional(),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_API_KEY: z.string().optional(),

  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),

  S3_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),

  SENTRY_DSN: z.string().optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
  OTEL_SERVICE_NAME: z.string().default("node-ts-express-api"),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().optional(),
  RATE_LIMIT_MAX: z.coerce.number().optional(),

  CORS_ORIGIN: z.string().optional(),

  FEATURE_TOKENS: z.string().optional(),
  FEATURE_AI: z.string().optional(),
  FEATURE_VOICE: z.string().optional(),

  AI_PROVIDER: z.string().optional(),
  AI_MODEL: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  DEEPGRAM_API_KEY: z.string().optional(),
  GCP_PROJECT_ID: z.string().optional(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),

  USE_PGVECTOR: z.string().optional(),
  EMBEDDING_DIM: z.coerce.number().optional()
});

type RawEnv = z.infer<typeof base>;
const raw: RawEnv = base.parse(process.env);

const JWT_EXPIRES_IN = raw.JWT_EXPIRES ?? raw.JWT_EXPIRES_IN ?? "1h";

export const env = {
  ...raw,
  JWT_EXPIRES_IN
};

export type Env = typeof env;
