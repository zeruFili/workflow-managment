# Backend API Specification — Workflow Management

Generated from analysis of the frontend codebase. This document lists the backend endpoints the frontend expects, grouped by module and role.

## System Overview

### Modules / Features

- **Authentication** — Login, logout, session retrieval
- **User Management** — Create, read, update, delete (soft) users with role and status controls
- **Projects** — CRUD, stage management, assignment
- **Tasks (Generic)** — CRUD, status changes, approval/rejection, attachments
- **Data Collector Tasks** — Task assignments with evidence submissions and multi-feedback
- **Designer Job Postings** — Leadership creates task postings; designers browse
- **Designer Applications** — Designers apply; leadership reviews and assigns/rejects
- **Designer Tasks & Multi-Phase Workflow** — 4-phase gated progression (Case Study → Design Stage → Rendering → Final Stage) with per-phase submissions, leadership review, and ratings
- **Customer Requests** — Intake form, category management, transfer to paid pipeline
- **Paid Customers / Finance Verifications** — Payment proof attachment, finance review with verify/reject/clarify actions, marketing clarification responses
- **Approvals** — Project-stage approval workflow with approve/reject and feedback
- **Quantity Surveyor Workflow** — Forwarding design submissions for cost/quality review, evaluations, leadership decisions, role-targeted notifications
- **Site Engineer Tasks** — Field task board with status updates, descriptions, and evidence
- **Performance Ratings** — Designer performance metrics and review scores
- **Dashboard / Metrics** — Aggregated counts per role
- **Documents / File Uploads** — Image/PDF attachments across tasks, submissions, and paid customers
- **Notifications** — Unread counts, mark-as-read, per-role targeting

### User Roles Detected from the Frontend

| Role | Code |
|------|------|
| CEO | `ceo` |
| General Manager | `general_manager` |
| Marketing Lead | `marketing_lead` |
| Finance Officer | `finance_officer` |
| Data Collector | `data_collector` |
| Quantity Surveyor | `quantity_surveyor` |
| Designer | `designer` |
| Site Engineer | `site_engineer` |

> Authentication model assumed: JWT Bearer tokens (`Authorization: Bearer <token>`). Endpoints that modify data require authentication and role-based authorization.

---

## Role-Based Endpoint Classification

### CEO (`ceo`)

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/users` | `POST /api/users` | `GET /api/users/:id` | `PUT /api/users/:id` | `DELETE /api/users/:id`
- `GET /api/projects` | `POST /api/projects` | `GET /api/projects/:id` | `PUT /api/projects/:id` | `DELETE /api/projects/:id`
- `GET /api/tasks` | `POST /api/tasks` | `GET /api/tasks/:id` | `PUT /api/tasks/:id` | `PATCH /api/tasks/:id/status`
- `POST /api/tasks/:id/approve` | `POST /api/tasks/:id/reject`
- `GET /api/dashboard`
- `GET /api/job-postings` | `POST /api/job-postings`
- `GET /api/job-postings/:id/applications` | `PUT /api/applications/:id`
- `GET /api/designer-tasks` | `POST /api/designer-tasks` | `GET /api/designer-tasks/:id/progress`
- `POST /api/designer-tasks/:id/phases/:phase/review`
- `POST /api/designer-tasks/:id/review`
- `GET /api/designer-performance`
- `GET /api/customer-requests` | `POST /api/customer-requests`
- `GET /api/paid-customers` | `POST /api/paid-customers/:id/verify`
- `GET /api/finance/verifications` | `POST /api/finance/verifications/:id/verify`
- `GET /api/customers` | `POST /api/customers`
- `GET /api/data-collector-tasks` | `POST /api/data-collector-tasks` | `POST /api/tasks/:id/submissions`
- `POST /api/tasks/:id/submissions/:submissionId/approve`
- `POST /api/tasks/:id/feedbacks`
- `GET /api/approvals` | `POST /api/approvals` | `POST /api/approvals/:id/review`
- `GET /api/quantity-review-tasks` | `POST /api/quantity-review-tasks`
- `GET /api/quantity-review-evaluations` | `POST /api/quantity-review-evaluations/:id/decision`
- `GET /api/notifications` | `POST /api/notifications/:id/read` | `POST /api/notifications/read`
- `GET /api/documents` | `POST /api/uploads` | `GET /api/uploads/:id` | `DELETE /api/uploads/:id`

### General Manager (`general_manager`)

- `POST /api/auth/login` | `POST /api/auth/logout` | `GET /api/auth/me`
- `GET /api/users`
- `GET /api/projects` | `POST /api/projects` | `GET /api/projects/:id` | `PUT /api/projects/:id`
- `GET /api/tasks` | `POST /api/tasks` | `GET /api/tasks/:id` | `PUT /api/tasks/:id`
- `POST /api/tasks/:id/approve` | `POST /api/tasks/:id/reject`
- `GET /api/dashboard`
- `GET /api/job-postings` | `POST /api/job-postings`
- `GET /api/job-postings/:id/applications` | `PUT /api/applications/:id`
- `GET /api/designer-tasks` | `POST /api/designer-tasks` | `GET /api/designer-tasks/:id/progress`
- `POST /api/designer-tasks/:id/phases/:phase/review`
- `POST /api/designer-tasks/:id/review`
- `GET /api/designer-performance`
- `GET /api/paid-customers`
- `GET /api/finance/verifications`
- `GET /api/data-collector-tasks` | `POST /api/data-collector-tasks` | `POST /api/tasks/:id/submissions`
- `POST /api/tasks/:id/submissions/:submissionId/approve`
- `POST /api/tasks/:id/feedbacks`
- `GET /api/approvals` | `POST /api/approvals/:id/review`
- `GET /api/quantity-review-tasks` | `POST /api/quantity-review-tasks`
- `GET /api/quantity-review-evaluations` | `POST /api/quantity-review-evaluations/:id/decision`
- `GET /api/notifications`
- `GET /api/dashboard/site-engineer`

### Marketing Lead (`marketing_lead`)

- `POST /api/auth/login` | `GET /api/auth/me`
- `GET /api/tasks?assignedTo=me`
- `GET /api/customer-requests` | `POST /api/customer-requests`
- `POST /api/paid-customers` — transfer a customer request to paid pipeline with proof files
- `GET /api/paid-customers`
- `POST /api/paid-customers/:id/clarify` — respond to finance clarification request
- `GET /api/approvals`
- `GET /api/dashboard`
- `GET /api/notifications`

### Finance Officer (`finance_officer`)

- `POST /api/auth/login` | `GET /api/auth/me`
- `GET /api/finance/verifications`
- `POST /api/finance/verifications/:id/verify`
- `GET /api/paid-customers`
- `GET /api/notifications`

### Data Collector (`data_collector`)

- `POST /api/auth/login` | `GET /api/auth/me`
- `GET /api/tasks?assignedTo=me`
- `GET /api/data-collector-tasks`
- `POST /api/tasks/:id/submissions` — submit evidence (notes, attachments)
- `GET /api/notifications`

### Quantity Surveyor (`quantity_surveyor`)

- `POST /api/auth/login` | `GET /api/auth/me`
- `GET /api/quantity-review-tasks`
- `PUT /api/quantity-review-tasks/:id/status` — mark as in_review
- `POST /api/quantity-review-evaluations` — submit cost evaluation
- `GET /api/quantity-review-evaluations`
- `GET /api/quantity-review-notifications`
- `POST /api/notifications/read`

### Designer (`designer`)

- `POST /api/auth/login` | `GET /api/auth/me`
- `GET /api/designer-tasks` — tasks assigned to this designer
- `POST /api/designer-tasks/:id/phases/:phase/submissions` — submit phase progress
- `GET /api/designer-tasks/:id/progress`
- `GET /api/job-postings` — browse open job postings
- `POST /api/job-postings/:id/applications` — apply to a posting
- `GET /api/designer-performance`
- `GET /api/notifications`

### Site Engineer (`site_engineer`)

- `POST /api/auth/login` | `GET /api/auth/me`
- `GET /api/tasks?assignedTo=me`
- `PUT /api/tasks/:id` — update task description
- `PATCH /api/tasks/:id/status` — change task status
- `POST /api/tasks/:id/attachments` — upload field evidence
- `GET /api/dashboard/site-engineer`
- `GET /api/notifications`

---

## Endpoint Reference (by Module)

All endpoints return JSON using the standard envelope:

```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "message": "Human readable error", "errors": { "field": "reason" } }
```

---

### Authentication

#### Login

- **Endpoint URL**: `POST /api/auth/login`
- **Description**: Authenticate a user and return access/refresh tokens with user profile.
- **Authentication**: NO
- **Required Role(s)**: N/A
- **JWT/Auth Type**: Returns Bearer JWT
- **Request Body**:
  ```json
  {
    "username": "string",
    "password": "string"
  }
  ```
- **Response Example**:
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "accessToken": "eyJhbGci...",
      "refreshToken": "...",
      "user": { "id": "1", "username": "ceo", "name": "Ava", "role": "ceo" }
    }
  }
  ```
- **Validation Rules**: username required, password required (min 6 chars in demo)
- **Error Responses**: `401` — `{ "success": false, "message": "Invalid credentials" }`

#### Logout

- **Endpoint URL**: `POST /api/auth/logout`
- **Description**: Invalidate refresh token. Client clears local session.
- **Authentication**: YES
- **Required Role(s)**: Any authenticated user
- **JWT/Auth Type**: Bearer
- **Request Body**: `{}`
- **Response Example**: `{ "success": true, "message": "Logged out" }`

#### Get Current User

- **Endpoint URL**: `GET /api/auth/me`
- **Description**: Return authenticated user profile and role.
- **Authentication**: YES
- **Required Role(s)**: Any
- **JWT/Auth Type**: Bearer
- **Response Example**:
  ```json
  { "success": true, "data": { "id": "1", "username": "ceo", "name": "Ava", "role": "ceo" } }
  ```

#### Refresh Token

- **Endpoint URL**: `POST /api/auth/refresh`
- **Description**: Exchange a refresh token for a new access token.
- **Authentication**: NO (refresh token in body)
- **Request Body**:
  ```json
  { "refreshToken": "string" }
  ```
- **Response Example**:
  ```json
  { "success": true, "data": { "accessToken": "eyJhbGci...", "refreshToken": "..." } }
  ```

---

### Users

#### List Users

- **Endpoint URL**: `GET /api/users`
- **Description**: Return paginated list of users with role, status, and search filters.
- **Authentication**: YES
- **Required Role(s)**: `ceo`, `general_manager`
- **Query Parameters**: `page`, `perPage`, `role`, `status`, `search`
- **Response Example**:
  ```json
  {
    "success": true,
    "data": [
      { "id": "1", "username": "sarah.j", "name": "Sarah Johnson", "role": "marketing_lead", "email": "sarah@company.com", "phone": "+1 555 1001", "status": "active" }
    ],
    "meta": { "total": 12, "page": 1, "perPage": 20 }
  }
  ```

#### Create User

- **Endpoint URL**: `POST /api/users`
- **Description**: Create a new user (CEO only in frontend). Password is hashed server-side.
- **Authentication**: YES
- **Required Role(s)**: `ceo`
- **Request Body**:
  ```json
  {
    "username": "string",
    "name": "string",
    "email": "string",
    "password": "string",
    "role": "ceo | general_manager | marketing_lead | finance_officer | data_collector | quantity_surveyor | designer | site_engineer",
    "phone": "string (optional)"
  }
  ```
- **Response Example**: `{ "success": true, "message": "User created", "data": { "id": "42" } }`
- **Validation Rules**: username/name/email/password/role required; password min 8 chars; email valid format; username unique; role must be allowed value
- **Error Responses**: `409` — `{ "success": false, "message": "Username already exists" }`

#### Get User

- **Endpoint URL**: `GET /api/users/:id`
- **Description**: Retrieve a single user.
- **Authentication**: YES
- **Required Role(s)**: `ceo`, `general_manager`, or the user themselves
- **Path Parameters**: `id` (string)
- **Response Example**: `{ "success": true, "data": { "id": "3", "username": "emily.c", "name": "Emily Chen", "role": "designer", "email": "emily@company.com", "phone": "+1 555 1003", "status": "active" } }`

#### Update User

- **Endpoint URL**: `PUT /api/users/:id`
- **Description**: Update user profile, role, status, and optionally password.
- **Authentication**: YES
- **Required Role(s)**: `ceo` (for role/status changes), the user themselves (profile fields only)
- **Path Parameters**: `id` (string)
- **Request Body** (partial):
  ```json
  {
    "name": "string",
    "email": "string",
    "phone": "string",
    "role": "string",
    "status": "active | inactive",
    "password": "string (optional, hashed if provided)"
  }
  ```
- **Response Example**: `{ "success": true, "message": "User updated" }`
- **Validation Rules**: If role provided, must be one of allowed roles

#### Delete User (Soft)

- **Endpoint URL**: `DELETE /api/users/:id`
- **Description**: Soft-delete a user by setting `status: 'deleted'` and `deletedAt`.
- **Authentication**: YES
- **Required Role(s)**: `ceo`
- **Path Parameters**: `id` (string)
- **Response Example**: `{ "success": true, "message": "User marked deleted" }`

---

### Projects

#### List Projects

- **Endpoint URL**: `GET /api/projects`
- **Description**: Return projects with optional stage, status, and assignment filters.
- **Authentication**: YES
- **Required Role(s)**: Any authenticated (visibility scoped by role)
- **Query Parameters**: `stage`, `status`, `assignedTo`, `page`, `perPage`, `search`
- **Response Example**:
  ```json
  {
    "success": true,
    "data": [
      { "id": "proj-1", "name": "City Plaza Renovation", "clientName": "City Corp", "description": "...", "stage": "design", "createdBy": "1", "assignedTo": "3", "status": "active", "createdAt": "2026-01-15T...", "deadline": "2026-06-01T..." }
    ],
    "meta": { "total": 15 }
  }
  ```

#### Create Project

- **Endpoint URL**: `POST /api/projects`
- **Description**: Create a new project record.
- **Authentication**: YES
- **Required Role(s)**: `ceo`, `general_manager`
- **Request Body**:
  ```json
  {
    "name": "string",
    "clientName": "string",
    "description": "string",
    "stage": "lead | design | approval | execution | completed",
    "deadline": "ISO8601 string (optional)",
    "assignedTo": "userId (optional)"
  }
  ```
- **Response Example**: `{ "success": true, "message": "Project created", "data": { "id": "proj-10" } }`
- **Validation Rules**: name and clientName required (max 255)

#### Get Project

- **Endpoint URL**: `GET /api/projects/:id`
- **Description**: Retrieve project details including document list and task counts.
- **Authentication**: YES
- **Required Role(s)**: Any authenticated
- **Path Parameters**: `id` (string)
- **Response Example**: `{ "success": true, "data": { ...project, "taskCounts": { "total": 8, "pending": 3 } } }`

#### Update Project

- **Endpoint URL**: `PUT /api/projects/:id`
- **Description**: Update project fields and stage.
- **Authentication**: YES
- **Required Role(s)**: `ceo`, `general_manager`
- **Path Parameters**: `id` (string)
- **Request Body**: partial project fields
- **Response Example**: `{ "success": true, "message": "Project updated" }`

#### Delete Project

- **Endpoint URL**: `DELETE /api/projects/:id`
- **Description**: Soft-delete or archive a project.
- **Authentication**: YES
- **Required Role(s)**: `ceo`
- **Path Parameters**: `id` (string)

#### List Project Tasks

- **Endpoint URL**: `GET /api/projects/:id/tasks`
- **Description**: Return tasks associated with a project.
- **Authentication**: YES
- **Required Role(s)**: Any authenticated
- **Path Parameters**: `id` (string)

#### List Project Documents

- **Endpoint URL**: `GET /api/projects/:id/documents`
- **Description**: Return documents attached to a project.
- **Authentication**: YES
- **Required Role(s)**: Project members, leadership

---

### Tasks (Generic)

#### List Tasks

- **Endpoint URL**: `GET /api/tasks`
- **Description**: Retrieve tasks with filtering by status, assignedTo, assignedBy, projectId, approvalStatus.
- **Authentication**: YES
- **Required Role(s)**: Any (scoped by role)
- **Query Parameters**: `status`, `assignedTo`, `assignedBy`, `projectId`, `approvalStatus`, `page`, `perPage`, `search`, `sort`
- **Response Example**:
  ```json
  {
    "success": true,
    "data": [
      { "id": "task-1", "projectId": "proj-1", "title": "Collect site measurements", "description": "...", "instruction": "...", "assignedTo": "5", "assignedBy": "2", "status": "in_progress", "deadline": "2026-05-25T...", "createdAt": "2026-05-18T...", "approvalStatus": "pending", "attachments": ["..."], "telegramScreenshot": "..." }
    ],
    "meta": { "total": 123 }
  }
  ```

#### Create Task

- **Endpoint URL**: `POST /api/tasks`
- **Description**: Create a new task for a project.
- **Authentication**: YES
- **Required Role(s)**: `ceo`, `general_manager`
- **Request Body**:
  ```json
  {
    "projectId": "string",
    "title": "string",
    "description": "string",
    "instruction": "string",
    "assignedTo": "userId (optional)",
    "assignedBy": "userId",
    "deadline": "ISO8601 (optional)"
  }
  ```
- **Response Example**: `{ "success": true, "message": "Task created successfully", "data": { "id": "task-123" } }`
- **Validation Rules**: title required (max 255), assignedTo must be a valid user ID

#### Get Task

- **Endpoint URL**: `GET /api/tasks/:id`
- **Description**: Get task details including submissions, feedbacks, and attachments.
- **Authentication**: YES
- **Required Role(s)**: Task owner, assignee, or leadership
- **Path Parameters**: `id` (string)

#### Update Task

- **Endpoint URL**: `PUT /api/tasks/:id`
- **Description**: Update title, description, instruction, deadline, assignedTo.
- **Authentication**: YES
- **Required Role(s)**: Task owner (assignedBy) or assignedTo (limited fields), leadership (full edit)
- **Path Parameters**: `id` (string)
- **Request Body**: partial task object
- **Response Example**: `{ "success": true, "message": "Task updated" }`

#### Change Task Status

- **Endpoint URL**: `PATCH /api/tasks/:id/status`
- **Description**: Change the task status (pending, in_progress, completed, incomplete, rejected).
- **Authentication**: YES
- **Required Role(s)**: assignedTo (for their own tasks), leadership
- **Path Parameters**: `id` (string)
- **Request Body**:
  ```json
  { "status": "in_progress | completed | incomplete | rejected" }
  ```
- **Response Example**: `{ "success": true, "message": "Status updated" }`

#### Approve Task

- **Endpoint URL**: `POST /api/tasks/:id/approve`
- **Description**: Leadership approves a task; sets approvalStatus='approved', approvedBy, approvedAt.
- **Authentication**: YES
- **Required Role(s)**: `ceo`, `general_manager`
- **Path Parameters**: `id` (string)
- **Request Body**:
  ```json
  { "feedback": "string (optional)" }
  ```
- **Response Example**: `{ "success": true, "message": "Task approved" }`

#### Reject Task

- **Endpoint URL**: `POST /api/tasks/:id/reject`
- **Description**: Leadership rejects a task with mandatory feedback.
- **Authentication**: YES
- **Required Role(s)**: `ceo`, `general_manager`
- **Path Parameters**: `id` (string)
- **Request Body**:
  ```json
  { "feedback": "string" }
  ```
- **Validation Rules**: feedback required
- **Response Example**: `{ "success": true, "message": "Task rejected" }`

#### Upload Task Attachments

- **Endpoint URL**: `POST /api/tasks/:id/attachments`
- **Description**: Upload files attached to a task (images, documents, measurement files).
- **Authentication**: YES
- **Required Role(s)**: assignedTo or any role that can upload evidence
- **Path Parameters**: `id` (string)
- **Content-Type**: `multipart/form-data`
- **Form Fields**: `file` (binary), `label` (optional)
- **Validation Rules**: Max file size 10MB; allowed types: `image/*`, `application/pdf`, `.docx`, `.xlsx`
- **Response Example**: `{ "success": true, "data": { "attachmentId": "att-123", "url": "/uploads/att-123.jpg" } }`
- **Error Responses**: `413` — `{ "success": false, "message": "File too large" }`

#### List Task Submissions

- **Endpoint URL**: `GET /api/tasks/:id/submissions`
- **Description**: List all submissions for a task.
- **Authentication**: YES
- **Required Role(s)**: Task owner, assignee, or leadership
- **Path Parameters**: `id` (string)

#### Create Submission

- **Endpoint URL**: `POST /api/tasks/:id/submissions`
- **Description**: Submit evidence for a task (data collectors, site engineers).
- **Authentication**: YES
- **Required Role(s)**: assignedTo
- **Path Parameters**: `id` (string)
- **Content-Type**: `multipart/form-data`
- **Form Fields**: `notes` (string, optional), `metadata` (JSON string, optional), `attachments` (file[], optional)
- **Validation Rules**: attachments optional but encouraged; max 10MB per file
- **Response Example**: `{ "success": true, "data": { "id": "sub-10", "submittedBy": "7", "submittedAt": "...", "notes": "...", "attachments": ["/uploads/..."] } }`

#### Approve Submission

- **Endpoint URL**: `POST /api/tasks/:id/submissions/:submissionId/approve`
- **Description**: Leadership approves a data collector submission.
- **Authentication**: YES
- **Required Role(s)**: `ceo`, `general_manager`
- **Path Parameters**: `id` (string), `submissionId` (string)
- **Request Body**:
  ```json
  { "feedback": "string (optional)" }
  ```
- **Response Example**: `{ "success": true, "message": "Submission approved" }`

#### Add Feedback

- **Endpoint URL**: `POST /api/tasks/:id/feedbacks`
- **Description**: Add feedback on a task or submission.
- **Authentication**: YES
- **Required Role(s)**: Leadership, task owner
- **Path Parameters**: `id` (string)
- **Request Body**:
  ```json
  { "body": "string (rich text / HTML)" }
  ```
- **Validation Rules**: body required and not empty; version auto-increments
- **Response Example**: `{ "success": true, "data": { "id": "fb-3", "senderId": "1", "sentAt": "...", "body": "...", "version": 1 } }`

#### Edit / Delete Feedback

- **Endpoint URL**: `PATCH /api/feedbacks/:id` / `DELETE /api/feedbacks/:id`
- **Description**: Edit or delete a feedback entry.
- **Authentication**: YES
- **Required Role(s)**: Feedback author
- **Path Parameters**: `id` (string)

---

### Designer / Job Postings & Applications

#### List Job Postings

- **Endpoint URL**: `GET /api/job-postings`
- **Description**: List job postings/designer tasks open for application.
- **Authentication**: YES (applications require auth, browsing may be open)
- **Query Parameters**: `status`, `projectId`, `page`, `perPage`
- **Response Example**:
  ```json
  {
    "success": true,
    "data": [
      { "id": "job-post-1", "title": "Draft Living Room Elevation", "description": "...", "instruction": "...", "projectId": "...", "storyPoints": 8, "status": "pending", "createdAt": "...", "deadline": "..." }
    ]
  }
  ```

#### Create Job Posting

- **Endpoint URL**: `POST /api/job-postings`
- **Description**: Leadership creates a task posting for designers to apply.
- **Authentication**: YES
- **Required Role(s)**: `ceo`, `general_manager`
- **Request Body**:
  ```json
  {
    "projectId": "string",
    "title": "string",
    "description": "string",
    "instruction": "string",
    "storyPoints": "number",
    "deadline": "ISO8601 (optional)",
    "telegramScreenshot": "string (optional)"
  }
  ```
- **Response Example**: `{ "success": true, "data": { "id": "job-post-7" } }`
- **Validation Rules**: title required; storyPoints must be a positive integer

#### Update Job Posting

- **Endpoint URL**: `PUT /api/job-postings/:id`
- **Description**: Update a job posting.
- **Authentication**: YES
- **Required Role(s)**: `ceo`, `general_manager`
- **Path Parameters**: `id` (string)

#### Delete Job Posting

- **Endpoint URL**: `DELETE /api/job-postings/:id`
- **Description**: Delete a job posting.
- **Authentication**: YES
- **Required Role(s)**: `ceo`, `general_manager`
- **Path Parameters**: `id` (string)

#### List Applications for a Posting

- **Endpoint URL**: `GET /api/job-postings/:id/applications`
- **Description**: Leadership lists all applications for a job posting.
- **Authentication**: YES
- **Required Role(s)**: `ceo`, `general_manager`
- **Path Parameters**: `id` (string)

#### Submit Application (Designer)

- **Endpoint URL**: `POST /api/job-postings/:id/applications`
- **Description**: Designer applies to a job posting with a message.
- **Authentication**: YES
- **Required Role(s)**: `designer`
- **Path Parameters**: `id` (string)
- **Request Body**:
  ```json
  { "message": "string" }
  ```
- **Validation Rules**: message required
- **Response Example**: `{ "success": true, "data": { "applicationId": "app-123" } }`

#### Update Application Status (Review/Assign)

- **Endpoint URL**: `PUT /api/applications/:id`
- **Description**: Leadership accepts (assigns) or rejects a designer application.
- **Authentication**: YES
- **Required Role(s)**: `ceo`, `general_manager`
- **Path Parameters**: `id` (string)
- **Request Body**:
  ```json
  {
    "status": "assigned | rejected",
    "reviewedBy": "userId",
    "reviewNote": "string (optional)"
  }
  ```
- **Validation Rules**: When status is `assigned`, the applicant becomes the task's `assignedTo`
- **Response Example**: `{ "success": true, "message": "Application status updated" }`

---

### Designer Tasks (Multi-Phase Workflow)

Designer tasks follow a 4-phase gated progression: **Case Study** → **Design Stage** → **Rendering** → **Final Stage**. Each phase requires leadership review before the next can be started.

#### List Designer Tasks

- **Endpoint URL**: `GET /api/designer-tasks`
- **Description**: List designer tasks. Designers see their assigned tasks; leadership sees all.
- **Authentication**: YES
- **Required Role(s)**: `ceo`, `general_manager`, `designer` (scoped to assigned)
- **Query Parameters**: `assignedTo`, `status`, `page`, `perPage`

#### Create Designer Task

- **Endpoint URL**: `POST /api/designer-tasks`
- **Description**: Leadership creates a designer task with story points.
- **Authentication**: YES
- **Required Role(s)**: `ceo`, `general_manager`
- **Request Body**:
  ```json
  {
    "projectId": "string",
    "title": "string",
    "description": "string",
    "instruction": "string",
    "storyPoints": "number",
    "assignedTo": "userId (optional)",
    "telegramScreenshot": "string (optional)",
    "deadline": "ISO8601 (optional)"
  }
  ```
- **Response Example**: `{ "success": true, "data": { "id": "dtask-1" } }`
- **Validation Rules**: title required; storyPoints required (positive integer)

#### Get Designer Task Progress

- **Endpoint URL**: `GET /api/designer-tasks/:id/progress`
- **Description**: Get the multi-phase progress for a designer task (all 4 phases with history).
- **Authentication**: YES
- **Required Role(s)**: Assigned designer, `ceo`, `general_manager`
- **Path Parameters**: `id` (string)
- **Response Example**:
  ```json
  {
    "success": true,
    "data": {
      "caseStudy": { "note": "...", "screenshot": "/uploads/...", "history": [{ "status": "approved", "message": "...", "timestamp": "...", "designerSubmission": { ... } }] },
      "designStage": { "note": "", "screenshot": null, "history": [] },
      "rendering": { "note": "", "screenshot": null, "history": [] },
      "finalStage": { "note": "", "screenshot": null, "history": [] }
    }
  }
  ```

#### Submit Phase Progress (Designer)

- **Endpoint URL**: `POST /api/designer-tasks/:id/phases/:phase/submissions`
- **Description**: Designer submits work for a specific phase (caseStudy, designStage, rendering, finalStage).
- **Authentication**: YES
- **Required Role(s)**: assigned `designer`
- **Path Parameters**: `id` (string), `phase` — one of `caseStudy | designStage | rendering | finalStage`
- **Content-Type**: `multipart/form-data`
- **Form Fields**: `note` (string, optional), `file` (binary, optional — image)
- **Validation Rules**: Cannot submit if previous phase is not approved; finalStage requires a screenshot
- **Response Example**: `{ "success": true, "data": { "phase": "caseStudy", "note": "...", "screenshot": "/uploads/...", "submittedAt": "..." } }`

#### Review Phase (Leadership Feedback/Approve/Reject)

- **Endpoint URL**: `POST /api/designer-tasks/:id/phases/:phase/review`
- **Description**: Leadership reviews a phase submission with approve/feedback/reject action.
- **Authentication**: YES
- **Required Role(s)**: `ceo`, `general_manager`
- **Path Parameters**: `id` (string), `phase` (string)
- **Request Body**:
  ```json
  {
    "action": "approve | feedback | reject",
    "message": "string"
  }
  ```
- **Validation Rules**: message required for `reject`; when `approved`, the next phase is unlocked
- **Response Example**: `{ "success": true, "data": { "history": [{ "status": "approved", "message": "...", "timestamp": "..." }] } }`

#### Submit Designer Performance Review

- **Endpoint URL**: `POST /api/designer-tasks/:id/review`
- **Description**: Leadership submits a performance rating for a completed designer task.
- **Authentication**: YES
- **Required Role(s)**: `ceo`, `general_manager`
- **Path Parameters**: `id` (string)
- **Request Body**:
  ```json
  {
    "creativity": "number (0-5)",
    "timeliness": "number (0-5)",
    "clientUnderstanding": "number (0-5)",
    "rendering": "number (0-5)",
    "comment": "string (optional)"
  }
  ```
- **Validation Rules**: All ratings required, values 0–5 with one decimal allowed

---

### Data Collector Tasks

#### List Data Collector Tasks

- **Endpoint URL**: `GET /api/data-collector-tasks`
- **Description**: List data collector tasks with submissions and feedbacks.
- **Authentication**: YES
- **Required Role(s)**: `ceo`, `general_manager`, `data_collector` (scoped to assigned)
- **Query Parameters**: `status`, `assignedTo`, `page`, `perPage`

#### Create Data Collector Task

- **Endpoint URL**: `POST /api/data-collector-tasks`
- **Description**: Leadership creates a data collection task.
- **Authentication**: YES
- **Required Role(s)**: `ceo`, `general_manager`
- **Request Body**:
  ```json
  {
    "projectId": "string",
    "title": "string",
    "description": "string",
    "instruction": "string",
    "assignedTo": "userId",
    "deadline": "ISO8601 (optional)"
  }
  ```
- **Response Example**: `{ "success": true, "data": { "id": "dc-task-6" } }`

---

### Customer Requests

#### List Customer Requests

- **Endpoint URL**: `GET /api/customer-requests`
- **Description**: List customer service request records.
- **Authentication**: YES
- **Required Role(s)**: `marketing_lead`, `ceo`, `general_manager`
- **Query Parameters**: `status`, `category`, `page`, `perPage`, `search`

#### Create Customer Request

- **Endpoint URL**: `POST /api/customer-requests`
- **Description**: Create a new customer intake record.
- **Authentication**: YES
- **Required Role(s)**: `marketing_lead`
- **Request Body**:
  ```json
  {
    "customerName": "string",
    "customerPhone": "string",
    "customerEmail": "string (optional)",
    "customerAddress": "string",
    "category": "home_design | finishing_work | hair_salon_design | other",
    "serviceDescription": "string",
    "preferredStartDate": "ISO8601 (optional)",
    "budget": "string (optional)",
    "notes": "string (optional)",
    "otherCategoryDescription": "string (required if category is 'other')"
  }
  ```
- **Response Example**: `{ "success": true, "data": { "id": "cr-6" } }`
- **Validation Rules**: customerName, customerPhone, customerAddress, category, serviceDescription required; phone number format validation

#### Get Customer Request

- **Endpoint URL**: `GET /api/customer-requests/:id`
- **Description**: Get a single customer request.
- **Authentication**: YES
- **Required Role(s)**: `marketing_lead`, `ceo`, `general_manager`
- **Path Parameters**: `id` (string)

#### Update Customer Request

- **Endpoint URL**: `PUT /api/customer-requests/:id`
- **Description**: Update a customer request.
- **Authentication**: YES
- **Required Role(s)**: `marketing_lead`
- **Path Parameters**: `id` (string)

#### Delete Customer Request

- **Endpoint URL**: `DELETE /api/customer-requests/:id`
- **Description**: Delete a customer request record.
- **Authentication**: YES
- **Required Role(s)**: `marketing_lead`, `ceo`
- **Path Parameters**: `id` (string)

---

### Paid Customers

#### List Paid Customers

- **Endpoint URL**: `GET /api/paid-customers`
- **Description**: List paid customer records (transferred from customer requests).
- **Authentication**: YES
- **Required Role(s)**: `marketing_lead`, `finance_officer`, `ceo`, `general_manager`
- **Query Parameters**: `paymentVerificationStatus`, `page`, `perPage`, `search`

#### Transfer to Paid Customers

- **Endpoint URL**: `POST /api/paid-customers`
- **Description**: Marketing Lead transfers a customer request into the paid pipeline with payment proof.
- **Authentication**: YES
- **Required Role(s)**: `marketing_lead`
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `sourceRequestId` (string, required) — ID of the `CustomerRequest` to transfer
  - `paymentNote` (string, optional)
  - `proofFiles` (file[], required for `marketing_lead` — images of payment receipts)
- **Validation Rules**: proofFiles required when role is `marketing_lead`; accepted types `image/*`, `application/pdf`; max 10MB each
- **Response Example**: `{ "success": true, "data": { "id": "paid-9", "paymentVerificationStatus": "pending" } }`

#### Get Paid Customer

- **Endpoint URL**: `GET /api/paid-customers/:id`
- **Description**: Get a single paid customer with full payment verification history.
- **Authentication**: YES
- **Required Role(s)**: `marketing_lead`, `finance_officer`, `ceo`, `general_manager`
- **Path Parameters**: `id` (string)

#### Verify Payment (Finance)

- **Endpoint URL**: `POST /api/paid-customers/:id/verify`
- **Description**: Finance Officer verifies, rejects, or requests clarification on a payment.
- **Authentication**: YES
- **Required Role(s)**: `finance_officer`
- **Path Parameters**: `id` (string)
- **Request Body**:
  ```json
  {
    "action": "verify | reject | request_clarification",
    "message": "string"
  }
  ```
- **Validation Rules**: action required (one of the three values); message required
- **Response Example**: `{ "success": true, "data": { "paymentVerificationStatus": "verified", "paymentVerifiedAt": "...", "paymentVerifiedBy": "6" } }`

#### Submit Clarification (Marketing)

- **Endpoint URL**: `POST /api/paid-customers/:id/clarify`
- **Description**: Marketing Lead responds to a finance clarification request with description and attachment images.
- **Authentication**: YES
- **Required Role(s)**: `marketing_lead`
- **Path Parameters**: `id` (string)
- **Content-Type**: `multipart/form-data`
- **Form Fields**: `description` (string, required), `attachments` (file[], required — images)
- **Validation Rules**: description required; at least one image attachment required
- **Response Example**: `{ "success": true, "data": { "marketingClarificationResponse": { "description": "...", "respondedAt": "...", "respondedBy": "1" } } }`

---

### Finance Verifications (Dedicated Page)

The Finance Verifications page organizes paid customer records into 5 tabs: `unapproved-request`, `verified-records`, `rejected-records`, `ceo-approved-requests`, `request-clarification-task`.

#### List Finance Verifications

- **Endpoint URL**: `GET /api/finance/verifications`
- **Description**: List all records needing or having undergone finance verification, organized by tab.
- **Authentication**: YES
- **Required Role(s)**: `finance_officer`, `ceo`, `general_manager`
- **Query Parameters**: `tab` — `unapproved-request | verified-records | rejected-records | ceo-approved-requests | request-clarification-task`
- **Response Example**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "pc-fin-1",
        "customerName": "Nadia Hassan",
        "paymentVerificationStatus": "pending",
        "financeHistory": [{ "id": "fh-1", "action": "verify", "note": "...", "actorId": "6", "actorName": "Finance Lead", "timestamp": "..." }],
        "proofOfPayment": [{ "name": "receipt.jpg", "type": "image/jpeg", "size": "124 KB", "url": "/uploads/..." }]
      }
    ]
  }
  ```

#### Verify Finance Record

- **Endpoint URL**: `POST /api/finance/verifications/:id/verify`
- **Description**: Finance officer makes a decision on a verification record.
- **Authentication**: YES
- **Required Role(s)**: `finance_officer`
- **Path Parameters**: `id` (string)
- **Request Body**:
  ```json
  {
    "action": "verify | reject | clarify",
    "note": "string"
  }
  ```
- **Response Example**: `{ "success": true, "message": "Finance decision recorded" }`

#### CEO Approve Finance Record

- **Endpoint URL**: `POST /api/finance/verifications/:id/ceo-approve`
- **Description**: CEO approves a finance record for verification.
- **Authentication**: YES
- **Required Role(s)**: `ceo`
- **Path Parameters**: `id` (string)
- **Request Body**:
  ```json
  { "note": "string (optional)" }
  ```

---

### Approvals

#### List Approvals

- **Endpoint URL**: `GET /api/approvals`
- **Description**: List project-stage approval items awaiting leadership review.
- **Authentication**: YES
- **Required Role(s)**: `ceo`, `general_manager`
- **Query Parameters**: `status`, `stage`, `page`, `perPage`
- **Response Example**:
  ```json
  {
    "success": true,
    "data": [
      { "id": "appr-1", "projectId": "proj-1", "stage": "design", "status": "pending", "requestedBy": "3", "requestedAt": "..." }
    ]
  }
  ```

#### Create Approval Request

- **Endpoint URL**: `POST /api/approvals`
- **Description**: Request approval for a project stage.
- **Authentication**: YES
- **Required Role(s)**: Assigned user
- **Request Body**:
  ```json
  {
    "projectId": "string",
    "stage": "lead | design | approval | execution | completed",
    "requestedBy": "userId"
  }
  ```
- **Response Example**: `{ "success": true, "data": { "id": "appr-5" } }`

#### Review Approval

- **Endpoint URL**: `POST /api/approvals/:id/review`
- **Description**: Leadership approves or rejects a project-stage approval request.
- **Authentication**: YES
- **Required Role(s)**: `ceo`, `general_manager`
- **Path Parameters**: `id` (string)
- **Request Body**:
  ```json
  {
    "action": "approve | reject",
    "feedback": "string (optional)"
  }
  ```
- **Response Example**: `{ "success": true, "data": { "status": "approved", "reviewedBy": "2", "reviewedAt": "..." } }`

---

### Quantity Surveyor Workflow

#### List Quantity Review Tasks

- **Endpoint URL**: `GET /api/quantity-review-tasks`
- **Description**: List all design submissions forwarded for quantity/cost review.
- **Authentication**: YES
- **Required Role(s)**: `quantity_surveyor`, `ceo`, `general_manager`
- **Query Parameters**: `status` — `pending_review | in_review | record_submitted`
- **Response Example**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "qs-review-1",
        "jobId": "JOB-101",
        "designWorkReference": "DW-501",
        "telegramScreenshot": "/uploads/...",
        "telegramScreenshotDescription": "Initial sketch from designer",
        "description": "Two-storey residential extension...",
        "designerName": "Alice Johnson",
        "submissionDate": "2026-05-20T...",
        "budgetExpectationReference": "BUD-901",
        "status": "pending_review",
        "assignedTo": "11",
        "createdBy": "user-1",
        "createdAt": "2026-05-20T..."
      }
    ]
  }
  ```

#### Create Quantity Review Task (Forward)

- **Endpoint URL**: `POST /api/quantity-review-tasks`
- **Description**: Leadership forwards a design submission for quantity/cost review.
- **Authentication**: YES
- **Required Role(s)**: `ceo`, `general_manager`
- **Request Body**:
  ```json
  {
    "jobId": "string",
    "designWorkReference": "string",
    "telegramScreenshot": "string (file URL or data URL)",
    "telegramScreenshotDescription": "string",
    "description": "string",
    "designerName": "string",
    "submissionDate": "ISO8601",
    "budgetExpectationReference": "string (optional)",
    "assignedTo": "userId"
  }
  ```
- **Response Example**: `{ "success": true, "data": { "id": "qs-review-6" } }`
- **Side Effects**: Creates a notification for the assigned quantity surveyor

#### Update Quantity Review Task Status

- **Endpoint URL**: `PATCH /api/quantity-review-tasks/:id/status`
- **Description**: Quantity surveyor marks a task as `in_review`.
- **Authentication**: YES
- **Required Role(s)**: `quantity_surveyor`
- **Path Parameters**: `id` (string)
- **Request Body**:
  ```json
  { "status": "in_review" }
  ```

#### List Quantity Review Evaluations

- **Endpoint URL**: `GET /api/quantity-review-evaluations`
- **Description**: List evaluation records for quantity review tasks.
- **Authentication**: YES
- **Required Role(s)**: `quantity_surveyor`, `ceo`, `general_manager`
- **Query Parameters**: `taskId`, `decision`

#### Submit Quantity Review Evaluation

- **Endpoint URL**: `POST /api/quantity-review-evaluations`
- **Description**: Quantity surveyor submits a cost evaluation for a review task.
- **Authentication**: YES
- **Required Role(s)**: `quantity_surveyor`
- **Request Body**:
  ```json
  {
    "taskId": "string",
    "designCostValue": "string",
    "evaluationNotes": "string",
    "recommendation": "recommended_for_approval | recommends_revision"
  }
  ```
- **Response Example**: `{ "success": true, "data": { "id": "qs-eval-3" } }`
- **Side Effects**: Creates an `evaluation_submitted` notification for leadership roles

#### Submit Leadership Decision on Evaluation

- **Endpoint URL**: `POST /api/quantity-review-evaluations/:id/decision`
- **Description**: Leadership makes a final decision (approved/feedback) on a QS evaluation.
- **Authentication**: YES
- **Required Role(s)**: `ceo`, `general_manager`
- **Path Parameters**: `id` (string)
- **Request Body**:
  ```json
  {
    "decision": "approved | feedback",
    "feedback": "string (optional)"
  }
  ```
- **Response Example**: `{ "success": true, "data": { "decision": "approved", "decidedAt": "..." } }`
- **Side Effects**: Creates a `decision_made` notification for the quantity surveyor

#### List Quantity Review Notifications

- **Endpoint URL**: `GET /api/quantity-review-notifications`
- **Description**: List role-targeted notifications for quantity surveyor workflow.
- **Authentication**: YES
- **Required Role(s)**: `quantity_surveyor`, `ceo`, `general_manager`
- **Query Parameters**: `type` — `evaluation_submitted | decision_made`, `unreadOnly`

---

### Notifications

#### List Notifications

- **Endpoint URL**: `GET /api/notifications`
- **Description**: Return unread counts and recent notification items for the authenticated user.
- **Authentication**: YES
- **Required Role(s)**: Any
- **Query Parameters**: `unreadOnly`, `limit`

#### Mark Notification Read

- **Endpoint URL**: `PATCH /api/notifications/:id/read`
- **Description**: Mark a single notification as read.
- **Authentication**: YES
- **Required Role(s)**: Notification owner
- **Path Parameters**: `id` (string)

#### Bulk Mark Read

- **Endpoint URL**: `POST /api/notifications/read`
- **Description**: Mark multiple or all notifications as read.
- **Authentication**: YES
- **Required Role(s)**: Any
- **Request Body**:
  ```json
  { "ids": ["string[]"] }
  ```

#### Mark Role Notifications Read

- **Endpoint URL**: `POST /api/notifications/read-role`
- **Description**: Mark all notifications of a specific type as read for a target role (used in QS workflow).
- **Authentication**: YES
- **Required Role(s)**: Any
- **Request Body**:
  ```json
  {
    "role": "string",
    "type": "string"
  }
  ```

---

### Dashboard / Metrics

#### Dashboard Overview

- **Endpoint URL**: `GET /api/dashboard`
- **Description**: Aggregated counts used on the main Dashboard (tasks by status, projects, approvals, postings counts, unread notifications).
- **Authentication**: YES
- **Required Role(s)**: Any (scoped by role)
- **Response Example**:
  ```json
  {
    "success": true,
    "data": {
      "projectsCount": 12,
      "tasks": { "total": 120, "pending": 24, "in_progress": 60, "completed": 36 },
      "pendingApprovals": 5,
      "openJobPostings": 8,
      "unreadNotifications": 3,
      "unreadPaidCustomerCount": 2
    }
  }
  ```

#### Designer Performance Dashboard

- **Endpoint URL**: `GET /api/designer-performance`
- **Description**: Aggregated designer performance metrics and review scores.
- **Authentication**: YES
- **Required Role(s)**: `ceo`, `general_manager`, `designer` (own scores only)
- **Query Parameters**: `userId`, `from`, `to`
- **Response Example**:
  ```json
  {
    "success": true,
    "data": {
      "tasksCompleted": 15,
      "averageApprovalTime": "3.2 days",
      "ratingAverages": { "creativity": 4.2, "timeliness": 3.8, "clientUnderstanding": 4.0, "rendering": 4.5 },
      "throughput": 2.1
    }
  }
  ```

#### Site Engineer Dashboard

- **Endpoint URL**: `GET /api/dashboard/site-engineer`
- **Description**: Aggregated counts for the site engineer view.
- **Authentication**: YES
- **Required Role(s)**: `site_engineer`, `ceo`, `general_manager`

---

### Documents / File Uploads

#### Upload File

- **Endpoint URL**: `POST /api/uploads`
- **Description**: Generic file upload endpoint used across tasks, submissions, and paid customers.
- **Authentication**: YES
- **Required Role(s)**: Any authenticated
- **Content-Type**: `multipart/form-data`
- **Form Fields**: `file` (binary), `metadata` (JSON string — `{ projectId?, taskId?, purpose }`)
- **Validation Rules**: Max file size 10MB; allowed types: `image/*`, `application/pdf`, `.docx`, `.xlsx`
- **Response Example**: `{ "success": true, "data": { "id": "att-123", "url": "/uploads/att-123.jpg", "name": "receipt.jpg", "type": "image/jpeg", "size": "124 KB" } }`
- **Error Responses**: `413` — `{ "success": false, "message": "File too large" }`; `422` — `{ "success": false, "message": "Unsupported file type" }`

#### Upload Project Document

- **Endpoint URL**: `POST /api/projects/:id/documents`
- **Description**: Attach a document to a project.
- **Authentication**: YES
- **Required Role(s)**: Project members, leadership
- **Path Parameters**: `id` (string)
- **Content-Type**: `multipart/form-data`
- **Form Fields**: `file` (binary)

#### Get File Metadata

- **Endpoint URL**: `GET /api/uploads/:id`
- **Description**: Retrieve file metadata.
- **Authentication**: YES
- **Required Role(s)**: Any authenticated
- **Path Parameters**: `id` (string)

#### Download File

- **Endpoint URL**: `GET /api/uploads/:id/download`
- **Description**: Download the file (signed URL redirect or direct stream).
- **Authentication**: YES
- **Required Role(s)**: Any authenticated (scoped by ownership)
- **Path Parameters**: `id` (string)

#### Delete File

- **Endpoint URL**: `DELETE /api/uploads/:id`
- **Description**: Delete an uploaded file.
- **Authentication**: YES
- **Required Role(s)**: Uploader or `ceo`
- **Path Parameters**: `id` (string)

---

### Audit Logs

#### List Audit Logs

- **Endpoint URL**: `GET /api/audit`
- **Description**: Retrieve audit trail entries for compliance and debugging.
- **Authentication**: YES
- **Required Role(s)**: `ceo`
- **Query Parameters**: `entity`, `action`, `from`, `to`, `page`, `perPage`

#### Audit Action Types (Logged Automatically)

The backend should automatically record audit entries for:
- User login/logout
- User create/update/delete
- Project create/update/delete
- Task create/update/status change/approve/reject
- Submission create/approve
- File upload/delete
- Customer request create/transfer
- Payment verification (verify/reject/clarify)
- Clarification response
- Application status changes
- Phase submissions and reviews
- QS evaluation creation
- QS decision creation

---

## Validation & Error Conventions

### Standard Response Envelope

```json
// Success
{ "success": true, "data": ... }

// Failure
{ "success": false, "message": "Human readable", "errors": { "field": "reason" } }
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK (GET, PUT, PATCH) |
| 201 | Created (POST) |
| 204 | No Content (DELETE) |
| 400 | Bad Request |
| 401 | Unauthorized (missing or invalid token) |
| 403 | Forbidden (insufficient role) |
| 404 | Not Found |
| 409 | Conflict (duplicate resource) |
| 413 | Payload Too Large (file size) |
| 422 | Unprocessable Entity (validation) |
| 500 | Internal Server Error |

### Common Validation Rules

- IDs: string (UUID or server-generated)
- Dates: ISO 8601 strings
- Text fields: max 255 (titles), max 5000 (descriptions)
- File uploads: max 10MB default; allowed MIME types `image/*`, `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.*`
- Ratings: 0–5 with one decimal allowed
- Roles: must be one of the 8 allowed role values
- Passwords: min 8 characters
- Emails: valid email format
- Phone numbers: accepted format variations

### Authentication Errors

```json
// 401
{ "success": false, "message": "Unauthorized" }

// 403
{ "success": false, "message": "Forbidden" }
```

---

## Mapped Frontend Routes → Required Endpoints

| Frontend Route | Required Endpoints |
|---|---|
| `/` (Login) | `POST /api/auth/login` |
| `/dashboard` | `GET /api/dashboard`, `GET /api/notifications` |
| `/tasks` | `GET/POST /api/tasks`, `PUT /api/tasks/:id`, `PATCH /api/tasks/:id/status`, `POST /api/tasks/:id/approve`, `POST /api/tasks/:id/reject`, `POST /api/tasks/:id/attachments`, `GET/POST /api/tasks/:id/submissions`, `POST /api/tasks/:id/feedbacks` |
| `/approvals` | `GET /api/paid-customers`, `POST /api/paid-customers/:id/verify`, `POST /api/paid-customers/:id/clarify`, `GET /api/approvals` |
| `/users` | `GET/POST/PUT/DELETE /api/users` |
| `/customer-data` | `GET/POST /api/customer-requests`, `GET /api/paid-customers`, `POST /api/paid-customers` |
| `/paid-customers` | `GET /api/paid-customers` |
| `/finance-verifications` | `GET /api/finance/verifications`, `POST /api/finance/verifications/:id/verify`, `POST /api/finance/verifications/:id/ceo-approve` |
| `/data-collector-tasks` | `GET/POST /api/data-collector-tasks`, `POST /api/tasks/:id/submissions`, `POST /api/tasks/:id/submissions/:submissionId/approve`, `POST /api/tasks/:id/feedbacks` |
| `/job-postings` | `GET/POST /api/job-postings` |
| `/designer-applications` | `GET /api/job-postings/:id/applications`, `PUT /api/applications/:id` |
| `/designer-assignments` | `GET/POST /api/designer-tasks`, `GET /api/designer-tasks/:id/progress`, `POST /api/designer-tasks/:id/phases/:phase/review`, `POST /api/designer-tasks/:id/review` |
| `/designer-tasks` | `GET /api/designer-tasks`, `POST /api/designer-tasks/:id/phases/:phase/submissions` |
| `/open-job-postings` | `GET /api/job-postings`, `POST /api/job-postings/:id/applications` |
| `/task-applications` | Redirects to `/designer-applications` |
| `/quantity-surveyor-live` | `GET /api/quantity-review-tasks`, `POST /api/quantity-review-evaluations` |
| `/quantity-surveyor-review` | `GET /api/quantity-review-evaluations`, `POST /api/quantity-review-evaluations/:id/decision` |
| `/quantity-surveyor-tasks` | `GET/POST /api/quantity-review-tasks` |
| `/site-engineer-tasks` | `GET /api/tasks`, `PUT /api/tasks/:id`, `PATCH /api/tasks/:id/status`, `POST /api/tasks/:id/attachments` |
| `/performance-ratings` | `GET /api/designer-performance` |
| `/designer-performance` | `GET /api/designer-performance` |
| `/projects` | Redirects to `/dashboard` (legacy placeholder) |
| `/projects/:id` | Redirects to `/dashboard` (legacy placeholder) |
