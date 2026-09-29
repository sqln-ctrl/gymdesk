# GymFlow — Codex Implementation Rules

These rules are mandatory unless a later approved decision explicitly changes them.

## 1. General Engineering Rules
1. Use TypeScript strict mode. Do not use `any` unless there is a documented, unavoidable reason.
2. Keep files focused. Split large components/services before they become difficult to reason about.
3. Prefer simple, explicit code over clever abstractions.
4. Never leave placeholder logic, fake success responses, or silent TODO behavior in a completed task.
5. Do not introduce a dependency when a small, well-tested local utility is sufficient.
6. Reuse existing project patterns before creating new ones.
7. Do not rewrite unrelated files while implementing a task.
8. Keep lint, type-check, and tests passing after each task.

## 2. Security Rules
1. Authentication and authorization are server-side requirements, not UI features.
2. Every mutation must verify the current user and required permission.
3. Scope branch/gym data access server-side.
4. Validate all untrusted input with Zod or equivalent schema validation.
5. Do not expose secrets to client components.
6. Never log passwords, tokens, cookies, payment credentials, or sensitive personal data.
7. Uploaded files must be type/size restricted.
8. Payment/webhook integrations must verify signatures and support idempotency.
9. Destructive and sensitive actions require explicit permission and audit logging.
10. Do not store raw card data.

## 3. Database Rules
1. Use Prisma migrations for schema changes; never depend on manual production edits.
2. Use transactions for operations that must be atomic.
3. Use foreign keys and uniqueness constraints for invariants the database can enforce.
4. Add indexes for frequent lookup/filter columns.
5. Do not delete financial history. Use void/refund/status transitions.
6. Prefer archive/deactivate for members/staff referenced by historical records.
7. Store money in integer minor units.
8. Store timestamps in UTC.
9. Never put large arbitrary domain structures in JSON solely to avoid modeling them.

## 4. Domain Rules

### Memberships
- Membership date calculations live in one domain service.
- A frozen membership cannot check in unless override permission is used.
- An expired/cancelled membership cannot check in unless override permission is used.
- Freeze/renew/cancel operations must be auditable.
- A renewal must never accidentally shorten an active membership.

### Attendance
- Check-in validation always runs on the server.
- Duplicate check-ins inside the configured window are blocked by default.
- Overrides require a reason and are audit logged.

### Billing
- Client-provided totals are never trusted.
- Invoice totals are calculated server-side.
- Partial payments update invoice balance deterministically.
- Refunds never erase the original payment.
- Payment state changes must remain internally reconcilable.

### Classes
- Capacity enforcement happens transactionally.
- Waitlist order is deterministic.
- Cancellation must free a slot and may promote the next waitlisted member.

## 5. Next.js Rules
1. Use Server Components by default.
2. Add `"use client"` only when browser state/effects/event interactivity require it.
3. Do not fetch server-owned data from client components if a Server Component can provide it.
4. Use Route Handlers for webhooks/public APIs and Server Actions for authenticated app mutations where appropriate.
5. Keep Prisma imports in server-only modules.
6. Do not leak entire database objects into client components when a minimal DTO is enough.
7. Use framework-supported cache invalidation; do not rely on full-page reloads after mutations.

## 6. UI Rules
1. Use the design tokens and component patterns in `DESIGN.md`.
2. Every screen must include loading, empty, error, and populated states where applicable.
3. Avoid modal overload. Use pages/drawers for complex forms.
4. Destructive actions require confirmation.
5. Forms must display field-level validation errors.
6. Tables use server-side pagination for potentially large data.
7. Do not encode meaning using color alone.
8. Make keyboard focus visible.
9. Avoid horizontal scrolling on normal mobile views except data grids where unavoidable.
10. Dates, money, and status labels must use shared formatters.

## 7. API / Action Response Rules
Use typed result shapes. Example:

```ts
type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; fieldErrors?: Record<string, string[]> } };
```

- Do not throw raw database errors to the UI.
- Map known conflicts to friendly errors.
- Unexpected errors should be logged and return a generic message.

## 8. Audit Logging Rules
Audit at minimum:
- Staff/user role changes.
- Member archival/reactivation.
- Membership create/renew/freeze/unfreeze/cancel/manual date override.
- Attendance overrides.
- Invoice void.
- Payment refund.
- Sensitive settings changes.

Audit records should identify actor, action, entity, time, and safe before/after context.

## 9. Testing Rules
For every domain-critical task:
- Add/update unit or integration tests.
- Test happy path plus at least one invalid/permission path.
- E2E coverage must protect the primary revenue and attendance workflows.

Before marking any task complete, run at least:
```bash
npm run lint
npm run typecheck
npm test
```
Run relevant Playwright tests for completed E2E flows.

## 10. Code Review Self-Checklist
Before declaring a task done, Codex must verify:
- Does the implementation match `PRD.md`?
- Does it preserve architecture boundaries in `ARCHITECTURE.md`?
- Does UI match `DESIGN.md`?
- Is authorization checked server-side?
- Is input validated?
- Are loading/empty/error states handled?
- Are database constraints/indexes adequate?
- Are money/date calculations correct?
- Is sensitive data excluded from logs?
- Are tests added and passing?
- Is `TASKS.md` updated?
- Is `MEMORY.md` updated only with durable decisions/lessons?

## 11. Prohibited Shortcuts
Do not:
- Hardcode the logged-in user.
- Hardcode branch IDs in feature logic.
- Bypass permission checks for convenience.
- Calculate balances only in the client.
- Use localStorage as the source of truth for business data.
- Use mock data in production routes after a feature is marked complete.
- Store passwords in plaintext.
- Create duplicate implementations of the same business rule.
- Hide errors with empty `catch` blocks.
- Mark a task complete when tests/type checks fail.
