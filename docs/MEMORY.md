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
- Authentication: database-backed opaque sessions stored as SHA-256 hashes; cookies are HTTP-only, SameSite=Lax, and secure in production.
- Passwords: Node.js scrypt with per-password random salts; resetting a password invalidates every existing session.
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
- 2026-09-29: Phase 1 owner bootstrap creates the first gym, branch, and owner, then provisions core roles/permissions. The development reset flow exposes a one-time link only outside production; a production delivery adapter belongs to Phase 12.
- 2026-09-30: Non-empty member email addresses and phone numbers are unique within a gym. This prevents ambiguous member lookup and supports the future member-portal association; member codes remain the stable primary identifier.
- 2026-09-30: Membership dates are UTC all-day values and status is derived by the shared membership domain helper, rather than trusting the persisted status alone. Duration is inclusive of its start date; a freeze extends expiry by its scheduled inclusive days and early unfreeze retracts unused extension days.
- 2026-09-30: Attendance currently uses a centralized 30-minute duplicate check-in window. The window is intentionally a named default until it becomes a branch setting in Phase 13; membership validation stays fresh and every authorized override is audited.
- 2026-10-07: Progress entries use UTC all-day dates and are visible only within the member's branch scope; trainer-only users are additionally limited to their assigned members. Progress photos use the local private-storage adapter and an authorized route rather than a public URL, pending a production object-storage adapter.

<!-- Example:
- 2026-10-02: Chose Auth.js credentials + database sessions because staff session revocation is required.
- 2026-10-03: Invoice numbers use `INV-{BRANCHCODE}-{YYYY}-{SEQUENCE}`; sequence is branch/year scoped.
-->
