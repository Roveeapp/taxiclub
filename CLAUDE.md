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

Configured in `nuxt.config.ts` under `nitro.experimental.tasks` and `scheduledTasks`:
- `*/5 * * * *` → `expire-offers`
- `*/15 * * * *` → `remind-unconfirmed`
- `0 8 1 * *` → `process-payouts`
- `0 9 1 * *` → `charge-memberships`

Tasks live in `app/server/tasks/`.

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
