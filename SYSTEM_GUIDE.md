# Workflow Management Telegram App - End-to-End System Guide

## 1. Purpose

This application is a Telegram Mini App style workflow management system for a service business that moves work from customer intake through payment verification, approvals, task assignment, execution, and review. The system is intentionally self-contained on the client side so it can run inside a Telegram WebView or a normal browser without a backend dependency.

The core idea is simple: one browser session holds the current user, seeded sample records, workflow state, review history, badge counts, and status transitions. Most actions update `localStorage` and immediately refresh the UI with in-memory state plus custom browser events.

## 2. System Architecture

### 2.1 Frontend Stack

- React single-page application.
- Vite as the build and dev server.
- `react-router-dom` with `HashRouter` so routes work reliably inside Telegram WebView contexts.
- Tailwind CSS and shadcn-style components for the interface.
- Lucide icons for the visual language.
- React Context for authentication state.

### 2.2 Runtime Model

The app does not depend on a remote API server for its workflow data. Instead, it uses:

- `localStorage` for persistence.
- Seed/mock datasets to bootstrap the first session.
- Custom `window.dispatchEvent(...)` notifications to keep badges and summaries in sync.
- Browser APIs such as `FileReader`, `IntersectionObserver`, `URL.createObjectURL`, and `URL.revokeObjectURL`.

This means the system behaves like a lightweight operations simulator: it is persistent inside the browser profile, but there is no database service or REST backend in the current implementation.

### 2.3 Telegram Integration

The app initializes against `window.Telegram?.WebApp` through a small hook. When Telegram is available, the app calls `ready()` and logs Telegram metadata such as color scheme and init data. In a normal browser, the app still works because the Telegram object is optional.

## 3. Entry Point and Session Flow

### 3.1 Startup

The root app wraps the entire route tree in an authentication provider, then mounts a router.

The first visible route is the login page at `/`. Successful login stores the selected mock user in `localStorage` under the `user` key so the session survives refreshes.

### 3.2 Authentication

The authentication model is demo-driven:

- Username/password pairs are matched against an in-memory mock user list.
- On success, the user object is saved in `localStorage`.
- On logout, the user entry is removed and the app returns to `/`.

There is no password hashing, token exchange, or identity provider in the current codebase.

## 4. User Roles and Permissions

The system supports these roles:

| Role | Typical Responsibilities |
| --- | --- |
| CEO | Executive oversight, finance decisions, user management, escalation handling, and leadership review. |
| General Manager | Operational leadership, assignment management, approval review, and cross-team coordination. |
| Marketing Lead | Customer intake, paid-customer handling, and some approval visibility. |
| Finance Officer | Payment verification, clarification requests, and payment status control. |
| Data Collector | Task execution for customer/site data capture. |
| Quantity Surveyor | Cost review of forwarded design submissions and decision workflow coordination. |
| Designer | Open job applications, assigned design tasks, submission progress, and performance visibility. |
| Site Engineer | Field task execution, updates, and evidence capture. |
| System Administrator | Mentioned in some access checks and UI text, but not seeded in the demo login set. |

### 4.1 Permission Pattern

The app uses route guards plus page-level checks:

- Route guards block unauthenticated users.
- Many routes also block users whose role is not in an allow-list.
- Some pages add their own access-denied message even if the route is reachable.
- The layout changes its navigation items based on role.

### 4.2 Role-Specific Navigation Shape

- CEO and General Manager see the broadest navigation surface.
- Finance Officer, Quantity Surveyor, and Site Engineer use simplified, mostly sidebarless layouts or role-focused dashboards.
- Designers get task and job-posting views, not the leadership controls.
- Marketing Lead gets customer intake, paid customer records, and approvals visibility.

## 5. Routing and Navigation Flow

### 5.1 Core Routes

The router is hash-based and role-aware. The main route behavior is:

- `/` opens login.
- `/dashboard` opens a role-specific landing page.
- `/tasks` opens the shared task page for several operational roles.
- `/site-engineer-tasks` opens the Site Engineer-specific task page.
- `/finance-verifications` opens the finance review queue.
- `/paid-customers` opens verified customer records.
- `/customer-data` opens the lead/request intake page.
- `/approvals` opens the approval workspace.
- `/job-postings`, `/designer-applications`, `/designer-assignments`, `/designer-tasks`, `/open-job-postings`, and performance pages support the design workflow.
- `/quantity-surveyor-live`, `/quantity-surveyor-review`, and `/quantity-surveyor-tasks` support the quantity surveyor workflow.

### 5.2 Dashboard Behavior

The dashboard route is not a single static page. It branches by role:

- Finance Officer and Quantity Surveyor are redirected to their own operational views.
- Site Engineer is shown the Site Engineer task page.
- Other roles see the main dashboard.

### 5.3 Redirect Pages

Some routes are thin redirects instead of full pages:

- `/projects` and `/projects/:id` redirect back to the dashboard.
- `/task-applications` redirects to the designer applications page.

This keeps the route surface manageable while still preserving legacy links or navigation targets.

## 6. Page Functionality Guide

### 6.1 Login

The login page authenticates against mock credentials and persists the selected user in browser storage. It is the only entry point when no session is loaded.

### 6.2 Main Dashboard

The main dashboard aggregates status-driven shortcuts and quick access cards:

- Customer requests.
- Paid customers.
- Approvals.
- Designer tasks.
- Open job postings.
- Leadership-facing queues and review summaries.

It also listens for custom badge events so the cards always reflect the latest unseen counts.

### 6.3 Customer Data

This page is the intake point for customer leads and service requests.

It supports:

- Viewing seeded customer requests.
- Adding new requests.
- Storing requests in `localStorage` under `customer-requests`.
- Transferring a request into the paid-customer pipeline.
- Attaching proof of payment files when the current user is a Marketing Lead.

When a request is transferred, it is removed from the customer request list, transformed into a paid customer record, and written to `paid-customers`.

### 6.4 Paid Customers

This page shows records that have been moved beyond intake after payment confirmation.

It includes:

- Highlighted new records.
- Transfer details.
- Payment notes.
- Payment verification status.

The page reads and writes `paid-customers` and publishes the `paid-customers-notifications-updated` event for badge synchronization.

### 6.5 Approvals

This workspace manages payment-related approval flow on top of paid-customer records.

It supports:

- Finance review of pending records.
- Rejection.
- Clarification requests.
- Review history with timestamps and actor metadata.
- Marketing responses to clarification requests.

The page maintains rich state on each record, including finance history and resubmission history, all backed by `paid-customers` in `localStorage`.

### 6.6 Finance Verifications

Finance Verifications is the finance-specific queue for payment evidence and status decisions.

It organizes records into tabs such as:

- Unapproved requests.
- Verified records.
- Rejected records.
- CEO-transferred requests waiting for finance handling.
- Clarification tasks.

Finance actions write status back to the same paid-customer store and record a finance history entry. The page supports statuses such as `pending`, `verified`, `approved`, `rejected`, and `request_clarification`.

### 6.7 Data Collector Tasks

This page stores and manages tasks assigned to data collectors. It behaves like a role-specific task board with local persistence and notification badges. The tasks are stored under a role-specific local storage key and use the same general task patterns as the rest of the app.

### 6.8 Job Postings

The job posting pages support the designer hiring pipeline.

They allow leadership to create job postings, designers to browse open opportunities, and applications to be reviewed and assigned.

### 6.9 Designer Open Job Postings

Designers can view open jobs and submit applications. These pages persist job postings and designer applications, and publish unread-count events so the layout and dashboard can show how many opportunities are waiting.

### 6.10 Designer Applications

This is the leadership review page for designer applications.

The page supports:

- Reviewing incoming applications.
- Assigning or rejecting candidates.
- Updating task and application storage together so assignment decisions stay consistent.

Only CEO and General Manager can access this page in the current route guards.

### 6.11 Designer Assignments

This page is the leadership control center for designer task assignment and review history.

It supports:

- Creating new designer tasks.
- Editing task status.
- Attaching Telegram screenshot evidence.
- Reviewing multi-phase submission history.
- Recording leadership reviews and ratings.

The page persists two major data sets:

- `designer-tasks`
- `designer-submission-progress`

It also stores review records in `designer-task-reviews`.

### 6.12 Designer Tasks

This is the designer-facing execution page.

Designers can:

- View assigned tasks.
- Review phase-by-phase progress.
- Submit phase updates.
- See feedback and approval history.
- Review Telegram evidence images attached to the task flow.

The workflow uses phases such as Case Study, Design Stage, Rendering, and Final Stage. Each phase can store notes, screenshots, and a history trail of feedback and approvals.

### 6.13 Performance Ratings

This page provides performance visibility for leadership and designers. It aggregates review scores and task outcomes so people can see how work is trending over time.

### 6.14 Quantity Surveyor Dashboard

The Quantity Surveyor dashboard is a specialized review board for design submissions forwarded from Telegram.

It supports two operating modes:

- Live queue mode.
- Approval/review mode.

Quantity surveyors can inspect forwarded tasks, submit evaluations, and leadership can make a final decision on those evaluations. Status flow is tracked across `pending_review`, `in_review`, and `record_submitted`.

### 6.15 Quantity Surveyor Tasks

This page acts as the forwarding desk for new design submissions. It lets CEO and General Manager create or forward tasks to the quantity surveyor with Telegram screenshot evidence and budget references.

The page creates a new review task, writes it to the review task store, and adds a corresponding notification item for the quantity surveyor.

### 6.16 Site Engineer Tasks

This page is the site engineer’s field task board.

It supports:

- Status filtering.
- Updating task status.
- Updating task descriptions.
- Tracking highlighted new tasks.
- Viewing attached evidence and project context.

The page reads from the shared task store and filters tasks by the signed-in site engineer.

## 7. End-to-End Business Workflows

### 7.1 Lead to Paid Customer Flow

1. A customer request is created in Customer Data.
2. Marketing Lead reviews the request and transfers it into the paid-customer pipeline.
3. Proof of payment can be attached during transfer.
4. The record is written to `paid-customers` with status `pending`.
5. Finance reviews the record in Finance Verifications or Approvals.
6. Finance sets the payment to verified, rejected, or clarification required.
7. Verified records can continue into the operational/project flow.

### 7.2 Finance Verification Flow

1. A paid customer record appears in the finance queue.
2. Finance opens the detail view and chooses a decision.
3. The system stores the decision, actor, timestamp, and message in the record.
4. The record status becomes verified/approved, rejected, or request clarification.
5. If clarification is required, Marketing can respond and resubmission history is preserved.

### 7.3 Designer Hiring and Task Flow

1. Leadership creates job postings.
2. Designers open the job postings page and apply.
3. Leadership reviews applications.
4. Approved candidates are assigned tasks.
5. Assigned tasks appear in Designer Tasks.
6. Designers submit phase progress and evidence.
7. Leadership reviews the submission history and leaves feedback or approval.

### 7.4 Site Engineer Task Flow

1. Leadership assigns field tasks to site engineers.
2. The site engineer sees only tasks assigned to them.
3. The engineer updates status and descriptions as the work progresses.
4. New task badges are shown until the highlighted cards are viewed.

### 7.5 Quantity Surveyor Review Flow

1. Leadership forwards a design submission into the quantity surveyor queue.
2. The review task stores Telegram evidence and a budget expectation reference.
3. Quantity surveyor opens the task and marks it in review.
4. The surveyor submits cost value, notes, and recommendation.
5. Leadership reviews the evaluation and decides approved or feedback.
6. A decision notification is created and the task moves to the next status.

## 8. Data Storage and Local Persistence

The application uses browser storage as the primary persistence layer. Important keys include:

| Storage Key | Purpose |
| --- | --- |
| `user` | Current authenticated user session. |
| `customer-requests` | Customer intake records. |
| `paid-customers` | Paid customer and finance workflow records. |
| `workflow-tasks` | Shared role task board data for site engineer tasks. |
| `designer-tasks` | Designer task catalog and assignments. |
| `designer-task-applications` | Applications to designer job postings. |
| `designer-submission-progress` | Phase-by-phase designer progress history. |
| `designer-task-reviews` | Leadership review and rating history for designer work. |
| `quantity-surveyor-review-tasks` | Quantity surveyor queue items. |
| `quantity-surveyor-evaluations` | Quantity surveyor evaluation records. |
| `quantity-surveyor-notifications` | Notification feed for quantity surveyor workflow. |

The app seeds data if the key does not exist, then merges existing user edits with the mock baseline on load. This keeps demo data available while preserving changes across refreshes.

## 9. Data Model Summary

### 9.1 Core Entities

- `User`: session identity with role.
- `CustomerRequest`: intake record for a lead.
- `PaidCustomer`: customer record after transfer from intake, plus payment evidence and finance status.
- `Task`: shared operational task object.
- `DesignerTask`: task with story points.
- `DesignerTaskApplication`: designer job application.
- `Approval`: project approval record.
- `QuantityReviewTask`: design submission forwarded to quantity surveyor.
- `QuantityReviewEvaluation`: cost review and decision record.
- `QuantityReviewNotification`: role-targeted notification item.

### 9.2 Statuses and State Machines

The system relies on simple status fields rather than complex workflow engines.

Examples include:

- Customer request status: new, in_review, scheduled, closed.
- Payment verification status: pending, verified, approved, rejected, request_clarification.
- Task status: pending, in_progress, completed, incomplete, rejected.
- Quantity review status: pending_review, in_review, record_submitted.
- Quantity review decision: pending, approved, feedback.

## 10. Notification Logic and Badge Automation

### 10.1 Custom Event Bus

The app uses browser custom events as a lightweight notification bus. Pages publish a count with `window.dispatchEvent(new CustomEvent(...))`, and the layout listens for those events to update badge counters.

Examples include:

- `paid-customers-notifications-updated`
- `data-collector-notifications-updated`
- `quantity-surveyor-notifications-updated`
- `finance-verifications-notifications-updated`
- `approvals-notifications-updated`
- `open-job-postings-notifications-updated`
- `designer-assignments-notifications-updated`
- `designer-tasks-notifications-updated`
- `site-engineer-notifications-v2`

### 10.2 Seen/Unread Behavior

Several pages use an in-memory `Set` to track cards that have been viewed in the current session.

Common behavior pattern:

1. Seed a list of highlighted IDs.
2. Build an unseen set by removing items already viewed in the current session.
3. Use `IntersectionObserver` to detect when highlighted cards are visible.
4. Mark cards as viewed when they are scrolled into view.
5. Recalculate and publish the badge count.

This produces “new item” behavior without a backend notification service.

### 10.3 Role Notification Read State

The quantity surveyor workflow adds a more explicit role-based read model. Notifications contain:

- Target roles.
- Read-by-role tracking.
- Notification type.

The helper `markRoleNotificationsRead(...)` marks workflow notifications as read for a specific role and type.

## 11. Approval and Review Processes

### 11.1 Finance Approval Process

Finance records can be:

- Verified/approved.
- Rejected.
- Returned for clarification.

Each action stores:

- The actor ID and name.
- A timestamp.
- A note or explanation.
- History entries so the audit trail is preserved.

### 11.2 Designer Review Process

Designer progress is phase-based. For each phase, the system stores:

- Draft notes.
- Screenshot evidence.
- Feedback and approval history.
- A snapshot of the designer submission that triggered the review history entry.

This prevents later edits from rewriting the historical meaning of older feedback rows.

### 11.3 Quantity Surveyor Decision Process

The quantity surveyor lifecycle is:

1. Task assigned.
2. Task opened and marked in review.
3. Evaluation submitted.
4. Leadership decision made.
5. Decision notification recorded.

The evaluation record stores cost, notes, recommendation, and final decision metadata.

## 12. Automation and UX Behavior

The system uses a number of client-side automations to make the demo feel operational:

- Seed data is inserted automatically on first load.
- Existing records are merged with seed records so user changes are not lost.
- Dashboard counts update automatically from custom events.
- New cards are visually highlighted until the user sees them.
- Phase history snapshots are created automatically when designer progress is submitted.
- Placeholder evidence images are generated when no screenshot is supplied in some workflows.
- Submitted evaluations automatically create downstream notifications for leadership.
- Some routes automatically redirect to the correct page for the signed-in role.

## 13. APIs and External Services

### 13.1 External Services Used

There is no remote API backend in the current implementation.

The only external service integration is the Telegram Web App runtime, which provides:

- `Telegram.WebApp` access.
- Theme and init data awareness.
- `ready()` lifecycle signaling.

### 13.2 Browser Services Used

The following browser services are important to the system:

- `localStorage` for persistence.
- `FileReader` for image uploads and proof attachments.
- `IntersectionObserver` for read/unread card highlighting.
- `CustomEvent` for badge and notification updates.
- `URL.createObjectURL` and `URL.revokeObjectURL` for temporary file previews.

## 14. Maintenance Notes

### 14.1 Design Constraints

Because the app is client-persistent only, changes are local to the current browser profile. Clearing site data will reset most workflow records back to seeded values.

### 14.2 Safe Extension Points

If the system later gains a backend, the cleanest integration points are:

- The storage helper functions that currently read and write `localStorage`.
- The mock data seed loaders.
- The notification event publishers.
- The auth provider.

### 14.3 Known Structural Pattern

The codebase favors feature-local state management. Each major page owns its own seed data, persistence, and badge logic. That keeps the current demo easy to follow, but it also means cross-module changes should be made carefully so status names, storage keys, and event names stay aligned.

## 15. Operational Summary

End to end, the system works like this:

1. A user logs in with a seeded demo role.
2. The router sends them to the correct dashboard or role page.
3. Data is loaded from `localStorage` and merged with seed records.
4. The user processes a record in their workflow area.
5. That action updates persistent browser state and emits notification events.
6. Leadership pages and dashboards react to those events with live badge updates.
7. The next workflow stage becomes available through status changes and new route targets.

This document reflects the current implementation as a self-contained client application.