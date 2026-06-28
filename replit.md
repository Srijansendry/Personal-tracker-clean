# ProCompanion — Personal Productivity Dashboard

A personal productivity dashboard with task management, habit tracking, financial planning, gamification, and PDF import.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port via workflow)
- `pnpm --filter @workspace/dashboard run dev` — run the frontend (port via workflow)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (auto-provisioned)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind, shadcn/ui, framer-motion, recharts, wouter
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)
- `lib/db/src/schema/` — Drizzle table definitions (tags, tasks, habits, finances, badges, user_stats)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/dashboard/src/pages/` — React pages (home, tasks, habits, finances, pdf-import, tags, badges, admin)
- `lib/api-client-react/src/generated/` — Generated React Query hooks (do not edit)
- `lib/api-zod/src/generated/` — Generated Zod schemas (do not edit)

## Architecture decisions

- All API contracts defined in OpenAPI first, then codegen produces hooks + Zod schemas
- Single user model — no auth, all data is private to the instance
- PDF text extraction happens client-side (pdfjs-dist), then parsed text is sent to `/api/pdf/parse-tasks`
- Gamification XP: +10 per completed task, +5 per habit check; level = floor(xp/100) + 1
- Finance amounts stored as numeric(12,2) in DB; always `Number(entry.amount)` before `.toFixed()` on frontend

## Product

- **Dashboard**: Daily task summary, streak, XP/level, motivational quote
- **Tasks**: Full CRUD, filter by status/tag, priority badges
- **Admin**: Override any task status, reschedule missed tasks
- **Habits**: Daily check-in, streak tracking, level-up at 7-day milestones
- **Finances**: Income/expense tracking, monthly summary with pie chart by category
- **PDF Import**: Upload PDF → client-side text extraction → parsed task suggestions → confirm to save
- **Tags**: Predefined (Rent, Food, Bills, Study, Health, Work) + custom user tags
- **Badges**: Earned through milestone achievements (streaks, completions)

## Gotchas

- Finance `amount` field comes from DB as a string (numeric type) — always wrap with `Number()` before math or `.toFixed()`
- Table component exports are `TableBody, TableCell, TableHead, TableHeader, TableRow` (NOT `Body, Cell, Head, Header, Row`)
- After any OpenAPI spec change, always run `pnpm --filter @workspace/api-spec run codegen` before implementing routes or frontend

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
