# CLAUDE.md — USTOZ Marketplace

You are building USTOZ — a tutor/specialist booking marketplace for Uzbekistan (think italki/Preply, but for all categories: languages, IT, school subjects, psychologists, craft masters). Lessons happen INSIDE the platform (video + whiteboard + chat). Full product spec lives in `docs/`. **Read `docs/08-roadmap.md` first — it defines the build order. Never skip ahead of the current phase.**

## Stack (fixed decisions — do not change without explicit user approval)

| Layer | Tech |
|---|---|
| Mobile (iOS + Android) | Flutter 3.x, Riverpod, GoRouter, freezed, supabase_flutter, agora_rtc_engine |
| Web (public site + student/teacher cabinets) | Next.js 14+ (App Router), TypeScript, Tailwind, shadcn/ui, supabase-js |
| Admin panel | Next.js (separate app in monorepo), shadcn/ui, role-gated |
| Backend | Supabase: PostgreSQL + RLS, Auth (phone OTP via Eskiz SMS hook), Storage, Realtime, Edge Functions (Deno/TS) |
| Video | Agora RTC behind a `VideoProvider` abstraction (LiveKit migration planned — see docs/07) |
| Payments | Payme, Click, Uzum (webhooks in Edge Functions). International cards: Phase 7 |
| SMS | Eskiz.uz |
| Push | Firebase Cloud Messaging |

## Monorepo layout

```
ustoz/
├── CLAUDE.md
├── docs/                      # product & tech specs (source of truth)
├── apps/
│   ├── mobile/                # Flutter app
│   ├── web/                   # Next.js public site + cabinets
│   └── admin/                 # Next.js admin panel
├── packages/
│   └── shared/                # shared TS types, constants, validation (zod)
├── supabase/
│   ├── migrations/            # SQL migrations (numbered, never edit applied ones)
│   ├── functions/             # Edge Functions (one folder per function)
│   └── seed.sql               # categories, subjects, demo data
└── .env.example               # every env var documented here
```

## Conventions

- **Localization is mandatory from day one**: every user-facing string exists in `uz` and `ru`. Flutter: ARB files (`intl`). Next.js: `next-intl`. DB content tables carry `name_uz` / `name_ru` columns. Default locale: `uz`.
- **Timezone**: Asia/Tashkent everywhere. Store timestamps in UTC (`timestamptz`), render in Tashkent time. No per-user timezone in MVP.
- **Currency**: UZS, integer amounts in **tiyin** (1 UZS = 100 tiyin) in DB and APIs. Format on clients.
- **Money flow is sacred**: all balance changes go through `wallet_transactions` inserts inside Postgres functions (`SECURITY DEFINER`), never direct `UPDATE wallets`. Idempotency keys on every payment webhook.
- **RLS on every table.** Service-role key only inside Edge Functions. Clients use anon key + user JWT.
- **Status enums** are Postgres enums, mirrored in `packages/shared`.
- **IDs**: uuid v4 (`gen_random_uuid()`).
- Flutter: feature-first folders (`lib/features/<feature>/{data,domain,presentation}`), Riverpod codegen, no `setState` for shared state.
- Next.js: server components by default, client components only when interactive. Teacher profile pages are SSR/ISR with full SEO meta (the web exists primarily for Google indexing of teacher profiles).
- Commit style: conventional commits. One feature branch per roadmap phase.
- Tests: Postgres functions covered by pgTAP or SQL test scripts; Edge Functions — Deno tests; Flutter — widget tests for booking and payment flows minimum.

## Working rules for you (Claude Code)

1. Follow `docs/08-roadmap.md` phase by phase. Finish acceptance criteria before moving on; print the checklist status at the end of each phase.
2. Before coding a feature, re-read the relevant section in `docs/` — the docs are the source of truth over your assumptions.
3. Migrations: additive only; new numbered file per change; keep `seed.sql` in sync.
4. Every Edge Function: input validation (zod), structured error responses `{ error: { code, message } }`, logging.
5. Anything ambiguous or any deviation from docs → STOP and ask the user (Temur) in Russian. Do not silently invent product behavior.
6. Keep `.env.example` updated with every new variable + a one-line comment.
7. After completing each phase, write a short status report in Russian: what's done, how to test it, what's needed from Temur (accounts, keys, decisions).
8. Payment code (Payme/Click/Uzum) must be testable with sandbox/mock mode via env flag `PAYMENTS_MODE=test|live`.
9. Video: code against the `VideoProvider` interface (`createRoom`, `joinToken`, `endRoom`, callbacks) — Agora is the first implementation, LiveKit will be the second.

## Env vars (initial set — keep .env.example current)

```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # Edge Functions only
AGORA_APP_ID=
AGORA_APP_CERTIFICATE=
ESKIZ_EMAIL=
ESKIZ_PASSWORD=
PAYME_MERCHANT_ID=
PAYME_KEY=
CLICK_MERCHANT_ID=
CLICK_SERVICE_ID=
CLICK_SECRET_KEY=
UZUM_MERCHANT_ID=
UZUM_SECRET=
FCM_SERVICE_ACCOUNT_JSON=
PAYMENTS_MODE=test
APP_BASE_URL=
```

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
