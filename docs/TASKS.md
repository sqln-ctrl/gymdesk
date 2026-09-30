# GymFlow — Implementation Tasks

Use this file as the execution backlog. Codex should work in dependency order, update checkboxes only after verification, and avoid starting a later phase while foundational tasks are broken.

## Phase 0 — Project Foundation
- [x] Initialize Next.js App Router project with TypeScript strict mode.
- [x] Configure Tailwind CSS and shadcn/ui.
- [x] Configure ESLint, formatting, typecheck scripts, and test runner.
- [x] Configure environment validation.
- [x] Configure Prisma + SQLite for local development (Supabase/PostgreSQL migration planned).
- [x] Create base application shell.
- [x] Add error boundary/not-found patterns.
- [x] Add shared result/error types.
- [x] Create README setup instructions.

Definition of done:
- App runs locally.
- Database connects.
- Lint/typecheck/tests run from package scripts.
- Base shell is responsive.

## Phase 1 — Data Model and Authentication
- [x] Model Gym and Branch.
- [x] Model User, Role, Permission, role mappings, branch assignments.
- [x] Implement authentication.
- [x] Implement permission helpers.
- [x] Add protected dashboard layout.
- [x] Add owner/admin bootstrap process.
- [x] Add login/logout/password reset flow.
- [x] Add audit-log model/service.
- [x] Seed core roles and permissions.

Tests:
- [x] Unauthorized user blocked.
- [x] Role permission checks.
- [x] Branch scoping.

## Phase 2 — Member Management
- [x] Model Member.
- [x] Member code generation strategy.
- [x] Member list with server-side pagination/search/filter.
- [x] Create member form.
- [x] Edit member.
- [x] Member profile layout/tabs.
- [x] Archive/reactivate member.
- [x] Assign trainer.
- [x] CSV export.
- [x] CSV import with preview and validation.
- [x] Avatar upload.

Tests:
- [x] Duplicate email/phone behavior according to chosen business rule.
- [x] Permission checks.
- [x] Search/filter.

## Phase 3 — Membership Plans and Memberships
- [ ] Model MembershipPlan, Membership, MembershipFreeze.
- [ ] Plan CRUD.
- [ ] Sell/create membership.
- [ ] Membership price calculation.
- [ ] Membership renewal.
- [ ] Freeze/unfreeze.
- [ ] Cancellation.
- [ ] Manual expiry override with privileged permission.
- [ ] Membership status derivation/service.
- [ ] Expiring/expired views.

Tests:
- [ ] Start/end date calculations.
- [ ] Renewal does not shorten an active membership.
- [ ] Freeze extension rules.
- [ ] Cancellation behavior.

## Phase 4 — Billing
- [ ] Model Invoice, InvoiceItem, Payment, Refund.
- [ ] Invoice numbering strategy.
- [ ] Create invoice during membership sale.
- [ ] Record full payment.
- [ ] Record partial payment.
- [ ] Outstanding balance calculation.
- [ ] Receipt view/print layout.
- [ ] Refund workflow.
- [ ] Void invoice workflow.
- [ ] Daily payments view.
- [ ] Payment method filters.

Tests:
- [ ] Money arithmetic in minor units.
- [ ] Partial payment state transitions.
- [ ] Refund records preserve original payment.
- [ ] Transaction consistency.

## Phase 5 — Attendance
- [x] Model Attendance.
- [x] Dedicated check-in screen.
- [x] Search by member code/name/phone.
- [ ] QR code generation for member.
- [x] Scanner-friendly input.
- [x] Membership validation.
- [x] Duplicate check-in prevention.
- [x] Authorized override with reason.
- [x] Recent check-ins list.
- [x] Member attendance history.
- [ ] Attendance reports/aggregates.

Tests:
- [ ] Active membership can check in.
- [ ] Expired/frozen/suspended blocked.
- [ ] Duplicate check-in blocked.
- [ ] Override is permission-gated and audited.

## Phase 6 — Staff and Trainers
- [ ] Staff management screens.
- [ ] Branch assignments.
- [ ] Trainer profile/specialization.
- [ ] Assigned member list.
- [ ] Role change audit log.
- [ ] Staff deactivate/reactivate.

## Phase 7 — Workout Plans
- [ ] Exercise library model/UI.
- [ ] Workout template model/UI.
- [ ] Member workout plan model/UI.
- [ ] Add/edit/reorder workout days/exercises.
- [ ] Sets/reps/weight/rest/duration fields.
- [ ] Duplicate template to member.
- [ ] Trainer-only edit permissions.
- [ ] Member read-only view.

## Phase 8 — Progress Tracking
- [ ] Progress entry model.
- [ ] Add measurement entry.
- [ ] Historical timeline.
- [ ] Recharts metric history charts.
- [ ] Optional progress photos.
- [ ] Secure photo access.

## Phase 9 — Classes and Bookings
- [ ] Model class definition/session/booking/waitlist.
- [ ] Class CRUD.
- [ ] Generate recurring sessions.
- [ ] Calendar view.
- [ ] Member booking.
- [ ] Capacity enforcement.
- [ ] Waitlist.
- [ ] Cancellation + waitlist promotion.
- [ ] Class attendance.

Tests:
- [ ] No overbooking under concurrent requests.
- [ ] Waitlist order deterministic.

## Phase 10 — Equipment and Maintenance
- [ ] Equipment inventory CRUD.
- [ ] Equipment status.
- [ ] Maintenance records.
- [ ] Next service alerts.
- [ ] Maintenance cost report.

## Phase 11 — Dashboard and Reports
- [ ] Role-specific dashboards.
- [ ] Active member stats.
- [ ] Expiry stats.
- [ ] Revenue stats.
- [ ] Attendance trend.
- [ ] Membership plan distribution.
- [ ] Peak hours.
- [ ] Outstanding dues.
- [ ] CSV export utilities.
- [ ] Report date/branch filters.

Performance:
- [ ] Review query plans/indexes for dashboard aggregates.

## Phase 12 — Notifications
- [ ] In-app notification model/UI.
- [ ] Notification templates.
- [ ] Membership expiry job.
- [ ] Payment due job.
- [ ] Class reminder job.
- [ ] Email adapter.
- [ ] Delivery status logging.

Future adapters:
- [ ] WhatsApp.
- [ ] SMS.

## Phase 13 — Settings
- [ ] Gym profile/branding.
- [ ] Branch settings.
- [ ] Currency/timezone.
- [ ] Taxes.
- [ ] Receipt/invoice configuration.
- [ ] Attendance duplicate window.
- [ ] Membership rules.
- [ ] Role/permission management UI.

## Phase 14 — Member Portal
- [ ] Member authentication/association.
- [ ] Membership status.
- [ ] QR member card.
- [ ] Attendance history.
- [ ] Invoice/payment history.
- [ ] Workout plan.
- [ ] Progress charts.
- [ ] Class calendar/bookings.
- [ ] Profile edit for allowed fields.

## Phase 15 — Quality and Production Readiness
- [ ] Full responsive QA.
- [ ] Accessibility pass.
- [ ] Security review.
- [ ] Permission matrix review.
- [ ] Database indexes review.
- [ ] Seed realistic demo data.
- [ ] Add Playwright E2E suite for critical workflows.
- [ ] Add error monitoring integration.
- [ ] Add production logging policy.
- [ ] Document backup/restore.
- [ ] Document deployment.
- [ ] Verify no secrets in repo/client bundle.
- [ ] Verify all migrations from empty database.

## Critical E2E Release Flows
- [ ] Owner logs in and creates a branch/staff user.
- [ ] Receptionist creates a member.
- [ ] Receptionist sells membership and records payment.
- [ ] Member successfully checks in.
- [ ] Expired member is blocked from check-in.
- [ ] Authorized staff renews membership.
- [ ] Trainer creates workout plan for assigned member.
- [ ] Member books a class.
- [ ] Owner views correct revenue and attendance report.

## Optional Phase 2 Features
- [ ] Online payment gateway adapter.
- [ ] WhatsApp/SMS provider.
- [ ] Access-control hardware API.
- [ ] Personal training package/session credits.
- [ ] Diet plans.
- [ ] Payroll/commission tracking.
- [ ] Advanced churn/retention analytics.
- [ ] Multi-tenant SaaS conversion.
