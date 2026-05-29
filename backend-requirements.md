# Backend Requirements for Workflow Management Frontend

Last updated: 2026-05-28

---

**Purpose**
This document describes the backend system required to fully support the frontend application in this repository. It covers system overview, main modules, business flows, data models, detailed API requirements (endpoints, methods, request/response schemas, auth, validation and error handling), and backend logic for each frontend feature/page.

**Scope**
Covers all major pages and components in `src/app/*` including projects, tasks (designer/data-collector/quantity surveyor/site engineer), submissions, approvals, customer requests & payments, documents, user management, dashboards, notifications, and integrations (file uploads).

---

## System Overview

The system is a role-based Workflow Manager for interior design and execution. Key personas: Marketing Lead, General Manager, CEO, Designer, Quantity Surveyor, Data Collector, Site Engineer, Finance Officer, System Administrator.

Primary responsibilities:
- Manage projects and track lifecycle stages (lead → design → approval → execution → completed).
- Create and manage tasks for different roles (designer tasks with multi-phase submission and reviews; field data collection tasks with submissions and approvals; quantity surveyor evaluations; site engineer tasks).
- Collect submissions and evidence (images, documents, attachments) and store them reliably.
- Manage customer service requests and transfer to paid customers with payment proof and verification workflow.
- Provide dashboards, metrics and role-specific views, plus notifications and audit trails.

Main backend modules:
- Authentication & Authorization (JWT + RBAC)
- User Management & Roles
- Projects & Project Stages
- Tasks (generic) + Specialized Task Types: DesignerTask, DataCollectorTask, QuantitySurveyorTask
- Submissions, Feedbacks & Approvals
- Designer Applications (applications to tasks)
- Customer Requests & PaidCustomers (payments)
- Documents & File Storage (image/document upload + thumbnails)
- Notifications & Badge Counts
- Dashboards & Reporting
- Audit logs and activity history

---

## Data Models (key fields)
Derived from `src/app/types` and mock data. Use ISO 8601 timestamps.

- User: { id, username, name, role }
- Project: { id, name, clientName, description, stage, createdAt, deadline?, createdBy, assignedTo?, status }
- Task (generic): { id, projectId, title, description, instruction, assignedTo?, assignedBy, status, deadline?, createdAt, approvalStatus?, approvalFeedback?, approvedBy?, approvedAt?, attachments?, telegramScreenshot?, submissions[], feedbacks[] }
- DesignerTask extends Task: { storyPoints }
- Submission: { id, submittedBy, submittedByName?, submittedAt, notes?, attachments[], metadata? }
- Feedback: { id, senderId, senderName?, sentAt, body, version }
- CustomerRequest: { id, customerName, customerPhone, customerEmail?, customerAddress, category, serviceDescription, preferredStartDate?, budget?, notes?, status, createdAt, createdBy, createdByName }
- PaidCustomer extends CustomerRequest with payment fields: { sourceRequestId, transferredAt, transferredBy, transferedByName, paymentNote?, proofOfPayment[], paymentVerificationStatus?, paymentVerificationMessage?, paymentVerifiedAt? }
- Document: { id, projectId?, name, type, uploadedBy, uploadedAt, size, url }
- DesignerTaskApplication: { id, taskId, applicantId, applicantName, applicantRole, message, appliedAt, status, reviewedBy?, reviewedByName?, reviewedAt?, reviewNote? }
- Notification: { id, userId, type, payload, read, createdAt }

Data storage recommendations:
- Relational DB (Postgres) for structured domain objects, relations and queries.
- Object storage (S3-compatible) for file assets (images, PDFs); store URL and metadata in DB.
- Search index (optional) for full-text project/task search (Elasticsearch or Postgres full-text)

---

## Authentication & Authorization

- Authentication: JWT access tokens (short-lived, e.g., 15–60m) + refresh tokens; endpoints: `/auth/login`, `/auth/refresh`, `/auth/logout`.
- Passwords should be stored hashed (bcrypt/argon2). Frontend currently uses demo accounts; backend must accept username/password and return user object and token.
- RBAC: map `User.role` to permission sets. Middleware should enforce per-endpoint role checks (e.g., only `marketing_lead` or `system_administrator` can transfer customer to paid).

Auth scheme: Authorization: `Bearer <access_token>`

---

## Business Flow (high level)

1. User logs in -> receives JWT and role-scoped claims.
2. Users view dashboards and lists filtered by role and assignments.
3. Managers create projects/tasks. Tasks can be assigned to users by ID.
4. Assignees submit evidence (images, files) via Submissions; backend stores attachments and metadata.
5. Managers review submissions: provide feedback, approve, or reject; approvals update task state and may trigger notifications and next-phase logic (designer multi-phase workflow).
6. Customer requests are created by marketing or intake; marketing can transfer to PaidCustomers with payment proof; finance verifies and marks verification outcomes.
7. Notifications and badge counts reflect unseen items; dashboards aggregate metrics.
8. Audit logs keep history for approvals, state changes and file uploads.

---

## Feature-by-Feature Backend Requirements (API endpoints)

Notes: All endpoints return JSON. Standardize error responses: { error: { code: string, message: string, details?: any } } and proper HTTP status codes:
- 200 OK, 201 Created, 204 No Content, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 422 Unprocessable Entity, 500 Internal Server Error.

Use consistent path versioning: `/api/v1/...`.

### 1) Auth / Login (Login page)
- Endpoint: POST /api/v1/auth/login
  - Auth: public
  - Request body: { username: string, password: string }
  - Response 200: { accessToken: string, refreshToken?: string, user: User }
  - Validation: username and password required, max lengths; check account active
  - Errors: 401 invalid credentials

- Endpoint: POST /api/v1/auth/refresh
  - Auth: requires refresh token (cookie or body)
  - Request: { refreshToken }
  - Response: { accessToken, refreshToken }

- Endpoint: POST /api/v1/auth/logout
  - Auth: Bearer
  - Request: optional body
  - Response: 204
  - Logic: revoke refresh token

Backend logic: validate credentials, issue JWT with role claim, store refresh token if used, log login event.

---

### 2) Users & User Management (`UserManagement.tsx`)
- Get users (list + filter): GET /api/v1/users?role=&q=&page=&limit=
  - Auth: admin or manager roles (CEO, general_manager) for full list; personal info for self
  - Response: { data: User[], meta: { total, page, limit } }

- Get user by id: GET /api/v1/users/{id}
  - Auth: admin or self
  - Response: User

- Create user: POST /api/v1/users
  - Auth: system_admin or ceo
  - Request: { username, name, password, role }
  - Response 201: User
  - Validation: unique username, allowed roles

- Update user: PATCH /api/v1/users/{id}
  - Auth: admin or self (limited fields for self)
  - Request: partial fields

- Delete user: DELETE /api/v1/users/{id}
  - Auth: admin

Backend logic: hashing passwords, uniqueness checks, audit log user creation/changes.

---

### 3) Projects (`Projects.tsx`, `ProjectDetails.tsx`)
- List projects: GET /api/v1/projects?stage=&q=&assignedTo=&page=&limit=
  - Auth: authenticated users; filter by role/assignment logic
  - Response: { data: Project[], meta }

- Get project: GET /api/v1/projects/{id}
  - Auth: authenticated, verify access if needed
  - Response: Project + aggregated stats (task counts)

- Create project: POST /api/v1/projects
  - Auth: marketing_lead, general_manager, ceo
  - Request: { name, clientName, description, stage?, deadline?, assignedTo? }
  - Response 201: Project
  - Validation: name required, valid stage

- Update project: PATCH /api/v1/projects/{id}
  - Auth: project creator or manager
  - Request: partial fields

- Delete project: DELETE /api/v1/projects/{id}
  - Auth: admin/ceo

Backend logic: enforce stage transitions, ensure tasks reflect project stage changes, cascade deletion or prevent deletion if active tasks exist.

---

### 4) Generic Tasks + Role-specific Task Boards (`RoleTaskBoard.tsx`, `Tasks.tsx`)

Many pages use task boards; provide a generic tasks API with type field to support specialization.

- List tasks: GET /api/v1/tasks?projectId=&assignedTo=&status=&type=&page=&limit=
  - Auth: authenticated
  - Response: { data: Task[], meta }

- Get task: GET /api/v1/tasks/{id}
  - Auth: authenticated
  - Response: Task (with submissions, feedbacks)

- Create task: POST /api/v1/tasks
  - Auth: ceo, general_manager, marketing_lead (depending on board)
  - Request: { projectId, title, description, instruction, assignedTo?, status?, deadline?, type?: 'generic'|'designer'|'data_collector'|'quantity_surveyor', storyPoints? }
  - Response 201: Task
  - Validation: title, description required; if type==='designer' require storyPoints; assignedTo must be existing user

- Update task: PATCH /api/v1/tasks/{id}
  - Auth: task owner/manager
  - Request: partial updates including status transitions
  - Validation: status allowed values; if approvalStatus changed, capture approvedBy and approvedAt

- Delete task: DELETE /api/v1/tasks/{id}
  - Auth: manager/admin; prevent deletion if submissions exist unless force flag

Backend logic: enforce lifecycle rules (e.g., cannot mark completed without approvals), notify assignees, update project metrics.

---

### 5) Data Collector Tasks (`DataCollectorTasks.tsx`)
These are tasks with submissions that include attachments and approval workflow.

- Create data-collector task: POST /api/v1/tasks (type=data_collector)
  - Request body same as generic task with type

- Submit evidence for a data task: POST /api/v1/tasks/{id}/submissions
  - Auth: assigned user or data collector
  - Request multipart/form-data: { notes?, metadata?: JSON, attachments: files[] }
  - Response 201: Submission
  - Validation: attachments optional but recommended; max file size

- List submissions: GET /api/v1/tasks/{id}/submissions
  - Auth: task owner/manager and assigned users
  - Response: { data: Submission[] }

- Approve submission: POST /api/v1/tasks/{id}/submissions/{submissionId}/approve
  - Auth: managers (ceo/gm)
  - Request: { feedback? }
  - Response 200: updated Task / submission approval flag

- Provide feedback: POST /api/v1/tasks/{id}/feedbacks
  - Auth: manager
  - Request: { body }

Backend logic: store attachments to object storage, create thumbnails, extract metadata, generate notifications and update task approvalStatus and history.

---

### 6) Designer Tasks & Multi-Phase Workflow (`DesignerAssignments.tsx`)
Designer tasks have phased submission progress (caseStudy, designStage, rendering, finalStage), history per phase, approvals, ratings and reviews.

- Create designer task: POST /api/v1/designer-tasks (or POST /api/v1/tasks with type=designer)
  - Request: { projectId, title, description, instruction, storyPoints, assignedTo?, telegramScreenshot? }

- Get designer task progress: GET /api/v1/designer-tasks/{taskId}/progress
  - Auth: managers and assigned designers
  - Response: { caseStudy: { note, screenshot, history[] }, designStage: ..., rendering: ..., finalStage: ... }

- Submit phase update: POST /api/v1/designer-tasks/{taskId}/phases/{phaseKey}/submissions
  - Auth: assigned designer
  - Request: multipart/form-data { note?, file? }
  - Response 201: Phase entry (creates history entry and optional submission)

- Review phase (feedback/approve/reject): POST /api/v1/designer-tasks/{taskId}/phases/{phaseKey}/review
  - Auth: ceo/general_manager or assigned reviewer
  - Request: { action: 'feedback'|'approve'|'reject', message: string }
  - Response: updated phase history
  - Validation: message required for 'reject'

- Ratings/reviews: POST /api/v1/designer-tasks/{taskId}/review
  - Auth: manager/CEO
  - Request: { creativity: number, timeliness: number, clientUnderstanding: number, rendering: number, comment? }

Backend logic: enforce multi-phase progression (cannot submit next phase if previous rejected), store per-phase history, mark final stage required screenshot presence, trigger notifications and badge updates.

---

### 7) Designer Task Applications (`DesignerAssignments` communication area)
- Apply to a designer task: POST /api/v1/designer-task-applications
  - Auth: authenticated (designer)
  - Request: { taskId, message }
  - Response 201: DesignerTaskApplication

- List applications by task: GET /api/v1/designer-task-applications?taskId={id}
  - Auth: task owner/manager

- Update application status (assign/reject): PATCH /api/v1/designer-task-applications/{id}
  - Auth: task owner/manager
  - Request: { status: 'assigned'|'rejected', reviewedBy, reviewNote? }

Backend logic: when assigned, set task.assignedTo and set application status to 'assigned'; notify applicant.

---

### 8) Submissions & Feedbacks (shared)
- Create submission (for task): POST /api/v1/tasks/{taskId}/submissions (see DataCollector section)
- List submissions: GET /api/v1/tasks/{taskId}/submissions
- Add feedback: POST /api/v1/tasks/{taskId}/feedbacks
- Edit / delete feedback: PATCH /api/v1/feedbacks/{id}, DELETE /api/v1/feedbacks/{id}

Validation: feedback body required and not empty; version increments for edits.

Backend logic: store feedback history, link to task and submission, send notifications.

---

### 9) Customer Requests & Paid Customers (`CustomerData.tsx`)
Covers intake form, transfer to paid customers with proof files, payment verification workflow.

- List customer requests: GET /api/v1/customer-requests
  - Auth: marketing_lead, system_administrator, admin views

- Create customer request: POST /api/v1/customer-requests
  - Auth: marketing_lead, any intake role
  - Request: { customerName, customerPhone, customerEmail?, customerAddress, category, serviceDescription, preferredStartDate?, budget?, notes?, otherCategoryDescription? }
  - Response 201: CustomerRequest
  - Validation: required fields enforced; phone number format

- Transfer to paid customers: POST /api/v1/paid-customers
  - Auth: marketing_lead or system_administrator
  - Request multipart/form-data: { sourceRequestId, paymentNote?, proofFiles[] }
  - Response 201: PaidCustomer
  - Validation: proofFiles required if role is marketing_lead (business rule)

- List paid customers: GET /api/v1/paid-customers
  - Auth: marketing_lead, finance_officer, system_administrator

- Payment verification: POST /api/v1/paid-customers/{id}/verify
  - Auth: finance_officer
  - Request: { action: 'verify'|'reject'|'request_clarification', message? }
  - Response: updated PaidCustomer (paymentVerificationStatus)

- Add marketing clarification response: POST /api/v1/paid-customers/{id}/clarify
  - Auth: marketing_lead
  - Request: { description, attachments[] }

Backend logic: store proofs to object storage, run virus scan/size limits, record transferredBy and verify permissions, create audit entries, send notification to finance for verification.

---

### 10) Documents & File Uploads (`mockDocuments`, attachments shown across app)
Files include images, PDFs and other attachments used across tasks, submissions and paid customers.

- Upload file (generic): POST /api/v1/uploads
  - Auth: authenticated
  - Request: multipart/form-data: file, metadata { projectId?, taskId?, purpose }
  - Response 201: { id, url, name, type, size }
  - Validation: allowed file types, max size per role

- Get file metadata: GET /api/v1/uploads/{id}
- Download: GET /api/v1/uploads/{id}/download (signed URL or redirect to S3)
- Delete: DELETE /api/v1/uploads/{id} (auth: uploader or admin)

Backend logic: store files in object storage, generate thumbnails for images, store metadata in DB, generate expiring signed URLs for client downloads.

---

### 11) Approvals & Governance (`Approvals.tsx`, approval UI across tasks)
- Request approval: POST /api/v1/approvals
  - Auth: assigned user
  - Request: { projectId, stage, requestedBy }
  - Response: Approval object

- Review approval: POST /api/v1/approvals/{id}/review
  - Auth: manager/ceo
  - Request: { action: 'approve'|'reject', feedback? }
  - Response: updated Approval and project stage transition if approved

Backend logic: enforce stage guards, create audit records, notify requester.

---

### 12) Notifications & Badge Counts (used by dashboards and highlights)
- Get notifications: GET /api/v1/notifications?userId=&unreadOnly=&limit=
  - Auth: user
  - Response: { data: Notification[] }

- Mark notification read: POST /api/v1/notifications/{id}/read
- Bulk mark read: POST /api/v1/notifications/read

Backend logic: generate notifications for events (new tasks, submissions, approvals, transfer to paid customers), compute badge counts per user, optionally use pub/sub or websocket for real-time updates.

---

### 13) Dashboards & Aggregates (`Dashboard.tsx`, `DesignerPerformanceDashboards.tsx`, `QuantitySurveyorDashboard.tsx`)
Provide aggregated metrics endpoints to power widgets and summary cards.

- GET /api/v1/dashboard/overview
  - Auth: authenticated
  - Response: { projectsCount, tasks: { total, pending, inProgress, completed }, newRequestsCount, notificationsCount, ... }

- GET /api/v1/dashboard/designer-performance?userId=&from=&to=
  - Auth: manager/ceo
  - Response: metrics: { tasksCompleted, averageApprovalTime, ratingAverages, throughput }

- GET /api/v1/dashboard/quantity-surveyor?from=&to=
  - Auth: quantity_surveyor, manager

Backend logic: compute metrics by SQL aggregates, cache heavy queries, precompute reports or use background jobs for large datasets.

---

### 14) Search & Filters
- GET /api/v1/search?q=&type=projects|tasks|customers&page=&limit=
  - Auth: authenticated
  - Response: { hits: [...] }

Backend logic: use DB full-text or search index; apply RBAC filters to results.

---

### 15) Audit Logs
- Logs: write audit entries for critical actions: login, create/update/delete (users, projects, tasks, payments, approvals), file uploads, verification actions.
- Endpoint for admins: GET /api/v1/audit?entity=&action=&from=&to=

---

## Validation Rules (general)
- Use server-side validation for all input data. Examples:
  - Strings: trim, max length (e.g., title 256, description 5000)
  - IDs: UUID or server-generated IDs; reject invalid formats
  - Dates: ISO 8601 check
  - File uploads: max size (e.g., 10MB for images), allowed MIME types
  - Payment proof: image types only (jpeg/png/pdf allowed depending on policy)
  - Numeric ratings: 0–5 with one decimal allowed
  - Role checks: only allowed role values

Return 422 with validation detail when input invalid.

---

## Error Handling
- Centralized error format: { error: { code, message, details? } }
- Map validation errors to 422; auth failures to 401; forbidden to 403; not found to 404.
- Log unexpected errors server-side and return 500 with generic message.

---

## Backend Logic Details (per module)

Authentication
- Validate credentials, issue JWT and refresh tokens, blacklist revoked tokens.
- Rate-limit login attempts.

Projects
- When project stage changes to a new stage, optionally notify assigned users.
- Prevent destructive operations if linked resources exist.

Tasks & Submissions
- Enforce assignment and role-based access on create/update.
- When submission created: store attachments, create Submission DB row, notify owner/manager, increment notification badges.
- Approval logic: approvals carry reviewer, timestamp, feedback; update task approvalStatus; immutable audit trail.
- Designer multi-phase logic: prevent submitting phase N+1 if previous is not approved or is rejected; finalStage requires screenshot (business rule enforced server-side).

Customer Requests & PaidCustomers
- When transferring a CustomerRequest to PaidCustomer: copy fields, attach proof files, set paymentVerificationStatus: 'pending', create task for finance verification and notify finance_officer.
- Finance verification endpoint changes status and records verifiedBy.

Documents & Files
- Use S3-compatible storage with server-generated IDs; perform validations; generate thumbnails/preview for images and PDFs.
- Use virus scanning (ClamAV) for uploads in production.
- Provide signed URLs for downloads.

Notifications
- Persist notifications for each user in DB; for real-time use websockets (socket.io) or server-sent events.
- Badge counts are derived from unread notifications or specific counts (pending reviews) computed separately.

Dashboards & Reports
- Provide cached endpoints for heavy aggregates; background jobs recalc daily/hourly for historical reports.

Scaling & Non-functional
- Use PostgreSQL, S3, and a job queue (Redis + Bull / Sidekiq) for background processing (thumbnail generation, notifications, reports).
- Authentication tokens: short lived and refresh token rotation.
- Rate limiting on uploads and login.
- Logging and monitoring (structured logs, Sentry)

Security
- Sanitize all file inputs and metadata.
- Enforce RBAC checks on each endpoint.
- Encrypt sensitive data at rest if required (payment verification data), and use HTTPS in transit.

---

## Appendix: Mapped Frontend Pages → Required Endpoints
- `/login` → POST /api/v1/auth/login
- `/dashboard` → GET /api/v1/dashboard/overview (+ specialized endpoints)
- `/projects` → GET/POST /api/v1/projects
- `/projects/:id` → GET/PATCH/DELETE /api/v1/projects/{id}
- `RoleTaskBoard` (multiple pages) → GET/POST/PATCH/DELETE /api/v1/tasks (+ type-specific paths)
- `/data-collector-tasks` → same tasks endpoints + POST /api/v1/tasks/{id}/submissions
- `/designer-assignments` → /api/v1/designer-tasks and /api/v1/designer-tasks/{id}/phases/{phase}/submit and /review
- `/designer-applications` → /api/v1/designer-task-applications
- `/customer-data` → /api/v1/customer-requests and /api/v1/paid-customers
- `/paid-customers` → GET /api/v1/paid-customers; POST /api/v1/paid-customers/{id}/verify
- `/documents` → /api/v1/uploads
- `/approvals` → /api/v1/approvals
- `/users` → /api/v1/users

---

## Deliverables & Next Steps
- Backend scaffold (suggested): Node.js + Express / NestJS or Python FastAPI. Use Postgres + TypeORM/Prisma for DB, S3 for storage, Redis for queues.
- Provide OpenAPI spec generated from endpoints above (recommended next step).
- Implement authentication and file upload first (critical path), then tasks and submissions, then customer payments, then dashboards.

If you want, I can now:
- Generate an OpenAPI (Swagger) spec for the endpoints described.
- Scaffold an Express / NestJS project with models, controllers, and example endpoints.

---

End of document.
