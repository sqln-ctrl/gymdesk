# GymFlow — Architecture

## 1. Recommended Stack

### Application
- Next.js 15+ with App Router
- TypeScript (strict mode)
- React Server Components by default
- Server Actions and Route Handlers where appropriate

### UI
- Tailwind CSS
- shadcn/ui
- Lucide icons
- Recharts for analytics charts
- React Hook Form + Zod for complex client forms

### Data
- PostgreSQL
- Prisma ORM
- PostgreSQL full-text/trigram search where beneficial

### Authentication
- Auth.js or a secure equivalent
- Database-backed users/sessions if needed for revocation
- RBAC + fine-grained permission helpers

### Supporting Services
- Object storage: S3-compatible provider for avatars/progress photos
- Email: provider adapter (Resend/Postmark/etc.)
- Background jobs: abstraction that can start with database jobs/cron and later move to Redis/BullMQ or managed queue
- Optional error monitoring: Sentry-compatible setup

## 2. High-Level Architecture

```text
Browser / Mobile Web
       |
       v
Next.js App Router
  |-- Server Components
  |-- Server Actions
  |-- Route Handlers / Webhooks
  |-- Auth + RBAC
  |-- Domain Services
       |
       v
Prisma ORM
       |
       v
PostgreSQL

External adapters:
- Object Storage
- Email
- WhatsApp/SMS (later)
- Payment Gateways (later)
- Access Control Hardware (later)
```

## 3. Architectural Principles
- Keep business rules in domain/service functions, not React components.
- UI components never access Prisma directly.
- Server components may call query/service functions.
- Mutations go through server actions or route handlers with authentication, authorization, validation, and audit logging.
- Use adapters/interfaces around external services.
- Do not over-engineer with microservices for MVP.
- Prefer explicit modules and predictable data flow.

## 4. Suggested Folder Structure

```text
src/
  app/
    (auth)/
      login/
      forgot-password/
    (dashboard)/
      layout.tsx
      dashboard/
      members/
      memberships/
      attendance/
      payments/
      trainers/
      staff/
      workouts/
      progress/
      classes/
      equipment/
      reports/
      settings/
    member-portal/
    api/
      auth/
      webhooks/
      integrations/
  components/
    ui/
    layout/
    data-table/
    charts/
    forms/
    shared/
  features/
    auth/
    branches/
    members/
    memberships/
    attendance/
    billing/
    staff/
    trainers/
    workouts/
    progress/
    classes/
    equipment/
    notifications/
    reports/
    audit/
  lib/
    auth/
    db/
    permissions/
    validation/
    money/
    dates/
    errors/
    storage/
    email/
    jobs/
  server/
    queries/
    services/
    actions/
  types/
  styles/
prisma/
  schema.prisma
  seed.ts
  migrations/
public/
docs/
```

Feature folders may contain schemas, domain types, query helpers, constants, and presentation helpers. Avoid creating a separate layer unless it earns its complexity.

## 5. Core Data Model

### Organization and Branch
- Gym
  - id
  - name
  - logoUrl
  - currency
  - timezone
  - createdAt
  - updatedAt
- Branch
  - id
  - gymId
  - name
  - phone
  - email
  - address
  - isActive

Even if MVP uses one gym, keep `gymId`/`branchId` boundaries explicit where operationally relevant.

### User, Role, Permission
- User
  - id
  - email
  - passwordHash or provider relation
  - name
  - phone
  - status
- Role
- Permission
- UserRole / RolePermission
- StaffProfile
  - userId
  - branch assignments
  - hireDate
  - specialization

Implement permission keys such as:
- member.read
- member.create
- member.update
- membership.sell
- membership.override
- attendance.checkin
- attendance.override
- invoice.read
- payment.record
- payment.refund
- report.finance
- settings.manage

### Member
- id
- gymId
- primaryBranchId
- memberCode
- firstName
- lastName
- phone
- email
- avatarUrl
- dateOfBirth
- emergencyContactName
- emergencyContactPhone
- address
- joinDate
- status
- assignedTrainerId
- notes
- createdAt
- updatedAt

### MembershipPlan
- id
- gymId
- name
- description
- durationValue
- durationUnit
- priceMinor
- registrationFeeMinor
- taxRate
- freezeDaysAllowed
- graceDays
- accessRules JSON only if rules are truly variable
- isActive

### Membership
- id
- memberId
- branchId
- planId
- startDate
- endDate
- status
- priceMinor
- discountMinor
- taxMinor
- totalMinor
- freezeDaysUsed
- cancelledAt
- cancellationReason
- createdById

### MembershipFreeze
- id
- membershipId
- startDate
- endDate
- reason
- extendsExpiry
- createdById

### Attendance
- id
- memberId
- branchId
- checkInAt
- checkOutAt
- method
- sourceUserId
- overrideReason

### Invoice
- id
- memberId
- branchId
- invoiceNumber
- issueDate
- dueDate
- status
- subtotalMinor
- discountMinor
- taxMinor
- totalMinor
- paidMinor
- balanceMinor

### InvoiceItem
- invoiceId
- type
- description
- quantity
- unitPriceMinor
- totalMinor
- membershipId optional

### Payment
- id
- invoiceId
- memberId
- branchId
- amountMinor
- method
- reference
- paidAt
- status
- gatewayProvider
- gatewayTransactionId
- createdById

### Refund
- paymentId
- amountMinor
- reason
- createdById
- createdAt

### Workout
- Exercise
- WorkoutTemplate
- WorkoutTemplateDay
- WorkoutTemplateExercise
- MemberWorkoutPlan
- MemberWorkoutDay
- MemberWorkoutExercise

Prefer normalized tables for exercise structures over deeply nested JSON if the UI needs filtering, reporting, or editing individual items.

### Progress
- ProgressEntry
  - memberId
  - recordedAt
  - weight
  - bodyFat
  - chest
  - waist
  - hips
  - arms
  - thighs
  - notes
- ProgressPhoto
  - progressEntryId
  - fileUrl
  - visibility

### Classes
- FitnessClass
- ClassSession
- ClassBooking
- ClassWaitlistEntry

Recurring classes generate individual sessions so booking/attendance stays deterministic.

### Equipment
- Equipment
- MaintenanceRecord

### Notifications
- Notification
- NotificationDelivery
- NotificationTemplate

### Audit
- AuditLog
  - actorUserId
  - action
  - entityType
  - entityId
  - before JSON (sanitized)
  - after JSON (sanitized)
  - metadata JSON
  - createdAt

Never record passwords, auth tokens, raw payment credentials, or sensitive secrets in audit logs.

## 6. Query and Mutation Patterns

### Queries
- Keep common read operations in `server/queries` or feature query files.
- Every query accepting branch/gym context must scope by authorized branch/gym.
- Select only required fields.
- Server-side paginate large tables.

### Mutations
Each mutation should follow this order:
1. Authenticate.
2. Authorize permission + branch scope.
3. Validate input with Zod.
4. Execute domain service.
5. Use transaction if multiple records must remain consistent.
6. Write audit log.
7. Revalidate cache/path/tag.
8. Return typed success/error result.

## 7. Critical Domain Services
Create explicit service functions for:
- createMember
- createMembership
- renewMembership
- freezeMembership
- cancelMembership
- validateMemberCheckIn
- checkInMember
- createInvoice
- recordPayment
- refundPayment
- assignTrainer
- createWorkoutPlan
- bookClass
- cancelClassBooking

The UI must not duplicate these business rules.

## 8. Money Handling
- Store monetary amounts as integer minor units (`priceMinor`).
- Currency stored at gym/invoice level.
- Use helpers to format and calculate amounts.
- Never calculate financial totals using JS floating-point decimal currency values.
- Recompute totals server-side; never trust client totals.

## 9. Time and Date Handling
- Store timestamps in UTC.
- Store gym timezone (e.g. `Asia/Karachi`) and render operational times accordingly.
- Distinguish all-day dates (membership start/end) from timestamps.
- Avoid accidental expiry changes from timezone conversion.

## 10. Attendance Performance
- Index `memberCode`, member phone/email, membership status/endDate, and attendance memberId/checkInAt.
- Check-in flow should use one optimized member lookup plus membership validation.
- Add duplicate-check logic for recent attendance.
- QR payload should contain a stable opaque identifier, not sensitive member data.

## 11. Security Boundaries
- Never rely on hidden UI as authorization.
- All protected actions verify permission on server.
- Sanitize and constrain uploaded file type/size.
- Signed URLs for private progress photos if supported.
- Rate limit login/reset/check-in public endpoints if exposed.
- Protect webhooks using signature verification.
- Keep secrets server-only.

## 12. Caching
Use caching conservatively:
- Dashboard aggregates may use short-lived cache/tag invalidation.
- Member/payment status shown at check-in must be fresh.
- Do not cache authorization decisions across users incorrectly.

## 13. Error Handling
Define predictable application errors:
- VALIDATION_ERROR
- UNAUTHORIZED
- FORBIDDEN
- NOT_FOUND
- CONFLICT
- MEMBERSHIP_EXPIRED
- MEMBERSHIP_FROZEN
- DUPLICATE_CHECKIN
- PAYMENT_INVALID
- INTEGRATION_ERROR

User-facing messages should be clear; logs can contain technical detail without secrets.

## 14. Testing Strategy

### Unit Tests
- Membership date calculations.
- Freeze extension rules.
- Payment/invoice calculations.
- Permission checks.
- Attendance validation.

### Integration Tests
- Create/renew/freeze/cancel membership.
- Record partial/full payment.
- Check-in eligibility.
- Class capacity and waitlist.

### E2E Tests
Use Playwright for:
- Login.
- Create member.
- Sell membership.
- Record payment.
- Check in member.
- Trainer creates workout plan.
- Member books class.

## 15. Seed Data
Create deterministic demo seed data:
- 1 gym.
- 2 branches.
- Owner, manager, receptionist, trainer accounts.
- 30+ members across active/expired/frozen states.
- 3-4 membership plans.
- Attendance history.
- Sample invoices/payments.
- Sample workout plans.
- Sample classes.
- Equipment and maintenance records.

Do not use production secrets or personally identifiable real-world data.

## 16. Deployment
Recommended deployment model:
- Next.js on Vercel or equivalent Node platform.
- Managed PostgreSQL (Neon/Supabase/RDS/etc.).
- S3-compatible object storage.
- Cron/background job provider for reminders.

Production checklist:
- Migrations applied.
- Seed disabled except explicit demo environment.
- Environment variables validated at startup.
- HTTPS only.
- Backup/restore process documented.
- Error monitoring enabled.
- Admin bootstrap process documented.
