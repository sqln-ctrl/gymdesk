# GymFlow

GymFlow is a branch-aware gym operations application built with Next.js App Router, TypeScript, Tailwind CSS, Prisma, and SQLite for local development.

The `docs/` directory contains the product requirements, architecture, design system, implementation backlog, and implementation rules that guide this repository.

## Current foundation

- Strict TypeScript, ESLint, Vitest, Tailwind CSS, and a responsive staff application shell.
- Prisma configured for SQLite in development.
- Initial relational schema for gyms, branches, RBAC, staff, members, membership plans, memberships, attendance, invoices, payments, and audit logs.
- Integer minor-unit money helpers with unit tests.
- Loading, error, not-found, and useful empty UI states.

Authentication and production workflows are intentionally not enabled yet; the implementation backlog proceeds from the foundation into secure authentication/RBAC before operational mutations are added.

## Local setup

1. Install Node.js 20.19+ (Node 22 LTS is recommended for the team).
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env` if it is not already present, then keep the local default:

   ```env
   DATABASE_URL="file:./dev.db"
   NEXT_PUBLIC_APP_NAME="GymFlow"
   ```

4. Apply migrations and generate the Prisma client:

   ```bash
   npm run db:migrate -- --name foundation
   ```

5. Run the app:

   ```bash
   npm run dev
   ```

Open `http://localhost:3000`.

## Quality checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## SQLite now, Supabase later

`prisma/schema.prisma` currently uses `provider = "sqlite"` and `DATABASE_URL=file:./dev.db`. The models avoid SQLite-specific native types and use portable relational constraints, which keeps the eventual move to Supabase/PostgreSQL contained.

When the project is ready to move:

1. Back up the SQLite file and apply a clean migration plan to a staging Supabase project.
2. Change the Prisma provider to `postgresql` and set the Supabase connection URL in `DATABASE_URL`.
3. Review migrations for PostgreSQL-specific indexes, dates, and transaction behavior.
4. Run the complete test suite and validate imports before changing production traffic.

Do not copy a local SQLite database directly into production.

## Database commands

- `npm run db:generate` — regenerate Prisma Client after schema changes.
- `npm run db:migrate -- --name <change>` — create and apply a development migration.
- `npm run db:deploy` — apply committed migrations in a deployment environment.
- `npm run db:studio` — inspect local development data.

## Project conventions

- Money is always stored and calculated in integer minor units.
- Timestamps are stored as UTC and formatted with a gym’s timezone.
- Server-side authorization and Zod validation are mandatory for every future mutation.
- Sensitive operations must write safe audit records.
- Database changes are made through Prisma migrations only.
