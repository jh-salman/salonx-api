# SalonX API

Production‑ready backend for SalonX.

Tech stack:
- Node.js + TypeScript (ESM), Express
- PostgreSQL + Drizzle ORM (drizzle-kit)
- Redis + BullMQ
- JWT auth + RBAC
- Stripe + Twilio integrations
- Pino logs + Sentry + OpenTelemetry
- Multi‑tenant architecture, public booking endpoints
- Socket.io + SSE (real‑time)
- Uploads (S3), OpenAPI (zod-openapi)
- Vitest + Supertest

Repository: https://github.com/jh-salman/salonx-api


1) Quick Start

Prereqs:
- Node 18+ (nvm recommended), pnpm
- Docker (for Postgres + Redis)
- Optional: Stripe/Twilio keys

Setup:
- cp .env.example .env
- docker compose up -d
- pnpm install

Database:
- pnpm db:generate
- pnpm db:migrate
- pnpm tsx src/db/seed.ts

Run:
- Dev: pnpm dev
- Build: pnpm build
- Start: pnpm start

Test/Lint:
- pnpm test
- pnpm lint


2) Scripts

- dev: tsx --env-file .env src/server.ts
- build: tsup src --format esm --dts --out-dir dist
- start: node dist/server.js
- test: vitest
- lint: eslint .
- db:generate: drizzle-kit generate
- db:migrate: drizzle-kit migrate
- db:studio: drizzle-kit studio


3) Environment

Copy .env.example → .env. Important keys:
- Core: NODE_ENV, PORT, API_PREFIX
- DB/Redis: DATABASE_URL, REDIS_URL
- Auth: JWT_SECRET, JWT_EXPIRES, JWT_REFRESH_EXPIRES, HASH_ROUNDS
- Integrations: STRIPE_*, TWILIO_*, S3_*
- Observability: SENTRY_DSN, OTEL_EXPORTER_OTLP_ENDPOINT, OTEL_SERVICE_NAME
- Rate limit/CORS: RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX, CORS_ORIGIN
- Feature flags: FEATURE_TOKENS, FEATURE_AI, FEATURE_VOICE, USE_PGVECTOR, EMBEDDING_DIM
- AI/Voice providers: AI_PROVIDER, AI_MODEL, OPENAI_API_KEY, DEEPGRAM_API_KEY, GCP_PROJECT_ID, GOOGLE_APPLICATION_CREDENTIALS

Validated with Zod; missing critical vars fail fast.


4) Docker (local dev)

docker-compose.yml provides:
- Postgres 16 (db:5432, database=salonx, user=postgres, pass=postgres)
- Redis 7 (6379)

Ensure DATABASE_URL=postgres://postgres:postgres@localhost:5432/salonx
Ensure REDIS_URL=redis://localhost:6379


5) Project Structure

src/
  app.ts               Express app factory
  server.ts            HTTP bootstrap
  config/              Env + constants (Zod)
  logger/              Pino logger
  telemetry/otel.ts    OpenTelemetry init
  sentry.ts            Sentry init
  db/
    schema.ts          Drizzle tables
    index.ts           pg Pool + drizzle client
    seed.ts            Demo data
  redis/               ioredis client
  queues/              BullMQ connection
    jobs/              processors (email,sms,reports,...)
  middleware/          security, auth, rbac, tenant, rateLimit, error
  modules/
    health/
    auth/
    tenants/
    me/
    staff/
    service-categories/
    services/
    appointments/
    timers/
    waitlist/
    clients/
    clients-global/
    inventory/
    pos/
    payments/
    connect/
    subscriptions/
    forms/
    uploads/
    marketing/
    reports/
    settings/
    integrations/
    webhooks/
    ops/
  routes.ts            Mount routers under /v1
  http.d.ts            Express typings augmentation
  docs/openapi.ts      OpenAPI builder (zod-openapi)


6) Security & Middleware

- helmet, cors (allowlist), hpp, compression
- Global rate limit: window + max from env
- Zod validation on all inputs; unknown fields denied
- Auth chain: deserializeUser → requireAuth → bindTenant → requireRole
- Error handler: JSON { error: { code, message, details } } without leaking stack


7) Auth, JWT & RBAC

- Signup supports email + phone (E.164), primary flow: phone OTP via Twilio
- Password optional (email+password path available)
- Hash with bcryptjs; strong policy enforced
- JWT payload: { sub, tenantIds, activeTenantId, rolesByTenant }
- Access/Refresh tokens with rotation; refresh stored in Redis by jti
- Roles: Owner | Admin | Staff | Unassigned
- RBAC helper requireRole(...); row‑level checks in services


8) Multi‑Tenancy

- tenants table; tenant_domains for subdomain/custom domain
- Every tenant‑scoped table includes tenant_id
- Tenant resolution:
  - Staff app: x-tenant-id header or membership default
  - Public site: Host header subdomain; dev fallback /public/:brandSlug
- No RLS in DB; app‑layer enforcement with FKs + service checks


9) Database (Drizzle + Postgres)

- Strong typing with Drizzle schema (25+ tables)
- Money in integer cents; int for durations/qty
- Enums for statuses/roles
- Indices on tenant_id and all FKs
- Timestamptz everywhere

Core tables:
- users, tenants, memberships, brands, tenant_domains
- service_categories, services, service_policies
- clients, staff, appointments, timers
- orders, order_items, payments
- uploads, forms, form_submissions
- webhooks, audit_logs

Credits & Loyalty (feature‑flagged):
- client_credits, client_credit_ledger
- client_wallets, client_token_balances, client_token_ledger
- earn_rules, redeem_rules

AI/Voice (feature‑flagged):
- voice_notes, ai_events
- embeddings (pgvector if enabled)

Migrations:
- pnpm db:generate → pnpm db:migrate
- Explicit USING casts in migrations for numeric/text conversions
- drizzle-kit studio available via pnpm db:studio


10) Real‑time

- socket.io for staff dashboard rooms:
  - tenant:{id}, calendar:{tenant}:{provider}, day:{tenant}:{YYYY-MM-DD}
- Events: slot.updated/removed, appt.created/updated/cancelled, timer.started/stopped, waitlist.offer
- SSE public availability stream fallback


11) Concurrency & Booking

- Redis SETNX+TTL mutex for slot holds (2–5 min)
- DB FOR UPDATE checks for double‑booking guard
- Hold API: create/release/expire via jobs
- Availability recompute job publishes diffs to sockets/SSE


12) Queues & Jobs (BullMQ)

Queues: email, sms, reports, cleanup, availability, waitlist, ai
Jobs:
- availability:recompute → recompute/day diff
- waitlist:match → auto‑match on free slot
- hold:expire → release expired holds
- ai tasks (transcribe/embeddings) if enabled


13) Payments & Subscriptions

- Stripe Checkout/PaymentIntents; webhooks: /v1/webhooks/stripe
- Store transactions, refunds, saved PM ids
- Subscriptions module with plan gating
- Staff limits per plan (enforced on invite/create)
- Commission: staff.commission_enabled + commission_rate; order payments compute commission rows


14) Uploads

- S3 signed URL generation
- uploads table metadata
- POST /uploads/attach to link


15) OpenAPI

- zod + zod-openapi → docs/openapi.ts
- Swagger UI at /docs; JSON at /openapi.json


16) Health & Ops

- /health (legacy), /v1/health, /v1/health/detailed (db, redis, queues, externals)
- /v1/ops/* protected admin endpoints (e.g., retry failed jobs)


17) Testing

- Vitest + Supertest
- Test DB schema is the same; reset per file or run suite‑level migrate/seed
- Focus tests:
  - auth: OTP + refresh rotation
  - services CRUD
  - appointments overlap guard
  - orders/payments (Stripe mocked)
- Run: pnpm test


18) CI/CD (future)

- GH Actions: install, lint, test, build, publish image
- Run db:migrate on deploy
- Production: NODE_ENV=production, JSON logs, OTEL exporter & SENTRY_DSN optional
- Wildcard DNS (*.salonx.com) → reverse proxy; cache headers for public endpoints


19) Seed & Demo

- pnpm tsx src/db/seed.ts creates:
  - demo tenant + brand + owner
  - 2 staff (commission variants)
  - 5 services (varied durations/prices)
  - 10 clients
  - sample appointments, orders, payments
  - credit ledger entries
- Use /v1/public/services and /v1/public/availability to demo booking flow


20) Security Notes

- Never commit .env (ignored); use .env.example
- Validate/escape all inputs (Zod)
- Rate‑limit OTP and login flows
- Rotate refresh tokens; store by jti
- Secrets via env only (no code/logging of secrets)


License
Proprietary (© SalonX). All rights reserved.
