# The Agency Engine

A platform that fights cognitive atrophy by making AI assistance feel earned. Users must prove their humanity through creative labor and human tasks to unlock Genius Answer (GA) tokens, which are spent to access AI capabilities.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/agency-engine run dev` — run the React frontend (port 19632)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY` — auto-provisioned by Clerk setup

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind v4, shadcn, wouter, @tanstack/react-query
- Auth: Clerk (Replit-managed) via `@clerk/react` + `@clerk/express`
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/agency-engine/` — React + Vite frontend
- `artifacts/api-server/` — Express API server
- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)
- `lib/db/src/schema/` — Drizzle schema files (one per table)
- `lib/api-client-react/src/generated/` — generated React Query hooks (do not edit)
- `lib/api-zod/src/generated/` — generated Zod validators (do not edit)

## Architecture decisions

- Clerk auth is cookie-based on web; no token handling needed in browser requests
- The Clerk proxy middleware (`clerkProxyMiddleware`) must be mounted BEFORE body parsers in app.ts
- GA token balance is stored in `users.ga_balance` with daily reset logic in `getOrCreateUser()`; the full history is in `ga_token_ledger`
- CHS (Cognitive Health Score) is event-sourced: each interaction creates a snapshot in `chs_snapshots`, dashboard reads the latest
- `getOrCreateUser()` in `src/lib/userSync.ts` is the JIT user provisioning helper — call it at the start of every authenticated route

## Product

Three core features:
1. **Creative Scarcity Muse** — GA token economy: users earn tokens by completing creative labor tasks (writing prompts, logic puzzles, brainstorming challenges), verified by LLM. Tokens are spent for AI access.
2. **Atrophy Mirror** — Cognitive Health Score (0–100) tracking how thoughtfully users engage with AI. Rendered as a living avatar that thrives or withers based on score.
3. **Proof of Humanity Gateway** — Circuit-breaker that forces real-world tasks (sensory observation, mindful breaks) when users over-rely on AI. Grants temporary unlock + GA bonus on success.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always run `pnpm --filter @workspace/api-spec run codegen` after changing `openapi.yaml`
- After codegen, run `pnpm run typecheck:libs` before checking artifact packages
- The `clerkClient` from `@clerk/express` is a direct object (not a function) — use `clerkClient.users.getUser(id)`, not `await clerkClient()`
- Tailwind v4 with Clerk: set `tailwindcss({ optimize: false })` in vite.config.ts and declare `@layer theme, base, clerk, components, utilities;` as the FIRST line in index.css
- Express 5 wildcard routes: use `/{*splat}` not `*`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `clerk-auth` skill for Clerk auth setup and customization
