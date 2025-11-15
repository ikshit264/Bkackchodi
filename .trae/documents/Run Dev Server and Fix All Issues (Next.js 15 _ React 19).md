## Goal
Run `npm run dev` reliably and fix compile/runtime/lint issues across the repo, keeping changes idiomatic to Next.js 15, React 19, Prisma, Clerk, Tailwind and LangChain usage.

## Prerequisites
1. Dependencies: `npm ci` or `npm install` (postinstall runs `prisma generate`).
2. Environment variables in `.env.local`:
   - Clerk: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` (use the test keys under `.clerk/.tmp/keyless.json` if needed).
   - Database: `DATABASE_URL` (PostgreSQL URI; dev can use a local/temporary DB).
   - Cloudinary: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (optional; only required for image uploads).
   - Optional: `ADMIN_USERNAME`, `ADMIN_KEY`, `CRON_API_KEY`, `GEMINI_API_KEY2`/`GEMINI_API_KEY_GITHUB`, `GROQ_API_KEY` if those features are exercised.

## Startup & Baseline
1. Start dev: `npm run dev` (`next dev --turbopack`).
2. Visit the app root and signed-out flows to confirm `ClerkProvider` renders; then sign in with Clerk.
3. Collect initial errors from Turbopack overlay and terminal.

## Triage Workflow
1. Fix hard compile errors first (TypeScript/Next build), then runtime errors (server/client), then lint.
2. Prioritize common blocking issues:
   - Client/server boundary violations (server-only code in client components).
   - Bad imports/paths and module duplication.
   - Missing `use client` where hooks/state are used.
   - Misconfigured env variables and secrets.
   - Prisma client lifecycle misuse.

## Targeted Fixes (Repo-Specific)
1. Prisma unification:
   - Use `src/lib/prisma.ts` everywhere; remove the duplicate `lib/prisma.ts` to avoid confusion.
   - Add a `global` type for `global.prisma` in `src/types/globals.d.ts`.
2. Clerk secret usage:
   - In `src/utils/github/GithubBackchodi.ts`, replace `process.env.NEXT_PUBLIC_CLERK_SECRET_KEY` with `process.env.CLERK_SECRET_KEY` and ensure this module is only imported server-side (it calls Clerk Admin API).
3. Invalid imports:
   - Remove `import { u } from "framer-motion/dist/types.d-B50aGbjN"` and other unused imports; they break compilation.
4. Client components:
   - Ensure any component using hooks has `'use client'` (many already do; audit and fix missing ones).
5. API route consistency:
   - Ensure all App Router handlers (`route.ts`) use `NextResponse` and only Node runtime for Prisma-bound routes.
   - Add robust error handling via existing `src/utils/api-error-handler.ts` where applicable.
6. Type hygiene:
   - Add/adjust minimal types for request bodies and responses in API routes to avoid implicit `any`.
   - Resolve any missing type declarations (e.g., `global.prisma`).
7. ESlint fixes:
   - Run `npm run lint`, auto-fix where safe; adjust remaining issues manually while keeping `next/core-web-vitals` rules.

## Validation
1. Type-check: `tsc --noEmit` to ensure the project type-checks.
2. Lint: `npm run lint` clean.
3. Smoke tests:
   - Anonymous homepage loads.
   - Signed-in shell: `RootLayout` renders `Sidenav`, `UserButton`, `SyncUser`, `AppInitializer` without crashing.
   - A few API routes (e.g., `/api/groups`, `/api/badges/available`) respond successfully.
4. Optional: `OpenPreview` and share the dev URL once running.

## Database Notes
- Prisma requires `DATABASE_URL`; for dev, use a local Postgres or a temporary cloud instance.
- Migrations are present under `prisma/migrations`; apply them in dev (`prisma migrate dev`) if needed for feature testing.

## Deliverables
- Running dev server.
- A set of focused code edits addressing compile/runtime/lint issues, including:
  - Prisma module consolidation and typings.
  - Clerk secret usage corrected.
  - Invalid/unused imports removed.
  - Client/server boundary fixes.
  - Type and lint cleanups.
- Short summary of changes and validation results.

## Next Step
On confirmation, I will implement the fixes, run the dev server, iterate on errors until clean, and provide a preview plus a concise change log.