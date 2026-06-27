# EduPlat — Educational & Career Development Platform

A full-stack platform where professionals train, earn certificates, and get hired.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/eduplat run dev` — run the frontend (port assigned by workflow)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed` — seed the database with sample data
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, shadcn/ui, wouter (routing), TanStack Query
- API: Express 5
- DB: PostgreSQL + Drizzle ORM (`lib/db`)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec → `lib/api-client-react`)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/eduplat/` — React + Vite frontend (all pages and components)
- `artifacts/api-server/` — Express 5 API server (all routes)
- `lib/db/` — Drizzle ORM schema, migrations, db client
- `lib/api-spec/` — OpenAPI spec (`openapi.yaml`) — source of truth for the API contract
- `lib/api-client-react/` — Generated TanStack Query hooks and Zod schemas (from codegen)
- `scripts/src/seed.ts` — Database seed script

## Architecture decisions

- **Contract-first API**: OpenAPI spec → Orval codegen → typed hooks on the frontend. Never hand-write fetch calls.
- **wouter `Link` renders its own `<a>` tag**: NEVER nest `<a>` inside `<Link>`. Pass `className` directly to `<Link>` instead of wrapping a child `<a>`.
- **Auth**: Simple base64 token (`userId:eduplat_token`). Admin user (Ahmed Al-Rashidi) is pre-loaded in `AuthContext`.
- **Proxy routing**: All traffic goes through the shared proxy at `localhost:80`. API is mounted at `/api`. Services must handle their full base path.
- **Seed data**: 5 users, 5 jobs with screening questions, 4 workshops with exam questions, 5 learning tracks with modules.

## Product

- **Landing page** — Animated stats, feature highlights, learning tracks, roadmap timeline
- **Job Board** — Browse jobs with salary/type/level filters, timed screening quiz on apply
- **Workshops** — Enroll in live sessions, take exams, earn PDF certificates
- **Learning Paths** — Structured roadmaps (TOT, CCNA, Cybersecurity, Full-Stack, Computer Basics) with per-module progress tracking
- **Certificates** — View and print/download earned certificates (PDF-style)
- **Leaderboard** — Podium + ranked table with points, streak, and cert count
- **AI Mock Interview** — Start sessions by track type, chat with AI for interview practice
- **Admin Dashboard** — ATS (applications), user management, job/workshop management, platform stats

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- **wouter Link**: Always pass `className` and other HTML attributes directly to `<Link>`, never wrap a child `<a>`. Wrapping causes React hydration errors (`<a>` cannot be descendant of `<a>`).
- Do not run `pnpm dev` at the workspace root — use `restart_workflow` instead.
- Run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI spec change before touching frontend code.
- Run `pnpm run typecheck:libs` after any `lib/*` package change.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
