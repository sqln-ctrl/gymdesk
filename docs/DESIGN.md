# GymFlow — Product Design System

## 1. Design Direction
GymFlow should feel like a premium modern operations dashboard: clean, fast, professional, information-dense without looking cluttered.

Keywords:
- modern
- athletic
- trustworthy
- sharp
- minimal
- high-contrast
- operational

Avoid stereotypical bodybuilding visuals, excessive gradients, neon overload, and decorative UI that slows down front-desk work.

## 2. Visual Foundation

### Color Strategy
Use semantic design tokens rather than hardcoded colors inside feature components.

Suggested palette direction:
- Neutral background and surfaces.
- Strong dark text in light mode.
- One confident brand accent (electric green, cyan, blue, or warm orange can be selected during branding).
- Semantic success/warning/danger/info tokens.

Support light mode first and structure tokens so dark mode can be added cleanly.

### Typography
Use a highly legible modern sans-serif such as Inter/Geist.

Hierarchy:
- Page title: 28–32px, semibold/bold.
- Section title: 18–20px, semibold.
- Card title: 14–16px, medium/semibold.
- Body: 14–16px.
- Metadata/table secondary: 12–14px.

Use tabular numbers for finance/metrics where useful.

### Radius and Shadows
- Moderate radius (8–12px) for cards/forms.
- Subtle borders preferred over heavy shadows.
- Use stronger elevation only for menus, popovers, dialogs, and floating elements.

## 3. Application Shell

### Desktop
- Collapsible left sidebar.
- Top bar with branch selector, global search/command, notifications, and user menu.
- Main content uses max-width only where readability benefits; data pages may use full available width.

Sidebar groups:
- Overview
- Members
- Memberships
- Attendance
- Billing
- Trainers & Staff
- Workouts
- Classes
- Equipment
- Reports
- Settings

Role permissions determine visibility, but hidden navigation is never a substitute for server authorization.

### Tablet
- Collapsible/drawer navigation.
- Preserve quick check-in and member search accessibility.

### Mobile
- Member portal is mobile-first.
- Staff admin remains usable with drawer navigation.
- Prefer cards or responsive table patterns for smaller screens.

## 4. Dashboard Design

Top row:
- Active Members
- Today’s Check-ins
- Expiring Soon
- Revenue This Month

Secondary sections:
- Attendance trend chart.
- Revenue trend chart.
- Membership distribution.
- Expiring memberships list.
- Recent payments.
- Alerts.

Do not show more than necessary above the fold. Cards must provide a clear action or decision signal.

## 5. Member List
Toolbar:
- Search input.
- Filters button.
- Branch selector if authorized.
- Status filter.
- Membership filter.
- Add Member primary action.

Table columns:
- Member.
- Member code.
- Phone.
- Plan.
- Expiry.
- Trainer.
- Status.
- Last visit.
- Actions.

Status display:
- Active.
- Expiring soon.
- Expired.
- Frozen.
- Suspended.

Use badges plus text; do not rely on color alone.

## 6. Member Profile
Header:
- Avatar.
- Name + member code.
- Status badge.
- Membership summary.
- Quick actions: Check In, Renew, Record Payment, Edit.

Tabs:
- Overview
- Memberships
- Payments
- Attendance
- Workout
- Progress
- Classes
- Activity

Right-side summary or top summary cards may show:
- Current plan.
- Days until expiry.
- Outstanding dues.
- Visits this month.
- Assigned trainer.

## 7. Front-Desk Check-in Mode
This is a high-priority workflow and should have a dedicated fast screen.

Layout:
- Large search/scan input with autofocus.
- Recent check-ins list.
- Large success/failure state card.

On valid check-in show:
- Member photo.
- Name.
- Plan.
- Expiry.
- Check-in time.
- Success indicator.

On invalid check-in show:
- Exact reason: expired, frozen, suspended, duplicate, no membership.
- Allowed override action only for authorized staff.

The page should be operable primarily by keyboard/scanner.

## 8. Billing Design

Invoice page:
- Member information.
- Invoice number/status.
- Line items.
- Subtotal/discount/tax/total.
- Payment history.
- Balance due.
- Record Payment action.

Payment modal/drawer:
- Amount due.
- Amount received.
- Method.
- Reference.
- Date/time.
- Notes.

Large numeric inputs and clear totals reduce front-desk mistakes.

## 9. Forms
- Group related fields into sections.
- Use 1-column mobile, 2-column desktop where appropriate.
- Required fields clearly marked.
- Inline help text only where valuable.
- Place primary action consistently at the bottom/right on desktop and full-width on mobile when appropriate.
- Disable submit only during submission, not merely because untouched optional fields are blank.

## 10. Data Tables
All major data tables should support as appropriate:
- Search.
- Filters.
- Sort.
- Pagination.
- Column visibility.
- Bulk selection only where a real bulk action exists.

Table states:
- Skeleton loading.
- Useful empty state with next action.
- Error state with retry.

Avoid putting every possible action as a visible icon; use a compact row action menu.

## 11. Charts
- Use charts only when they help identify trends or comparisons.
- Label axes/tooltips clearly.
- Do not use 3D charts.
- Avoid donut charts with many categories.
- Financial numbers must use the configured currency format.

## 12. Notifications and Feedback
- Toast: successful small action, e.g. payment saved.
- Inline alert: blocking form/page issue.
- Dialog: destructive confirmation.
- Banner: system-wide or branch-wide notice.

Use clear wording:
- “Membership renewed until 29 Oct 2026” is better than “Success”.

## 13. Empty States
Examples:
- No members: “No members yet. Add your first member to start managing memberships and attendance.”
- No payments: explain that payments will appear after invoices are paid.
- No classes: offer “Create class”.

Avoid decorative empty states that consume excessive screen space.

## 14. Accessibility
- Semantic buttons/links.
- Visible keyboard focus.
- Label form controls.
- Dialog focus trap/restore.
- Support reduced motion.
- Minimum contrast for body text and controls.
- Meaning is not conveyed by color alone.

## 15. Responsive Breakpoints
Use Tailwind defaults unless real layout needs justify custom values.

Test at minimum:
- 390px mobile.
- 768px tablet.
- 1024px small laptop.
- 1440px desktop.

## 16. Component Inventory
Use/reuse components such as:
- AppSidebar
- TopBar
- BranchSwitcher
- CommandSearch
- PageHeader
- StatCard
- StatusBadge
- DataTable
- FilterBar
- DateRangePicker
- MoneyDisplay
- MemberAvatar
- ConfirmDialog
- FormField
- EmptyState
- ErrorState
- LoadingSkeleton
- ActivityTimeline
- CheckInResultCard
- InvoiceSummary
- PermissionGuard (UI convenience only; not security boundary)

## 17. Page Quality Bar
A page is not complete until:
- It matches app-shell spacing and hierarchy.
- It has loading/empty/error states.
- It works at tested responsive widths.
- Keyboard navigation is reasonable.
- Statuses use consistent badges/labels.
- Actions are permission-aware.
- There is no placeholder lorem ipsum or fake production data.
