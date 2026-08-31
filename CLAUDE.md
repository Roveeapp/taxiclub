# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Club Taxis Asturias — a full-stack taxi booking platform for Asturias, Spain. Clients book rides, drivers manage availability and create last-minute offers, admins oversee everything. Built as a PWA with real-time features.

## Commands

```bash
npm run dev          # Dev server at http://localhost:3000
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # ESLint check
npm run lint:fix     # ESLint auto-fix
npm run typecheck    # TypeScript check (nuxt typecheck)
npm run test         # Vitest unit tests
npm run test:e2e     # Playwright E2E tests
```

## Stack

- **Nuxt 4** (Vue 3) with file-based routing under `app/`
- **Nitro** server engine for API routes and scheduled tasks
- **Supabase** (PostgreSQL + Auth) — all DB access goes through the Supabase client
- **Pinia** for client state management
- **PrimeVue 4** + **Nuxt UI 2** + **Tailwind CSS** for UI
- **Stripe** (payments), **Resend** (email), **Twilio** (SMS), **web-push** (PWA notifications)

## Architecture

### Directory Layout

Nuxt 4 uses the `app/` directory convention:
- `app/pages/` — file-based routes
- `app/components/` — Vue components (booking/, driver/, layout/, offer/, ui/)
- `app/composables/` — auto-imported composables
- `app/stores/` — Pinia stores (auth, booking, driver, admin)
- `app/middleware/` — client-side route guards
- `app/server/api/` — Nitro API endpoints (~48 routes)
- `app/server/middleware/` — server-side middleware (auth token validation)
- `app/server/services/` — business logic (pricing, notifications, assignment, stripe, payouts)
- `app/server/tasks/` — scheduled Nitro tasks (cron jobs)
- `app/server/utils/` — shared server utilities
- `app/types/database.ts` — full Supabase schema TypeScript types (~500 lines)

### Authentication Flow

1. Client auth is handled by Supabase Auth via the `useAuthStore` Pinia store.
2. On every server request, `app/server/middleware/auth.ts` reads the `sb-access-token` cookie or `Authorization` header and validates it against Supabase, attaching `event.context.user` and `event.context.role`.
3. API routes call `requireAuth(event)` or `requireRole(event, 'admin'|'driver'|'client')` from `app/server/utils/auth.ts`.
4. Client-side route protection lives in `app/middleware/auth.ts`, guarding `/taxista`, `/admin`, and `/cuenta`.

### Database Access

- Server-side: use `useDb()` from `app/server/utils/db.ts` — returns a Supabase admin client (service role key). Never use the anon key on the server.
- Client-side: use `useSupabaseClient()` from `@nuxtjs/supabase`.
- All DB types are in `app/types/database.ts`.

### API Route Conventions

Files follow Nitro naming: `[resource].[method].ts` or nested directories with `index.[method].ts`.
- Example: `app/server/api/bookings/index.post.ts` → `POST /api/bookings`
- Example: `app/server/api/taxista/vehiculos/[id].patch.ts` → `PATCH /api/taxista/vehiculos/:id`

Role-scoped routes are prefixed: `/api/taxista/*` (drivers), `/api/admin/*` (admins).

### Scheduled Tasks

Cron jobs live in the database (`pg_cron`), not in Nitro. Each one does an
`net.http_post` to the `scheduled-tasks` Edge Function with a `{ "task": ... }`
body:

| Schedule | Task | Status |
|---|---|---|
| `*/5 * * * *` | `expire-offers` | implemented (marks expired `return_offers`) |
| `*/15 * * * *` | `remind-unconfirmed` | implemented, but needs the `RESEND_API_KEY` function secret to actually send email |
| `0 8 1 * *` | `process-payouts` | **stub** — counts drivers, pays nobody. Real logic sits unused in `app/server/services/payouts.ts` |
| `0 9 1 * *` | `charge-memberships` | **stub** — logs `Charging fee to driver X`, charges nothing |

The task code is in `supabase/functions/scheduled-tasks/`. It authenticates by
comparing the `Authorization` header against `SUPABASE_SERVICE_ROLE_KEY`, which
is why the function is deployed with `verify_jwt = false`.

The jobs read that key from Supabase Vault (`vault.decrypted_secrets`, secret
name `service_role_key`) — it used to be hardcoded in each job's command text.
To rotate it, one statement is enough:

```sql
SELECT vault.update_secret(
  (SELECT id FROM vault.secrets WHERE name = 'service_role_key'),
  '<new-key>'
);
```

**Never trust `cron.job_run_details` alone.** It reports `succeeded` as long as
the SQL ran, even when the HTTP call returned 404 or 401 — which is how all four
tasks stayed broken for months with the cron history showing green.

Use the health views instead, which cross both sources:

```sql
SELECT * FROM public.cron_task_status;  -- one row per task, last real outcome
SELECT * FROM public.cron_task_health;  -- every run, with its HTTP response
```

They join on the `request_id` that each task now records in
`public.cron_task_runs`. A purely time-based join would be ambiguous: the `*/5`
and `*/15` tasks fire together at :00, :15, :30 and :45, so it would attribute
responses to the wrong task four times an hour. `net._http_response` stores
neither URL nor body, so capturing the id is the only exact way.

`GET /api/admin/tareas` exposes the same thing, with a `hayProblemas` flag for
the panel.

When editing a task, remember `cron.schedule()` **reactivates** the job it
reprograms — re-pause the money tasks afterwards if payments are still off.

`stripe-webhook` is **not deployed**, on purpose: its handler is commented out,
so deploying it would answer Stripe with 200 while doing nothing, turning a
loud failure into a silent one. See `supabase/functions/stripe-webhook/`.

There is no working server-side payment confirmation: nothing updates a booking
from a Stripe event.

### Notification Services

`app/server/services/notifications.ts` centralizes all outbound notifications:
- Email via Resend, SMS via Twilio, push via web-push (VAPID).
- Always send notifications through these service functions, not by importing Resend/Twilio directly in API routes.

### Pricing

`app/server/services/pricing.ts` handles distance calculation and fare computation using system config fetched from DB. The config (min advance hours, per-km rate, commissions, etc.) is also exposed to the client via `GET /api/config` and cached in `useSystemConfig()` composable.

## TypeScript

Strict mode is enabled. The Supabase DB schema is typed in `app/types/database.ts` — use these types when writing queries and API responses. Don't cast with `as any` unless absolutely necessary.

## Styling Conventions

The project uses a custom Material Design 3-inspired Tailwind theme (defined in `tailwind.config.ts`):
- Dark-first palette: brand background `#0c0c13`, gold accent `#fabd32`
- Use semantic tokens (`card`, `btn`, `input`, `pill`) for border radius
- Typography utilities: `display-lg`, `headline-md`, `body-md`, `label-caps`
- PrimeVue components use the custom theme from `app/themes/clubtaxis/`

## Runtime Config

Private keys are in `runtimeConfig` (server-only), public values under `runtimeConfig.public`. Access server config with `useRuntimeConfig()` in API routes/services; access public config in Vue components with `useRuntimeConfig().public`.

Required environment variables are documented in `.env.example`.
