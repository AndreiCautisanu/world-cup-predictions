@AGENTS.md

# CupaMondiala — InRing

Private World Cup 2026 predictions app for a friend group. Romanian UI throughout.

## Stack
Next.js 16 (App Router) · React 19 · Prisma 7 (`@prisma/adapter-pg`, driver adapter — not the default engine) · PostgreSQL on Railway · NextAuth v5 beta (Credentials, JWT sessions) · Tailwind v4 · Zod 4 · TS 6 · Jest.

## Commands
- `npm test` — Jest (lib + component tests in `__tests__/`)
- `npm run lint` — ESLint flat config (strict: no `any`, no setState/ref-writes in render)
- `npx tsc --noEmit` — typecheck
- `npx prisma generate` — REQUIRED after any schema.prisma edit, else tsc fails on new models
- `npm run db:bootstrap` — refetch teams/fixtures from football-data.org
- DB scripts: `railway run --service Postgres npx tsx scripts/<x>.ts` (uses DATABASE_PUBLIC_URL)

## Critical gotchas
- Local `.env` `DATABASE_URL` points at PROD. Do NOT run a dev server / write to it casually.
- Read the session via `getSessionUser(await auth())` from `lib/session.ts`. NEVER `session.user.id` — it's typed `never` under the augmentation.
- `AUTH_SECRET` must be set (lib/env.ts bridges legacy NEXTAUTH_SECRET + crashes boot if neither).
- Migrations are hand-written numbered SQL in `prisma/migrations/N_name/migration.sql`; `prisma migrate deploy` runs on `npm start`.
- Romanian UI: user-facing strings in Romanian; use typographic quotes `„ ”` (react/no-unescaped-entities).
- Ops-only scripts are prefixed `_` in `scripts/` (e.g. `_promote-admin.ts`, `_restore-snapshot.ts`).
- Registration is open (no invite code); owner prunes unrecognized accounts. No admin UI to bootstrap the first admin — use `scripts/_promote-admin.ts <username>`.

## Where things live
- `lib/scoring.ts` — group 0/2/4/7, KO 0/4/8/10, bonus/dark-horse. `matchPredictionTier(pts, round)` needs round.
- `lib/recalc.ts` — recompute chain triggered on result save/clear (idempotent).
- `lib/locking.ts` — match locks 1h pre-kickoff; bonus/standings lock at tournament start; also `status !== SCHEDULED`.
- `lib/audit.ts` + `AdminAuditLog` — append-only admin action log. `lib/snapshot.ts` — JSON backup to GitHub.
- Admin gating: middleware + `getSessionUser().isAdmin`. JWT carries isAdmin (set at signin — re-login after promotion).

## Deploy
Railway auto-deploys on push to `master`. Build: `prisma generate && next build`. Start: `prisma migrate deploy && next start`. Health: `/api/health`.
