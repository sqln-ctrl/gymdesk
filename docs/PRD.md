# GymFlow — Product Requirements Document (PRD)

## 1. Product Summary
GymFlow is a modern gym management system for gyms, fitness studios, and multi-branch fitness businesses. It centralizes member onboarding, memberships, attendance, payments, trainers, classes, workout plans, equipment, communication, and reporting in one responsive web application.

The first production release should work well for a single gym while keeping the data model branch-aware so multiple locations can be added without a rewrite.

## 2. Product Goals
- Replace spreadsheets, notebooks, and disconnected tools with one operational system.
- Make front-desk workflows fast enough to use during busy gym hours.
- Give management real-time visibility into memberships, revenue, attendance, and retention.
- Give trainers a structured way to manage assigned members and workout plans.
- Give members a clean self-service portal for memberships, attendance history, plans, classes, and profile details.
- Keep the product extensible for QR check-in, WhatsApp/SMS, online payments, access-control hardware, and future mobile apps.

## 3. Primary Users and Roles

### Owner / Super Admin
- Full access to all branches and settings.
- Manage staff roles and permissions.
- View financial and operational reports.
- Configure plans, taxes, payment methods, branding, and integrations.

### Branch Admin / Manager
- Manage members, trainers, memberships, payments, classes, and branch reports.
- Cannot access owner-only system settings unless permission is granted.

### Receptionist
- Register members.
- Sell or renew memberships.
- Record payments.
- Check members in and out.
- View basic member status.
- Limited access to sensitive financial and system settings.

### Trainer
- View assigned members.
- Create and update workout plans.
- Record notes and progress measurements.
- Manage classes assigned to them.

### Member
- View membership status and expiry.
- View attendance history.
- View workout plans.
- Book eligible classes.
- View invoices/payment history.
- Update allowed profile fields.

## 4. Core Modules

### 4.1 Authentication and Authorization
- Email/password login for staff.
- Member login via email/password or magic link in later phase.
- Secure sessions.
- Role-based access control (RBAC).
- Permission checks on every server action/API route.
- Password reset flow.
- Account activation/deactivation.
- Audit trail for security-sensitive actions.

### 4.2 Dashboard
Owner/manager dashboard should show:
- Active members.
- New members this month.
- Memberships expiring in 7/14/30 days.
- Expired memberships.
- Today’s check-ins.
- Monthly revenue.
- Outstanding balances.
- Membership sales by plan.
- Attendance trend.
- Top attendance days/hours.
- Recent payments.
- Alerts for equipment maintenance and expiring plans.

Receptionist dashboard should prioritize:
- Fast member search.
- Quick check-in.
- Expiring memberships.
- Pending dues.
- Today’s classes.

Trainer dashboard should prioritize:
- Assigned members.
- Today’s classes.
- Members requiring workout-plan updates.
- Recent progress entries.

### 4.3 Member Management
Member profile fields:
- Member ID / unique code.
- Full name.
- Profile photo.
- Phone.
- Email.
- Date of birth.
- Gender (optional/configurable).
- Emergency contact.
- Address.
- Join date.
- Branch.
- Status: active, inactive, suspended, archived.
- Notes.
- Tags.
- Assigned trainer.

Member profile should contain tabs for:
- Overview.
- Memberships.
- Payments/invoices.
- Attendance.
- Workout plans.
- Progress.
- Class bookings.
- Notes/activity.

Required actions:
- Create, edit, archive, reactivate.
- Search by name, phone, email, member code.
- Filter by branch, status, trainer, membership plan, expiry range.
- Bulk export CSV.
- Import members from CSV with validation and preview.

### 4.4 Membership Plans
Plan fields:
- Name.
- Description.
- Duration in days/months.
- Price.
- Registration fee.
- Tax configuration.
- Branch availability.
- Access days/times if restricted.
- Freeze allowance.
- Class credits if applicable.
- Status: active/inactive.

Membership lifecycle:
- Draft/pending.
- Active.
- Frozen.
- Expired.
- Cancelled.

Actions:
- New membership.
- Renewal.
- Upgrade/downgrade.
- Freeze/unfreeze with start/end dates and reason.
- Manual expiry adjustment with audit log.
- Cancellation with reason.
- Grace period configuration.

Rules:
- A member may have membership history, but only one primary active membership per branch unless explicitly allowed.
- Expiry is calculated consistently from start date and plan duration.
- Freeze can extend expiry if configured.
- Renewal can begin immediately or after current expiry.

### 4.5 Attendance / Check-in
Check-in methods:
- Member search + button.
- QR code from member profile/card.
- Barcode scanner input treated as keyboard input.
- Future hardware/API integration.

Attendance record:
- Member.
- Branch.
- Check-in timestamp.
- Optional check-out timestamp.
- Method.
- Staff/device source.
- Validation result.

Validation:
- Active membership required unless staff override permission exists.
- Warn or block on expired/suspended/frozen memberships.
- Prevent accidental duplicate check-in within configurable time window.
- Log overrides with staff identity and reason.

UI must return a clear success/error state in under a second after lookup.

### 4.6 Payments, Invoices, and Dues
Payment methods:
- Cash.
- Card.
- Bank transfer.
- Digital wallet.
- Online gateway through provider abstraction.

Features:
- Create invoice for membership or other charge.
- Record full or partial payment.
- Track outstanding balance.
- Payment receipt.
- Refund/void with permission and reason.
- Discounts as fixed amount or percentage.
- Taxes.
- Payment notes/reference number.
- Daily cash summary.
- Revenue by date, branch, plan, and payment method.

Invoice statuses:
- Draft.
- Unpaid.
- Partially paid.
- Paid.
- Voided.
- Refunded.

Money must be stored in integer minor units; never use floating-point arithmetic for balances.

### 4.7 Trainers and Staff
Staff profile:
- Name.
- Contact information.
- Role.
- Branch assignments.
- Status.
- Hire date.
- Optional specialization/certifications.

Trainer features:
- Assigned-member list.
- Member notes.
- Workout plans.
- Progress tracking.
- Class schedule.

### 4.8 Workout Plans
Workout plan structure:
- Plan name.
- Member.
- Trainer.
- Start/end date.
- Goal.
- Days/sessions.
- Exercises per session.
- Sets, reps, weight, duration, rest, notes.
- Plan status.

Exercise library fields:
- Exercise name.
- Category/body part.
- Equipment.
- Instructions.
- Optional image/video URL.

Trainers can duplicate a plan/template and customize it for a member.

### 4.9 Progress Tracking
Record measurements over time:
- Weight.
- Body fat %.
- Chest.
- Waist.
- Hips.
- Arms.
- Thighs.
- Custom notes.

Requirements:
- Historical timeline.
- Charts for numeric metrics.
- Optional progress photos with access restrictions.
- Trainer notes.

### 4.10 Classes and Scheduling
Class fields:
- Name/type.
- Trainer.
- Branch.
- Room/area.
- Start/end time.
- Capacity.
- Recurrence.
- Eligibility rules.

Features:
- Calendar view.
- Member booking/cancellation.
- Capacity enforcement.
- Waitlist.
- Attendance marking.
- Booking cutoff window.

### 4.11 Equipment and Maintenance
Equipment fields:
- Asset code.
- Name.
- Category.
- Branch/location.
- Purchase date.
- Warranty expiry.
- Status: active, under maintenance, retired.
- Last service date.
- Next service date.

Maintenance log:
- Equipment.
- Date.
- Issue/service type.
- Vendor/technician.
- Cost.
- Notes.
- Next due date.

Dashboard should surface overdue maintenance.

### 4.12 Notifications
Notification events:
- Membership expiring.
- Membership expired.
- Payment due.
- Payment receipt.
- Class reminder.
- Class cancelled/rescheduled.
- Staff alerts.

Channels:
- In-app notifications in MVP.
- Email integration.
- WhatsApp/SMS adapter-ready architecture.

Use background jobs/queue abstraction for asynchronous delivery.

### 4.13 Reports
Required reports:
- Active/inactive members.
- Membership expiry.
- New joins.
- Renewals.
- Revenue summary.
- Revenue by plan.
- Payments by method.
- Outstanding dues.
- Attendance by day/week/month.
- Peak hours.
- Member attendance frequency.
- Trainer/member assignment counts.
- Class occupancy.
- Equipment maintenance cost.

Reports must support date range and branch filters, and CSV export where practical.

### 4.14 Settings
- Gym name and logo.
- Branch details.
- Currency and locale.
- Time zone.
- Tax settings.
- Receipt/invoice settings.
- Membership rules.
- Attendance duplicate window.
- Notification templates.
- Role permissions.
- Data retention options.

## 5. Search and Global UX
- Global command/search should quickly locate members, invoices, and staff.
- Tables must support search, filters, sorting, pagination, column visibility, and empty/loading/error states.
- Destructive actions require confirmation.
- Important mutations show toast feedback.
- Forms preserve user input when validation fails.

## 6. Non-Functional Requirements

### Performance
- Main dashboard should become interactive quickly on normal broadband.
- Paginate large tables server-side.
- Avoid loading entire member/payment datasets into the browser.
- Index all common search/filter columns.

### Security
- Hash passwords using a modern adaptive algorithm.
- Enforce authorization server-side.
- Validate all input with schemas.
- Rate-limit authentication and sensitive public endpoints.
- Protect against CSRF where relevant to auth strategy.
- Use secure, HTTP-only cookies for sessions.
- Keep secrets out of client bundles.
- Audit sensitive changes.

### Reliability
- Use database transactions for membership/payment operations that must remain consistent.
- Make payment webhook handlers idempotent.
- Gracefully handle integration failures.
- Daily database backup strategy must be documented for production.

### Accessibility
- WCAG-minded semantic markup.
- Keyboard navigation.
- Visible focus states.
- Form labels and useful validation messages.
- Good color contrast.

### Responsiveness
- Desktop-first for staff operations, fully usable on tablets.
- Member portal mobile-first.

## 7. MVP Scope
Must be production-usable with:
- Authentication + RBAC.
- Branches.
- Dashboard.
- Members.
- Membership plans and memberships.
- Attendance.
- Payments/invoices.
- Staff/trainers.
- Workout plans.
- Basic progress tracking.
- Classes.
- Basic reports.
- Settings.
- Audit logs.

## 8. Phase 2
- WhatsApp/SMS automation.
- Online gateway integrations.
- Door/access-control devices.
- Member mobile app/PWA enhancements.
- Diet plans.
- PT package/session tracking.
- Payroll/commissions.
- Advanced retention/churn analytics.
- Multi-tenant SaaS mode.

## 9. Acceptance Criteria
A release is not complete unless:
- Every role sees only authorized screens/actions.
- Core workflows work end-to-end without manual database edits.
- Membership state accurately controls check-in.
- Invoices, payments, and balances reconcile correctly.
- All core forms validate client and server inputs.
- Responsive layouts are verified at common desktop/tablet/mobile widths.
- Key flows have automated tests.
- Seed data provides a realistic demo environment.
- README includes setup, environment variables, migrations, seeding, and deployment notes.
