<!-- Auto-generated backend API documentation for Workflow Management Telegram App -->
# Backend API Specification — Workflow Management

Generated from analysis of the frontend codebase. This document lists the backend endpoints the frontend expects, grouped by module and role.

**System Overview**

- Modules / Features:
  - Authentication (login / session)
  - User Management (create / update / roles / status)
  - Projects (CRUD, stages, assignment)
  - Tasks (CRUD, status changes, attachments, approvals)
  - Designer work (designer-specific tasks, job postings, applications)
  - Approvals (leadership approvals, feedback)
  - Finance (verifications, payments, paid customers)
  - Customers (customer records, payment history)
  - Notifications (badge counts, read/unread)
  - Dashboard / Metrics (aggregated counts)
  - Documents / File uploads (task/project attachments)

- User roles detected in the frontend:
  - `ceo` (CEO)
  - `marketing_lead` (Marketing Lead)
  - `general_manager` (General Manager)
  - `data_collector` (Data Collector)
  - `quantity_surveyor` (Quantity Surveyor)
  - `designer` (Designer)
  - `site_engineer` (Site Engineer)
  - `finance` / `finance_officer` (Finance Officer)

> Authentication model assumed: JWT Bearer tokens (Authorization: Bearer <token>). Endpoints that modify data require authentication and role-based authorization.

**Role-Based Endpoint Classification**

Below each role is a summary of endpoints they will commonly consume or act upon. Full endpoint documentation follows in the next section.

- CEO (`ceo`)
  - POST /api/auth/login
  - GET /api/users
  - POST /api/users
  - PUT /api/users/:id
  - DELETE /api/users/:id
  - POST /api/projects
  - POST /api/tasks
  - GET /api/dashboard
  - POST /api/job-postings

- General Manager (`general_manager`)
  - GET /api/tasks
  - POST /api/tasks
  - POST /api/tasks/:id/approve
  - POST /api/tasks/:id/reject
  - GET /api/approvals
  - GET /api/projects

- Marketing Lead (`marketing_lead`)
  - GET /api/tasks?assignedTo=:id
  - PUT /api/tasks/:id

- Designer (`designer`)
  - GET /api/designer-tasks
  - POST /api/designer-tasks
  - GET /api/job-postings
  - POST /api/job-postings/:id/applications
  - GET /api/applications?applicantId=:id

- Site Engineer (`site_engineer`)
  - GET /api/tasks?assignedTo=:id
  - POST /api/tasks/:id/attachments
  - PATCH /api/tasks/:id/status

- Quantity Surveyor (`quantity_surveyor`)
  - GET /api/quantity-tasks
  - POST /api/quantity-tasks

- Finance Officer (`finance` / `finance_officer`)
  - GET /api/finance/verifications
  - POST /api/finance/verifications/:id/verify
  - GET /api/customers/paid

- Data Collector (`data_collector`)
  - GET /api/tasks?role=data_collector
  - POST /api/tasks/:id/measurements

**Endpoint Reference (by module)**

Note: All request/response examples use JSON. Replace `:id` path segments with resource IDs.

---

**Authentication**

- Endpoint Name: Login
  - Endpoint URL: POST /api/auth/login
  - Description: Authenticate user and return access token and user profile.
  - Authentication: NO
  - Required Role(s): N/A
  - JWT/Auth Type: Returns Bearer JWT
  - Request Body:
    {
      "username": "string",
      "password": "string"
    }
  - Response Example:
    {
      "success": true,
      "message": "Login successful",
      "data": {
        "accessToken": "eyJhbGci...",
        "refreshToken": "...",
        "user": { "id": "1", "username": "ceo", "name": "Ava", "role": "ceo" }
      }
    }
  - Validation Rules: username/password required; password min 6 chars (frontend demo uses 'demo123')
  - Error Responses:
    { "success": false, "message": "Invalid credentials" }

- Endpoint Name: Logout
  - Endpoint URL: POST /api/auth/logout
  - Description: Invalidate refresh token or server session (optional). Client should also clear local session.
  - Authentication: YES
  - Required Role(s): Any authenticated user
  - JWT/Auth Type: Bearer
  - Request Body: {}
  - Response Example: { "success": true, "message": "Logged out" }
  - Error Responses: { "success": false, "message": "Invalid token" }

- Endpoint Name: Get Current User
  - Endpoint URL: GET /api/auth/me
  - Description: Returns authenticated user profile and role.
  - Authentication: YES
  - Required Role(s): Any
  - JWT/Auth Type: Bearer
  - Response Example:
    { "success": true, "data": { "id": "1", "username": "ceo", "name": "Ava", "role": "ceo" } }

---

**Users**

- Endpoint Name: List Users
  - Endpoint URL: GET /api/users
  - Description: Returns paginated list of users with role and status filters.
  - Authentication: YES
  - Required Role(s): `ceo`, `general_manager`
  - Query Parameters: `page`, `perPage`, `role`, `status`, `search`
  - Response Example:
    { "success": true, "data": [{ "id": "1", "username": "sarah.j", "role": "marketing_lead", "email": "..." }], "meta": { "total": 12 } }
  - Validation Rules: page/perPage are integers

- Endpoint Name: Create User
  - Endpoint URL: POST /api/users
  - Description: Create new user (CEO only in frontend). Stores hashed password server-side.
  - Authentication: YES
  - Required Role(s): `ceo`
  - Request Body:
    {
      "username": "string",
      "name": "string",
      "email": "string",
      "password": "string",
      "role": "string",
      "phone": "string (optional)"
    }
  - Response Example:
    { "success": true, "message": "User created", "data": { "id": "42" } }
  - Validation Rules: username, name, email, password, role required; password min 8; email format valid
  - Error Responses:
    { "success": false, "message": "Username already exists" }

- Endpoint Name: Get User
  - Endpoint URL: GET /api/users/:id
  - Description: Retrieve a single user by id.
  - Authentication: YES
  - Required Role(s): `ceo`, `general_manager` or the user themself
  - Path Parameters: `id` (string)
  - Response Example: { "success": true, "data": { "id": "3", "username": "emily.c", "role": "designer" } }

- Endpoint Name: Update User
  - Endpoint URL: PUT /api/users/:id
  - Description: Update user profile, role, or status.
  - Authentication: YES
  - Required Role(s): `ceo` (for role/status), user for own profile
  - Request Body: partial of create user fields (no plain password unless changing)
  - Validation Rules: if password provided, hash on server; if role provided, must be one of allowed roles
  - Response Example: { "success": true, "message": "User updated" }

- Endpoint Name: Delete (soft) User
  - Endpoint URL: DELETE /api/users/:id
  - Description: Mark user as deleted (soft delete) and set deletedAt timestamp.
  - Authentication: YES
  - Required Role(s): `ceo`
  - Response Example: { "success": true, "message": "User marked deleted" }

---

**Projects**

- Endpoint Name: List Projects
  - Endpoint URL: GET /api/projects
  - Description: Return projects with optional filters (stage, status, assignedTo).
  - Authentication: YES
  - Required Role(s): Any authenticated user (visibility may depend on role)
  - Query Parameters: `stage`, `status`, `assignedTo`, `page`, `perPage`, `search`
  - Response Example: { "success": true, "data": [{ "id": "proj-1", "name": "City Plaza Renovation" }] }

- Endpoint Name: Create Project
  - Endpoint URL: POST /api/projects
  - Description: Create a new project record.
  - Authentication: YES
  - Required Role(s): `ceo`, `general_manager`
  - Request Body:
    {
      "name": "string",
      "clientName": "string",
      "description": "string",
      "stage": "string",
      "deadline": "ISO8601 string",
      "assignedTo": "userId (optional)"
    }
  - Response Example: { "success": true, "message": "Project created", "data": { "id": "proj-10" } }

- Endpoint Name: Get Project
  - Endpoint URL: GET /api/projects/:id
  - Description: Retrieve project details, including documents and basic stats.
  - Authentication: YES
  - Required Role(s): Any authenticated user
  - Path Parameters: `id`

- Endpoint Name: Update Project
  - Endpoint URL: PUT /api/projects/:id
  - Description: Update project fields and stage.
  - Authentication: YES
  - Required Role(s): `ceo`, `general_manager`

- Endpoint Name: Delete Project
  - Endpoint URL: DELETE /api/projects/:id
  - Description: Soft-delete or archive a project.
  - Authentication: YES
  - Required Role(s): `ceo`

- Endpoint Name: List Project Tasks
  - Endpoint URL: GET /api/projects/:id/tasks
  - Description: Returns tasks related to a project.
  - Authentication: YES
  - Required Role(s): Any authenticated user

---

**Tasks**

- Endpoint Name: List Tasks
  - Endpoint URL: GET /api/tasks
  - Description: Retrieve tasks with filtering by status, assignedTo, assignedBy, projectId, approvalStatus.
  - Authentication: YES
  - Required Role(s): Any
  - Query Parameters: `status`, `assignedTo`, `assignedBy`, `projectId`, `approvalStatus`, `page`, `perPage`, `search`, `sort`
  - Response Example: { "success": true, "data": [/* Task objects */], "meta": { "total": 123 } }

- Endpoint Name: Create Task
  - Endpoint URL: POST /api/tasks
  - Description: Create new task for a project. Frontend allows GM/CEO to create tasks.
  - Authentication: YES
  - Required Role(s): `general_manager`, `ceo`
  - Request Body:
    {
      "projectId": "string",
      "title": "string",
      "description": "string",
      "instruction": "string (optional)",
      "assignedTo": "userId",
      "assignedBy": "userId",
      "deadline": "ISO8601 (optional)"
    }
  - Validation Rules: title required (max 255), assignedTo must be valid user id
  - Response Example: { "success": true, "message": "Task created successfully", "data": { "id": "task-123" } }

- Endpoint Name: Get Task
  - Endpoint URL: GET /api/tasks/:id
  - Description: Get task details including attachments and approval status.
  - Authentication: YES

- Endpoint Name: Update Task
  - Endpoint URL: PUT /api/tasks/:id
  - Description: Update title, description, instruction, deadline, assignedTo.
  - Authentication: YES
  - Required Role(s): Task owner (assignedBy) or assignedTo (for limited fields), `general_manager`/`ceo` for broader edits
  - Request Body: partial task object
  - Response Example: { "success": true, "message": "Task updated" }

- Endpoint Name: Change Task Status
  - Endpoint URL: PATCH /api/tasks/:id/status
  - Description: Change the task `status` (pending, in_progress, completed, incomplete, rejected).
  - Authentication: YES
  - Required Role(s): assignedTo or leadership depending on workflow
  - Request Body: { "status": "in_progress" }
  - Response Example: { "success": true, "message": "Status updated" }

- Endpoint Name: Approve Task
  - Endpoint URL: POST /api/tasks/:id/approve
  - Description: Leadership approves a task; sets approvalStatus, approvedBy, approvedAt, optional feedback.
  - Authentication: YES
  - Required Role(s): `general_manager`, `ceo`
  - Request Body: { "feedback": "string (optional)" }
  - Response Example: { "success": true, "message": "Task approved" }

- Endpoint Name: Reject Task
  - Endpoint URL: POST /api/tasks/:id/reject
  - Description: Leadership rejects a task with feedback.
  - Authentication: YES
  - Required Role(s): `general_manager`, `ceo`
  - Request Body: { "feedback": "string" }
  - Response Example: { "success": true, "message": "Task rejected" }

- Endpoint Name: Attach File to Task
  - Endpoint URL: POST /api/tasks/:id/attachments
  - Description: Upload file(s) attached to a task (images, docs, measurement files).
  - Authentication: YES
  - Required Role(s): assignedTo or any role that can upload evidence
  - Content-Type: multipart/form-data
  - Form Fields: `file` (binary), `label` (optional)
  - Validation Rules: max file size 10MB (images/documents), allowed types: jpeg,png,pdf,docx,xlsx
  - Response Example: { "success": true, "data": { "attachmentId": "att-123", "url": "/uploads/att-123.jpg" } }
  - Error Responses: { "success": false, "message": "File too large" }

---

**Designer / Job Postings & Applications**

- Endpoint Name: List Job Postings
  - Endpoint URL: GET /api/job-postings
  - Description: Public or authenticated list of open job postings / designer tasks.
  - Authentication: Optional (applications require auth)
  - Query Parameters: `status`, `projectId`, `page`, `perPage`

- Endpoint Name: Create Job Posting
  - Endpoint URL: POST /api/job-postings
  - Description: Leadership posts open tasks for designers to apply.
  - Authentication: YES
  - Required Role(s): `ceo`, `general_manager`
  - Request Body: { "title", "description", "projectId", "storyPoints" }

- Endpoint Name: Submit Application (Designer)
  - Endpoint URL: POST /api/job-postings/:id/applications
  - Description: Designer applies to a posting with a message.
  - Authentication: YES
  - Required Role(s): `designer`
  - Request Body:
    { "message": "string" }
  - Response Example: { "success": true, "data": { "applicationId": "app-123" } }

- Endpoint Name: List Applications (for reviewer)
  - Endpoint URL: GET /api/job-postings/:id/applications
  - Description: Leadership lists all applications for a posting.
  - Authentication: YES
  - Required Role(s): `ceo`, `general_manager`

- Endpoint Name: Update Application Status
  - Endpoint URL: PUT /api/applications/:id
  - Description: Accept, reject, or message an applicant.
  - Authentication: YES
  - Required Role(s): `ceo`, `general_manager`
  - Request Body: { "status": "accepted|rejected", "feedback": "string (optional)" }

---

**Approvals**

- Endpoint Name: List Approvals
  - Endpoint URL: GET /api/approvals
  - Description: List items awaiting leadership approval (tasks, designer deliverables).
  - Authentication: YES
  - Required Role(s): `general_manager`, `ceo`

---

**Finance / Payments**

- Endpoint Name: List Verifications
  - Endpoint URL: GET /api/finance/verifications
  - Description: Items needing finance verification (payment receipts, invoices).
  - Authentication: YES
  - Required Role(s): `finance` / `finance_officer`

- Endpoint Name: Verify Payment
  - Endpoint URL: POST /api/finance/verifications/:id/verify
  - Description: Mark verification as verified or rejected.
  - Authentication: YES
  - Required Role(s): `finance` / `finance_officer`
  - Request Body: { "verified": true, "notes": "string (optional)" }

- Endpoint Name: List Paid Customers
  - Endpoint URL: GET /api/customers/paid
  - Description: Customers who have completed payments.
  - Authentication: YES
  - Required Role(s): `finance` , `ceo` , `general_manager`

---

**Customers**

- Endpoint Name: List Customers
  - Endpoint URL: GET /api/customers
  - Description: List customer records with optional payment summary.
  - Authentication: YES
  - Required Role(s): `ceo`, `finance`, `general_manager`

- Endpoint Name: Create Customer
  - Endpoint URL: POST /api/customers
  - Description: Create a customer record used by projects.
  - Authentication: YES
  - Required Role(s): `ceo`, `general_manager`, `marketing_lead`

---

**Documents / Files**

- Endpoint Name: Upload Project Document
  - Endpoint URL: POST /api/projects/:id/documents
  - Description: Attach documents to a project (drawings, decks).
  - Authentication: YES
  - Required Role(s): project members, leadership
  - Content-Type: multipart/form-data
  - Validation Rules: similar to task attachments; recommended virus scanning

- Endpoint Name: Get Document
  - Endpoint URL: GET /api/documents/:id
  - Description: Retrieve file metadata and download URL.

---

**Notifications**

- Endpoint Name: List Notifications
  - Endpoint URL: GET /api/notifications
  - Description: Return unread counts and recent notification items for the user.
  - Authentication: YES
  - Required Role(s): Any

- Endpoint Name: Mark Notification Read
  - Endpoint URL: PATCH /api/notifications/:id/read
  - Description: Mark single notification read and decrement badge.

---

**Dashboard / Metrics**

- Endpoint Name: Dashboard Summary
  - Endpoint URL: GET /api/dashboard
  - Description: Aggregated counts used on the Dashboard (tasks by status, postings counts, pending approvals, unread notifications).
  - Authentication: YES
  - Required Role(s): Any
  - Response Example:
    {
      "success": true,
      "data": {
        "tasks": { "total": 120, "pending": 24, "in_progress": 60, "completed": 36 },
        "openJobPostings": 8,
        "pendingApprovals": 5,
        "unreadNotifications": 3
      }
    }

---

**Validation & Error Conventions**

- Standard response envelope:
  - Success: { "success": true, "data": ... }
  - Failure: { "success": false, "message": "Human readable", "errors": { field: "reason" } }

- Authentication errors:
  - 401 Unauthorized: { "success": false, "message": "Unauthorized" }
  - 403 Forbidden: { "success": false, "message": "Forbidden" }

- Common field validations used across endpoints:
  - IDs: string (UUID or numeric string)
  - Dates: ISO 8601 strings
  - Text fields: max length 255 unless long text
  - File uploads: max 10MB default, allowed mime types image/*, application/pdf, application/msword, application/vnd.openxmlformats-officedocument.*

---

If you want, I can: create example OpenAPI (Swagger) YAML/JSON from this spec, implement a skeleton Express.js backend with these routes, or refine roles/permissions based on real server-side rules.

File: docs/backend-api.md
r numeric string)
  - Dates: ISO 8601 strings
  - Text fields: max length 255 unless long text
  - File uploads: max 10MB default, allowed mime types image/*, application/pdf, application/msword, application/vnd.openxmlformats-officedocument.*

---

If you want, I can: create example OpenAPI (Swagger) YAML/JSON from this spec, implement a skeleton Express.js backend with these routes, or refine roles/permissions based on real server-side rules.

File: docs/backend-api.md
