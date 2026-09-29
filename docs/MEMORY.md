# GymFlow — Project Memory

This file is Codex's durable project memory. Keep it concise. Record only decisions, conventions, important discoveries, and recurring pitfalls that should survive across sessions.

Do not use this file as a task list; use `TASKS.md` for that.

## Product Decisions
- Product name (working): GymFlow.
- Initial target: production-ready gym management web application.
- Architecture is single-gym friendly but branch-aware from the beginning.
- Multi-tenant SaaS is explicitly out of MVP scope.
- Primary staff workflows are desktop/tablet; member portal is mobile-first.
- Core modules: auth/RBAC, members, memberships, attendance, billing, trainers/staff, workouts, progress, classes, equipment, reports, settings, audit logs.

## Technical Decisions
- Framework: Next.js App Router + TypeScript strict mode.
- Database: SQLite for the initial local build; migrate to Supabase/PostgreSQL before production.
- ORM: Prisma.
- UI: Tailwind CSS + shadcn/ui.
- Charts: Recharts.
- Validation: Zod.
- Money: integer minor units only.
- Timestamps: store in UTC; render using gym timezone.
- Server Components by default; client components only where interaction requires them.
- Domain rules belong in services, not UI components.
- External providers use adapter interfaces.

## Security Decisions
- Authorization is always enforced server-side.
- Permissions are explicit and branch-scoped where relevant.
- Sensitive operations write audit logs.
- Never store raw card data.
- Never log passwords, tokens, cookies, payment credentials, or secrets.

## Domain Invariants
- Client-calculated financial totals are never trusted.
- Refunds do not delete original payments.
- Membership cancellation/history is preserved.
- Frozen/expired/suspended memberships cannot check in without authorized override.
- Attendance overrides require a reason and audit log.
- Class capacity enforcement must be concurrency-safe.

## UX Decisions
- Front-desk check-in gets a dedicated scanner/keyboard-friendly screen.
- Major tables use server-side pagination/filtering.
- Every data screen handles loading, empty, error, and success states.
- Destructive actions require confirmation.
- Status is never communicated with color alone.

## Coding Conventions
- Prefer named domain functions such as `renewMembership()` and `recordPayment()` over generic CRUD functions for business-critical actions.
- Shared formatters are used for dates, money, and status labels.
- Avoid `any`.
- Do not access Prisma from client components.
- Do not duplicate business rules across pages/actions.

## Known Pitfalls to Avoid
- Membership expiry bugs caused by timezone conversion.
- Floating-point currency arithmetic.
- Branch data leakage caused by missing scope filters.
- Duplicate check-ins caused by scanner double-submit.
- Class overbooking caused by non-transactional capacity checks.
- Payment double-processing caused by non-idempotent webhooks.
- UI-only permission checks.

## Session Notes
Add only durable notes below this line as implementation progresses.

- 2026-09-29: Phase 0 foundation uses Prisma 5.22 with a committed SQLite migration. Models avoid SQLite-specific native types to simplify the planned Supabase/PostgreSQL move.
- 2026-09-29: The application shell uses Tailwind with shadcn-compatible shared components; Next.js, Prisma, and database access remain server-side by default.

<!-- Example:
- 2026-10-02: Chose Auth.js credentials + database sessions because staff session revocation is required.
- 2026-10-03: Invoice numbers use `INV-{BRANCHCODE}-{YYYY}-{SEQUENCE}`; sequence is branch/year scoped.
-->
