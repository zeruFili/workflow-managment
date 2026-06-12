# API Testing Guide — Wase Workflow Backend v1.0

**Base URL**: `http://localhost:3001/api/v1`  
**Database**: PostgreSQL 15+ (see `.env`)  
**Auth**: JWT Bearer token (15-minute TTL)  
**Date**: June 2026

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Authentication & Roles](#2-authentication--roles)
3. [Enums & Constants Reference](#3-enums--constants-reference)
4. [Standard Response Formats](#4-standard-response-formats)
5. [Auth Endpoints](#5-auth-endpoints)
6. [User Management Endpoints](#6-user-management-endpoints)
7. [Paid Customer Endpoints](#7-paid-customer-endpoints)
8. [Notification Endpoints](#8-notification-endpoints)
9. [Data Collector Endpoints](#9-data-collector-endpoints)
10. [Quantity Surveyor Endpoints](#10-quantity-surveyor-endpoints)
11. [Designer Endpoints](#11-designer-endpoints)
12. [Testing Workflows](#12-testing-workflows)
13. [Error Reference](#13-error-reference)

---

## 1. System Overview

The Wase Workflow system manages business operations across five domains:

| Domain | Roles | Purpose |
|--------|-------|---------|
| **Marketing** | `marketing` | Customer acquisition and payment submission |
| **Finance** | `finance` | Payment verification and CEO transfers |
| **CEO Admin** | `ceo`, `general_manager` | Task assignment, review, user management |
| **Design** | `designer` | Design task execution, multi-stage submissions |
| **Quantity Surveying** | `quantity_surveyor` | BOQ preparation, cost estimation |

### Key Workflows

```
Marketing Flow:
  customer (lead) → paid_customer (payment record) → marketing_submission → marketing_review

Task Flows (DC / QS / Designer):
  create_task → assign → submit → review → (feedback loop or complete)

Designer-specific:
  create_task → [apply → approve] → case_study → designing → rendering → final_stage
                                     → review → pause/resume → removal
```

---

## 2. Authentication & Roles

### Login

Send credentials to `/api/v1/auth/login`. The response contains `accessToken` which must be
sent as a Bearer token header on all authenticated requests:

```
Authorization: Bearer <accessToken>
```

Tokens expire after **15 minutes**.

### Roles

| Role Value | Description |
|---|---|
| `ceo` | Super admin — bypasses all authorization checks |
| `general_manager` | Manager-level — can create/assign/review tasks |
| `marketing` | Creates customers and paid customer records |
| `finance` | Verifies payments |
| `designer` | Works on design tasks, applies to public tasks |
| `quantity_surveyor` | Works on QS tasks |
| `data_collector` | Works on data collection tasks |

---

## 3. Enums & Constants Reference

### ReviewOutcome
`"approved"`, `"rejected"`, `"feedback"`, `"pending"`

### TaskState
`"active"`, `"deactive"`

### DesignerStage
`"case study"`, `"designing"`, `"rendering"`, `"final stage"`

### DataCollectorTaskStatus (task status only)
`"approve"`, `"feedback"`, `"rejected"`, `"pending"`

### UserRole
`"ceo"`, `"general_manager"`, `"marketing"`, `"finance"`, `"designer"`, `"quantity_surveyor"`, `"data_collector"`

---

## 4. Standard Response Formats

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation description"
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [ ... ],
  "meta": { "total": 50, "page": 1, "limit": 20, "totalPages": 3 }
}
```

### Error Response (4xx)
```json
{ "success": false, "message": "Error description" }
```

### Error Response (400 — Validation)
```json
{ "success": false, "message": "Validation failed", "errors": ["Error 1", "Error 2"] }
```

### Error Response (500)
```json
{ "success": false, "message": "Internal server error" }
```

---

## 5. Auth Endpoints

---

### 5.1 Login

Authenticate and receive a JWT token.

| Field | Value |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:3001/api/v1/auth/login` |
| **Auth** | None (public) |

**Request Body** (JSON):
```json
{
  "email": "ceo@example.com",
  "password": "Admin@123"
}
```

**Validation**:
| Field | Type | Required | Constraints |
|---|---|---|---|
| `email` | string | Yes | 1–255 chars |
| `password` | string | Yes | 6–128 chars |

**Success Response** (200):
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJI...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "full_name": "CEO User",
      "email": "ceo@example.com",
      "phone": null,
      "role": "ceo",
      "is_active": true,
      "last_login_at": "2026-06-07T10:30:00.000Z",
      "created_at": "2026-06-01T08:00:00.000Z",
      "updated_at": "2026-06-07T10:30:00.000Z",
      "created_by": "550e8400-..."
    }
  }
}
```

**Error Responses**:
| Status | Message | Cause |
|---|---|---|
| 400 | Validation failed, ... | Missing/invalid fields |
| 401 | Invalid email or password | Wrong credentials |
| 403 | Account is deactivated | `is_active = false` |

---

### 5.2 Forgot Password

Request a password reset. **Always returns 200** for security (does not reveal whether email exists).

| Field | Value |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:3001/api/v1/auth/forgot-password` |
| **Auth** | None (public) |

**Request Body** (JSON):
```json
{
  "email": "ceo@example.com"
}
```

**Validation**:
| Field | Type | Required | Constraints |
|---|---|---|---|
| `email` | string | Yes | — |

**Success Response** (200):
```json
{
  "success": true,
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

---

### 5.3 Reset Password

Set a new password using a reset token.

| Field | Value |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:3001/api/v1/auth/reset-password` |
| **Auth** | None (public) |

**Request Body** (JSON):
```json
{
  "token": "eyJhbGciOiJI...",
  "newPassword": "NewPass@456"
}
```

**Validation**:
| Field | Type | Required | Constraints |
|---|---|---|---|
| `token` | string | Yes | — |
| `newPassword` | string | Yes | 8–128 chars |

**Success Response** (200):
```json
{
  "success": true,
  "message": "Password has been reset successfully. Please log in."
}
```

**Error Responses**:
| Status | Message | Cause |
|---|---|---|
| 400 | Invalid or expired reset token | Token verification failed |
| 404 | User not found | User deleted after token issued |

---

### 5.4 Get Current User Profile

Retrieve the authenticated user's profile.

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3001/api/v1/auth/me` |
| **Auth** | Bearer token required |

**Headers**:
```json
{ "Authorization": "Bearer {{token}}" }
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "User profile",
  "data": {
    "id": "550e8400-...",
    "full_name": "CEO User",
    "email": "ceo@example.com",
    "phone": null,
    "role": "ceo",
    "is_active": true,
    "last_login_at": "2026-06-07T10:30:00.000Z",
    "created_at": "2026-06-01T08:00:00.000Z",
    "updated_at": "2026-06-07T10:30:00.000Z",
    "created_by": "550e8400-..."
  }
}
```

---

## 6. User Management Endpoints

> **All user endpoints require CEO role.**  
> Base path: `/api/v1/users`

---

### 6.1 List Users

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3001/api/v1/users` |
| **Auth** | CEO only |

**Query Parameters**:
| Param | Type | Default | Description |
|---|---|---|---|
| `page` | int | 1 | Page number |
| `limit` | int | 20 | Items per page (max 100) |
| `role` | string | — | Filter by user role |
| `is_active` | string | — | `"true"` or `"false"` |
| `search` | string | — | Search in email or full_name (ILIKE) |

**Postman Example**:
```
GET http://localhost:3001/api/v1/users?page=1&limit=10&role=designer&is_active=true
```

**Success Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "full_name": "Designer One",
      "email": "designer@example.com",
      "phone": "+251911234567",
      "role": "designer",
      "is_active": true,
      "last_login_at": null,
      "created_at": "2026-06-01T08:00:00.000Z",
      "updated_at": null,
      "created_by": "ceo-uuid"
    }
  ],
  "meta": { "total": 5, "page": 1, "limit": 10, "totalPages": 1 }
}
```

**Error**:
| Status | Message |
|---|---|
| 400 | Invalid role: {role} |

---

### 6.2 Create User

| Field | Value |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:3001/api/v1/users` |
| **Auth** | CEO only |

**Request Body** (JSON):
```json
{
  "full_name": "New Designer",
  "email": "new.designer@example.com",
  "password": "Secure@123",
  "role": "designer",
  "phone": "+251911234567"
}
```

**Validation**:
| Field | Type | Required | Constraints |
|---|---|---|---|
| `full_name` | string | Yes | 1–255 chars |
| `email` | string | Yes | Valid email, 1–255 chars |
| `password` | string | Yes | 8–128 chars, must include uppercase + lowercase + digit + special character |
| `role` | enum | Yes | One of the UserRole values |
| `phone` | string | No | E.164 format (e.g. `+251911234567`) |

**Business Rules**:
- Cannot create a user with `ceo` role
- Email must be unique

**Success Response** (201):
```json
{
  "success": true,
  "data": { "id": "new-uuid", "full_name": "New Designer", ... },
  "message": "User created successfully"
}
```

**Error Responses**:
| Status | Message | Cause |
|---|---|---|
| 400 | Cannot create a user with CEO role | Role is `ceo` |
| 409 | Email already exists | Duplicate email |

---

### 6.3 Get User by ID

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3001/api/v1/users/{{userId}}` |
| **Auth** | CEO only |

**Success Response** (200):
```json
{
  "success": true,
  "data": { "id": "uuid", "full_name": "...", ... }
}
```

**Error**: 404 — User not found

---

### 6.4 Update User

| Field | Value |
|---|---|
| **Method** | `PATCH` |
| **URL** | `http://localhost:3001/api/v1/users/{{userId}}` |
| **Auth** | CEO only |

**Request Body** (JSON) — all fields optional:
```json
{
  "full_name": "Updated Name",
  "email": "updated@example.com",
  "role": "marketing",
  "phone": "+251900000000",
  "password": "NewPass@789",
  "is_active": false
}
```

**Business Rules**:
- Cannot change your own role (`403`)
- Cannot deactivate your own account (`403`)
- Email must be unique if changed (`409`)

**Success Response** (200):
```json
{
  "success": true,
  "data": { "id": "uuid", ... },
  "message": "User updated successfully"
}
```

---

### 6.5 Delete User (Soft Delete)

Sets `is_active = false`. Does not hard-delete.

| Field | Value |
|---|---|
| **Method** | `DELETE` |
| **URL** | `http://localhost:3001/api/v1/users/{{userId}}` |
| **Auth** | CEO only |

**Business Rule**: Cannot delete your own account (`403`).

**Success Response** (200):
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

## 7. Paid Customer Endpoints

> Base path: `/api/v1/paid-customers`

---

### 7.1 List Paid Customers

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3001/api/v1/paid-customers` |
| **Auth** | CEO, GENERAL_MANAGER, MARKETING, FINANCE |

**Query Parameters**:
| Param | Type | Default | Description |
|---|---|---|---|
| `page` | int | 1 | Page number |
| `limit` | int | 20 | Items per page |
| `status` | string | — | Filter by `approved`/`rejected`/`feedback`/`pending` |
| `search` | string | — | Search in customer name, phone, or description (ILIKE) |

**Postman Example**:
```
GET http://localhost:3001/api/v1/paid-customers?page=1&limit=20&status=pending&search=Abebe
```

**Success Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "customer_id": "customer-uuid",
      "description": "Payment for villa design",
      "status": "pending",
      "attachment_urls": ["/uploads/payment1.pdf"],
      "created_at": "2026-06-07T10:00:00.000Z",
      "updated_at": null,
      "customer": {
        "id": "customer-uuid",
        "customer_name": "Abebe Kebede",
        "customer_phone": "+251911234567",
        "paid": true
      }
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

---

### 7.2 Get Paid Customer by ID

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3001/api/v1/paid-customers/{{paidCustomerId}}` |
| **Auth** | CEO, GENERAL_MANAGER, MARKETING, FINANCE |

**Success Response** (200):
```json
{
  "success": true,
  "data": { /* paid customer with customer relation */ }
}
```

**Error**: 404 — Paid customer not found

---

### 7.3 Create Paid Customer

Creates a paid customer record from an existing customer. Accepts file uploads.

| Field | Value |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:3001/api/v1/paid-customers` |
| **Auth** | MARKETING, CEO |
| **Content-Type** | `multipart/form-data` |

**Form Fields**:
| Field | Type | Required | Constraints |
|---|---|---|---|
| `customer_id` | string (UUID) | Yes | Must reference an existing customer |
| `description` | string | Yes | 1–5000 chars |
| `proofFiles` | file[] | No | Max 10 files, 10 MB each |

**Postman Setup**:
1. Set method to `POST`
2. Set Body type to `form-data`
3. Add field `customer_id` (Text) = `"<valid-customer-uuid>"`
4. Add field `description` (Text) = `"Payment proof for project X"`
5. Add field `proofFiles` (File, multiple) = select file(s)

**Business Rules**:
- Customer must exist
- Customer must NOT already be marked as paid (`409`)

**Success Response** (201):
```json
{
  "success": true,
  "data": {
    "id": "new-uuid",
    "customer_id": "customer-uuid",
    "description": "Payment proof for project X",
    "status": "pending",
    "attachment_urls": ["uploads/paid_customer_attachments/1712345678-receipt.pdf"],
    ...
  },
  "message": "Paid customer created"
}
```

**Side Effects**: Sets `customer.paid = true`; notifies Finance and CEO.

---

### 7.4 Verify Payment

Finance or CEO reviews and verifies a paid customer record.

| Field | Value |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:3001/api/v1/paid-customers/{{paidCustomerId}}/verify` |
| **Auth** | FINANCE, CEO |

**Request Body** (JSON):
```json
{
  "review_outcome": "approved",
  "description": "Payment verified — receipt matches records"
}
```

**Validation**:
| Field | Type | Required | Constraints |
|---|---|---|---|
| `review_outcome` | enum | Yes | `"approved"`, `"rejected"`, or `"feedback"` |
| `description` | string | No | 1–5000 chars |

**Success Response** (200):
```json
{
  "success": true,
  "data": { "id": "uuid", "status": "approved", ... },
  "message": "Payment approved"
}
```

**Side Effects**: Creates a `marketing_submission` and a `marketing_review` record; notifies Marketing and CEO.

---

### 7.5 Get Verification History

List all reviews for a paid customer.

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3001/api/v1/paid-customers/{{paidCustomerId}}/verification-history` |
| **Auth** | FINANCE, CEO, GENERAL_MANAGER, MARKETING |

**Success Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": "review-uuid",
      "marketing_submission_id": "submission-uuid",
      "reviewer_user_id": "ceo-uuid",
      "description": "Payment verified",
      "review_outcome": "approved",
      "created_at": "2026-06-07T11:00:00.000Z",
      "reviewer": { "id": "ceo-uuid", "full_name": "CEO User", ... }
    }
  ]
}
```

---

## 8. Notification Endpoints

> Base path: `/api/v1`  
> All endpoints require authentication.

---

### 8.1 List Notifications

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3001/api/v1/notifications` |
| **Auth** | Any authenticated user |

**Query Parameters**:
| Param | Type | Default | Description |
|---|---|---|---|
| `page` | int | 1 | Page number |
| `limit` | int | 20 | Items per page |

**Success Response** (200):
```json
{
  "data": [
    {
      "id": "uuid",
      "user_id": "recipient-uuid",
      "from_user_id": "sender-uuid",
      "resource_id": "task-uuid",
      "resource_type": "task_assigned",
      "parent_id": "task-uuid",
      "parent_type": "designer_task",
      "type": "New public designer task available",
      "viewed": false,
      "created_at": "2026-06-07T10:00:00.000Z",
      "from_user": { "id": "sender-uuid", "full_name": "CEO User" }
    }
  ],
  "meta": { "total": 25, "page": 1, "limit": 20, "totalPages": 2 }
}
```

---

### 8.2 Get Unread Count

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3001/api/v1/notifications/unread-count` |
| **Auth** | Any authenticated user |

**Success Response** (200):
```json
{ "success": true, "total": 15 }
```

---

### 8.3 Mark Notification as Read

| Field | Value |
|---|---|
| **Method** | `PATCH` |
| **URL** | `http://localhost:3001/api/v1/notifications/{{notificationId}}/read` |
| **Auth** | Any authenticated user |

**Success Response** (200):
```json
{ "success": true, "data": { "id": "...", "viewed": true, ... } }
```

**Error**: 404 — Notification not found

---

### 8.4 Mark All Notifications as Read

| Field | Value |
|---|---|
| **Method** | `PATCH` |
| **URL** | `http://localhost:3001/api/v1/notifications/read-all` |
| **Auth** | Any authenticated user |

**Success Response** (200):
```json
{ "success": true, "markedCount": 15 }
```

---

## 9. Data Collector Endpoints

> Base path: `/api/v1`

---

### 9.1 List Data Collector Tasks

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3001/api/v1/data-collector-tasks` |
| **Auth** | Any authenticated user |

**Query Parameters**:
| Param | Type | Default | Description |
|---|---|---|---|
| `page` | int | 1 | Page number |
| `limit` | int | 20 | Items per page |
| `status` | string | — | `"approve"`/`"feedback"`/`"rejected"`/`"pending"` |
| `assignedTo` | UUID | — | Filter by assigned user |
| `search` | string | — | Search in title/description (ILIKE) |

**Role-Based Filtering**: Data collectors (`data_collector`) only see their own tasks. CEO/GM see all.

**Success Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "assigned_to_user_id": "dc-uuid",
      "assigned_by_user_id": "ceo-uuid",
      "title": "Site data collection",
      "description": "Collect measurements for site A",
      "status": "pending",
      "task_state": "active",
      "due_date": "2026-06-15",
      "attachment_urls": null,
      "created_at": "2026-06-07T09:00:00.000Z",
      "updated_at": null,
      "assigned_to_user": { "id": "dc-uuid", "full_name": "DC User", ... },
      "assigned_by_user": { "id": "ceo-uuid", "full_name": "CEO User", ... },
      "updated_by_user": null
    }
  ],
  "meta": { "total": 3, "page": 1, "limit": 20, "totalPages": 1 }
}
```

---

### 9.2 Create Data Collector Task

| Field | Value |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:3001/api/v1/data-collector-tasks` |
| **Auth** | CEO, GENERAL_MANAGER |

**Request Body** (JSON):
```json
{
  "title": "Collect site measurements",
  "description": "Measure plot dimensions for project Alpha at Bole site",
  "assigned_to_user_id": "dc-user-uuid",
  "due_date": "2026-06-15"
}
```

**Validation**:
| Field | Type | Required | Constraints |
|---|---|---|---|
| `title` | string | Yes | 1–500 chars |
| `description` | string | Yes | 1–5000 chars |
| `assigned_to_user_id` | UUID | No | Must be a valid user |
| `due_date` | string | No | Date string |

**Side Effects**: Notifies the assigned data collector.

**Success Response** (201):
```json
{
  "success": true,
  "data": { "id": "new-uuid", "status": "pending", "task_state": "active", ... },
  "message": "Data collector task created successfully"
}
```

---

### 9.3 Get Data Collector Task

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3001/api/v1/data-collector-tasks/{{taskId}}` |
| **Auth** | Any authenticated user |

**Success Response** (200): Returns task with `assigned_to_user`, `assigned_by_user`, `updated_by_user`, and `submissions` array.

**Error**: 404 — Data collector task not found

---

### 9.4 Update Data Collector Task

| Field | Value |
|---|---|
| **Method** | `PATCH` |
| **URL** | `http://localhost:3001/api/v1/data-collector-tasks/{{taskId}}` |
| **Auth** | CEO, GENERAL_MANAGER |

**Request Body** (JSON) — all optional:
```json
{
  "title": "Updated title",
  "description": "Updated description",
  "status": "approve",
  "task_state": "deactive",
  "due_date": "2026-06-20",
  "assigned_to_user_id": "new-dc-uuid"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "data": { ... },
  "message": "Data collector task updated successfully"
}
```

---

### 9.5 List Submissions for a Task

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3001/api/v1/data-collector-tasks/{{taskId}}/submissions` |
| **Auth** | Any authenticated user |

**Success Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": "submission-uuid",
      "data_collector_task_id": "task-uuid",
      "description": "Collected data report",
      "attachment_urls": ["url1", "url2"],
      "created_at": "2026-06-07T14:00:00.000Z",
      "updated_at": null
    }
  ]
}
```

---

### 9.6 Create Submission

| Field | Value |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:3001/api/v1/data-collector-tasks/{{taskId}}/submissions` |
| **Auth** | DATA_COLLECTOR |

**Request Body** (JSON):
```json
{
  "description": "Site measurements completed — see attached spreadsheet",
  "attachment_urls": ["https://storage.example.com/report1.xlsx"]
}
```

**Validation**:
| Field | Type | Required | Constraints |
|---|---|---|---|
| `description` | string | Yes | 1–5000 chars |
| `attachment_urls` | string[] | No | Array of URLs |

**Business Rules**:
- Task must be in `active` state (`400`: "Cannot submit to a deactive task")

**Side Effects**: Notifies all CEO/GM users.

**Success Response** (201):
```json
{
  "success": true,
  "data": { "id": "submission-uuid", ... },
  "message": "Submission created successfully"
}
```

---

### 9.7 List Reviews for a Submission

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3001/api/v1/data-collector-submissions/{{submissionId}}/reviews` |
| **Auth** | Any authenticated user |

**Success Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": "review-uuid",
      "data_collector_submission_id": "submission-uuid",
      "reviewer_user_id": "ceo-uuid",
      "description": "Good work, data is complete",
      "review_outcome": "approved",
      "reviewer_user": { "id": "ceo-uuid", "full_name": "CEO User", ... }
    }
  ]
}
```

---

### 9.8 Create Review

| Field | Value |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:3001/api/v1/data-collector-submissions/{{submissionId}}/review` |
| **Auth** | CEO, GENERAL_MANAGER |

**Request Body** (JSON):
```json
{
  "review_outcome": "approved",
  "description": "All data collected correctly — good work"
}
```

**Validation**:
| Field | Type | Required | Constraints |
|---|---|---|---|
| `review_outcome` | enum | Yes | `"approved"`/`"rejected"`/`"feedback"`/`"pending"` |
| `description` | string | Yes | 1–5000 chars |

**Side Effects**: Updates the parent task's status; notifies the assigned data collector.

**Success Response** (201):
```json
{
  "success": true,
  "data": { "id": "review-uuid", ... },
  "message": "Review created successfully"
}
```

---

## 10. Quantity Surveyor Endpoints

> Base path: `/api/v1`

---

### 10.1 List QS Tasks

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3001/api/v1/qs-tasks` |
| **Auth** | Any authenticated user |

**Query Parameters**: `page`, `limit`, `status`, `assignedTo`, `search`

**Role Filter**: `quantity_surveyor` sees only own tasks.

**Success Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "assigned_to_user_id": "qs-uuid",
      "assigned_by_user_id": "ceo-uuid",
      "title": "BOQ for Villa Project",
      "description": "Prepare bill of quantities for the 3-story villa",
      "status": "pending",
      "task_state": "active",
      "due_date": "2026-06-20",
      "attachment_urls": ["reference-doc.pdf"],
      "created_at": "2026-06-07T08:00:00.000Z",
      "assigned_to_user": { "id": "qs-uuid", "full_name": "QS User" },
      "assigned_by_user": { "id": "ceo-uuid", "full_name": "CEO User" }
    }
  ],
  "meta": { "total": 2, "page": 1, "limit": 20, "totalPages": 1 }
}
```

---

### 10.2 Create QS Task

| Field | Value |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:3001/api/v1/qs-tasks` |
| **Auth** | CEO, GENERAL_MANAGER |

**Request Body** (JSON):
```json
{
  "title": "BOQ for Bole Site",
  "description": "Complete bill of quantities including all materials and labor",
  "assigned_to_user_id": "qs-user-uuid",
  "due_date": "2026-06-25"
}
```

**Validation**:
| Field | Type | Required | Constraints |
|---|---|---|---|
| `title` | string | Yes | 1–500 chars |
| `description` | string | Yes | 1–5000 chars |
| `assigned_to_user_id` | UUID | **Yes** | Target quantity surveyor |
| `due_date` | string | **Yes** | Date string |

**Success Response** (201):
```json
{
  "success": true,
  "data": { "id": "new-uuid", "status": "pending", "task_state": "active", ... },
  "message": "QS task created successfully"
}
```

---

### 10.3 Get QS Task

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3001/api/v1/qs-tasks/{{taskId}}` |
| **Auth** | Any authenticated user |

**Response**: Task with relations + submissions array.

---

### 10.4 Update QS Task

| Field | Value |
|---|---|
| **Method** | `PATCH` |
| **URL** | `http://localhost:3001/api/v1/qs-tasks/{{taskId}}` |
| **Auth** | CEO, GENERAL_MANAGER |

**Request Body** (JSON) — all optional:
```json
{
  "title": "Updated BOQ task",
  "description": "Updated scope",
  "status": "feedback",
  "due_date": "2026-07-01"
}
```

---

### 10.5 List Submissions

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3001/api/v1/qs-tasks/{{taskId}}/submissions` |
| **Auth** | Any authenticated user |

---

### 10.6 Create Submission

| Field | Value |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:3001/api/v1/qs-tasks/{{taskId}}/submissions` |
| **Auth** | QUANTITY_SURVEYOR |

**Request Body** (JSON):
```json
{
  "description": "BOQ completed — 150 line items covering materials and labor",
  "attachment_urls": ["https://storage.example.com/boq.xlsx"]
}
```

**Validation**:
| Field | Type | Required | Constraints |
|---|---|---|---|
| `description` | string | Yes | 1–5000 chars |
| `attachment_urls` | string[] | No | Array of URLs |

**Business Rule**: Task must be active (`400` if deactive).

**Success Response** (201)

**Side Effects**: Notifies all CEO/GM users.

---

### 10.7 List Reviews

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3001/api/v1/qs-submissions/{{submissionId}}/reviews` |
| **Auth** | Any authenticated user |

---

### 10.8 Create Review

| Field | Value |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:3001/api/v1/qs-submissions/{{submissionId}}/review` |
| **Auth** | CEO, GENERAL_MANAGER |

**Request Body** (JSON):
```json
{
  "review_outcome": "approved",
  "description": "BOQ looks comprehensive and accurate — approved"
}
```

**Validation**:
| Field | Type | Required | Constraints |
|---|---|---|---|
| `review_outcome` | enum | Yes | `"approved"`/`"rejected"`/`"feedback"`/`"pending"` |
| `description` | string | Yes | 1–5000 chars |

**Side Effects**: Updates parent task status; notifies assigned QS user.

---

## 11. Designer Endpoints

> Base path: `/api/v1`

---

### 11.1 List Designer Tasks

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3001/api/v1/designer-tasks` |
| **Auth** | Any authenticated user |

**Query Parameters**:
| Param | Type | Default | Description |
|---|---|---|---|
| `page` | int | 1 | Page number |
| `limit` | int | 20 | Items per page |
| `status` | string | — | `"approved"`/`"rejected"`/`"feedback"`/`"pending"` |
| `assignedTo` | UUID | — | Filter by assigned designer |
| `isPublic` | string | — | `"true"` or `"false"` |
| `isPaused` | string | — | `"true"` or `"false"` |
| `search` | string | — | Search in title/description (ILIKE) |

**Role Filter**: `designer` sees only their assigned tasks OR public unassigned tasks.

**Success Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Villa facade design",
      "description": "Design the front facade for a 3-story modern villa",
      "status": "pending",
      "stage": null,
      "is_paused": false,
      "is_public": true,
      "task_state": "active",
      "story_point": 5,
      "due_date": "2026-06-30",
      "attachment_urls": null,
      "assigned_to_user": null,
      "assigned_by_user": { "id": "ceo-uuid", "full_name": "CEO User" }
    }
  ],
  "meta": { "total": 10, "page": 1, "limit": 20, "totalPages": 1 }
}
```

---

### 11.2 Create Designer Task

| Field | Value |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:3001/api/v1/designer-tasks` |
| **Auth** | CEO, GENERAL_MANAGER |

**Request Body** (JSON):
```json
{
  "title": "Modern villa facade",
  "description": "Design a modern facade with glass and stone elements for a 3-story building",
  "story_point": 8,
  "is_public": true,
  "due_date": "2026-06-30",
  "assigned_to_user_id": null
}
```

**Validation**:
| Field | Type | Required | Constraints |
|---|---|---|---|
| `title` | string | Yes | 1–500 chars |
| `description` | string | Yes | 1–5000 chars |
| `story_point` | int | Yes | 1–100 |
| `is_public` | boolean | No | Default: false |
| `due_date` | string | No | Date string |
| `assigned_to_user_id` | UUID | No | Directly assign a designer |

**Side Effects**:
- If `is_public = true` and not directly assigned: notifies all designers
- If directly assigned: notifies the assigned designer

**Success Response** (201):
```json
{
  "success": true,
  "data": { "id": "new-uuid", "status": "pending", "task_state": "active", "is_paused": false, ... },
  "message": "Designer task created successfully"
}
```

---

### 11.3 Get Designer Task

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3001/api/v1/designer-tasks/{{taskId}}` |
| **Auth** | Any authenticated user |

**Response**: Task with `assigned_to_user`, `assigned_by_user`, `submissions` array, and `applications` array.

**Error**: 404 — Designer task not found

---

### 11.4 Update Designer Task

| Field | Value |
|---|---|
| **Method** | `PATCH` |
| **URL** | `http://localhost:3001/api/v1/designer-tasks/{{taskId}}` |
| **Auth** | CEO, GENERAL_MANAGER |

**Request Body** (JSON) — all optional:
```json
{
  "title": "Updated facade design",
  "description": "Updated brief with new requirements",
  "status": "feedback",
  "stage": "designing",
  "is_public": true,
  "story_point": 13,
  "due_date": "2026-07-10",
  "assigned_to_user_id": "designer-uuid"
}
```

---

### 11.5 Assign Designer to Task

| Field | Value |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:3001/api/v1/designer-tasks/{{taskId}}/assign` |
| **Auth** | CEO, GENERAL_MANAGER |

**Request Body** (JSON):
```json
{
  "designer_id": "designer-user-uuid"
}
```

**Validation**:
| Field | Type | Required | Constraints |
|---|---|---|---|
| `designer_id` | UUID | Yes | Must reference an active designer |

**Business Rules**:
- Task must not already be assigned (`409`)
- Designer must exist and have role `designer` (`404`)
- All other pending applications for this task are deleted

**Success Response** (200):
```json
{
  "success": true,
  "data": { "id": "task-uuid", "assigned_to_user_id": "designer-uuid", ... },
  "message": "Designer assigned successfully"
}
```

---

### 11.6 Apply to Task (Designer)

| Field | Value |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:3001/api/v1/designer-tasks/{{taskId}}/apply` |
| **Auth** | DESIGNER |

**Request Body** (JSON):
```json
{
  "cover_note": "I have experience designing modern facades and would love to work on this project"
}
```

**Validation**:
| Field | Type | Required | Constraints |
|---|---|---|---|
| `cover_note` | string | No | 10–2000 chars |

**Business Rules**:
- Task must be public (`400`: "This task is not open for applications")
- Task must not already be assigned (`400`)
- Cannot apply twice (`409`)

**Side Effects**: Notifies all CEO/GM users.

**Success Response** (201):
```json
{
  "success": true,
  "data": { "id": "application-uuid", "designer_task_id": "task-uuid", "applicant_user_id": "designer-uuid", ... },
  "message": "Application submitted successfully"
}
```

---

### 11.7 List Applications

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3001/api/v1/designer-tasks/{{taskId}}/applications` |
| **Auth** | CEO, GENERAL_MANAGER |

**Query Parameters**: `page`, `limit`, `applicantId`

**Designer visibility**: If caller is a `designer`, they only see their own applications.

**Success Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": "app-uuid",
      "designer_task_id": "task-uuid",
      "applicant_user_id": "designer-uuid",
      "cover_note": "I have experience...",
      "applicant_user": { "id": "designer-uuid", "full_name": "Designer One" },
      "designer_task": { "id": "task-uuid", "title": "Modern villa facade" }
    }
  ],
  "meta": { "total": 3, "page": 1, "limit": 20, "totalPages": 1 }
}
```

---

### 11.8 Review Application (Accept/Reject)

| Field | Value |
|---|---|
| **Method** | `PATCH` |
| **URL** | `http://localhost:3001/api/v1/designer-applications/{{applicationId}}` |
| **Auth** | CEO, GENERAL_MANAGER |

**Request Body** (JSON):
```json
{
  "review_outcome": "approved"
}
```

**Validation**:
| Field | Type | Required | Constraints |
|---|---|---|---|
| `review_outcome` | string | Yes | `"approved"`/`"rejected"`/`"feedback"`/`"pending"` |

**Business Rules**:
- If `approved`: assigns the applicant to the task (if unassigned), deletes all other applications
- If `rejected`: notifies the applicant
- Application is **deleted** after review regardless of outcome

**Success Response** (200):
```json
{
  "success": true,
  "data": { "id": "application-uuid", "review_outcome": "approved" },
  "message": "Application reviewed successfully"
}
```

---

### 11.9 List Submissions

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3001/api/v1/designer-tasks/{{taskId}}/submissions` |
| **Auth** | Any authenticated user |

---

### 11.10 Create Submission (Designer)

| Field | Value |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:3001/api/v1/designer-tasks/{{taskId}}/submissions` |
| **Auth** | DESIGNER |

**Request Body** (JSON):
```json
{
  "stage": "case study",
  "description": "Completed case study analysis — 3 reference projects documented",
  "attachment_urls": ["https://storage.example.com/case-study.pdf"]
}
```

**Validation**:
| Field | Type | Required | Constraints |
|---|---|---|---|
| `stage` | enum | No | `"case study"`/`"designing"`/`"rendering"`/`"final stage"` |
| `description` | string | Yes | 1–5000 chars |
| `attachment_urls` | string[] | No | Array of URLs |

**Stage Progression Rules**:
- Cannot skip stages (e.g., from `case study` to `rendering`)
- Cannot submit to a previous stage
- Defaults to current task stage if not provided
- **Stage order**: `case study` → `designing` → `rendering` → `final stage`

**Other Business Rules**:
- Task must be active (`400`)
- Task must not be paused (`409`)

**Side Effects**:
- Updates task stage
- Notifies all CEO/GM users

**Success Response** (201):
```json
{
  "success": true,
  "data": { "id": "submission-uuid", "stage": "case study", ... },
  "message": "Submission created successfully"
}
```

---

### 11.11 List Submission Reviews

| Field | Value |
|---|---|
| **Method** | `GET` |
| **URL** | `http://localhost:3001/api/v1/designer-submissions/{{submissionId}}/reviews` |
| **Auth** | Any authenticated user |

---

### 11.12 Review Submission

| Field | Value |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:3001/api/v1/designer-submissions/{{submissionId}}/review` |
| **Auth** | CEO, GENERAL_MANAGER |

**Request Body** (JSON):
```json
{
  "review_outcome": "approved",
  "description": "Case study is thorough — good references. Proceed to designing."
}
```

**Validation**:
| Field | Type | Required | Constraints |
|---|---|---|---|
| `review_outcome` | enum | Yes | `"approved"`/`"rejected"`/`"feedback"`/`"pending"` |
| `description` | string | Yes | 1–5000 chars |

**Side Effects**: Notifies the assigned designer.

---

### 11.13 Create Task Performance Review

Final evaluation of a designer's work on a completed task. **Distinct from submission review** — this scores the designer overall.

| Field | Value |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:3001/api/v1/designer-tasks/{{taskId}}/review` |
| **Auth** | CEO, GENERAL_MANAGER |

**Request Body** (JSON):
```json
{
  "Creativity": 4,
  "Timeliness": 3,
  "Rendering_quality": 5,
  "Client_understanding": 4,
  "description": "Strong work overall. Could improve on meeting deadlines."
}
```

**Validation**:
| Field | Type | Required | Constraints |
|---|---|---|---|
| `Creativity` | int | Yes | 1–5 |
| `Timeliness` | int | Yes | 1–5 |
| `Rendering_quality` | int | Yes | 1–5 |
| `Client_understanding` | int | Yes | 1–5 |
| `description` | string | No | — |

**Business Logic**: `review_outcome` is calculated as the **rounded average** of the four scores. For example, (4+3+5+4)/4 = 4.0 → `review_outcome = 4`.

**Side Effects**: Notifies the assigned designer.

**Success Response** (201):
```json
{
  "success": true,
  "data": {
    "id": "review-uuid",
    "creativity": 4,
    "timeliness": 3,
    "rendering_quality": 5,
    "client_understanding": 4,
    "review_outcome": 4,
    ...
  },
  "message": "Task review created successfully"
}
```

---

### 11.14 Pause Task

| Field | Value |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:3001/api/v1/designer-tasks/{{taskId}}/pause` |
| **Auth** | CEO, GENERAL_MANAGER |

**Request Body** (JSON):
```json
{
  "reason": "Awaiting client decision on material selection"
}
```

**Validation**:
| Field | Type | Required | Constraints |
|---|---|---|---|
| `reason` | string | Yes | 1–5000 chars |

**Business Rules**:
- Task must not already be paused (`409`)
- Creates a `paused_task` record to track downtime

**Side Effects**:
- Sets `is_paused = true` on the task
- Notifies the assigned designer

**Success Response** (200):
```json
{
  "success": true,
  "data": { "id": "task-uuid", "is_paused": true, ... },
  "message": "Task paused successfully"
}
```

---

### 11.15 Resume Task

| Field | Value |
|---|---|
| **Method** | `POST` |
| **URL** | `http://localhost:3001/api/v1/designer-tasks/{{taskId}}/resume` |
| **Auth** | CEO, GENERAL_MANAGER |

**No request body required.**

**Business Rules**:
- Task must be paused (`409`)
- Sets `resumed_at` on the latest `paused_task` record

**Side Effects**:
- Sets `is_paused = false` on the task
- Notifies the assigned designer

**Success Response** (200):
```json
{
  "success": true,
  "data": { "id": "task-uuid", "is_paused": false, ... },
  "message": "Task resumed successfully"
}
```

---

### 11.16 Remove Task (Deactivate)

Does NOT hard-delete. Creates an audit record and sets task to `deactive`.

| Field | Value |
|---|---|
| **Method** | `DELETE` |
| **URL** | `http://localhost:3001/api/v1/designer-tasks/{{taskId}}` |
| **Auth** | CEO only |

**Request Body** (JSON):
```json
{
  "reason": "Project cancelled by client"
}
```

**Validation**:
| Field | Type | Required | Constraints |
|---|---|---|---|
| `reason` | string | Yes | Non-empty string |

**Side Effects**:
- Creates a `designer_task_removal` audit record
- Sets `task_state = "deactive"`

**Success Response** (200):
```json
{
  "success": true,
  "data": { "id": "task-uuid", "task_state": "deactive", ... },
  "message": "Task removed successfully"
}
```

---

## 12. Testing Workflows

### Workflow A: Full Marketing → Payment Verification

```
1. Login as CEO
   POST /api/v1/auth/login  { email: "ceo@...", password: "..." }
   Save accessToken

2. (Manual) Create customer record via DB seed or direct SQL

3. Create paid customer (as MARKETING user)
   POST /api/v1/paid-customers
   Body: { customer_id: "<uuid>", description: "Payment for project" }

4. Verify payment (as FINANCE user)
   POST /api/v1/paid-customers/<id>/verify
   Body: { review_outcome: "approved", description: "Verified" }

5. Check verification history
   GET /api/v1/paid-customers/<id>/verification-history
```

### Workflow B: Designer Task Lifecycle

```
1. Login as CEO

2. Create a public designer task
   POST /api/v1/designer-tasks
   Body: { title: "Villa Design", description: "...", story_point: 5, is_public: true }

3. Login as DESIGNER

4. Apply to the task
   POST /api/v1/designer-tasks/<taskId>/apply
   Body: { cover_note: "I can do this!" }

5. Login as CEO

6. Review (accept) the application
   PATCH /api/v1/designer-applications/<appId>
   Body: { review_outcome: "approved" }

7. Login as DESIGNER

8. Submit case study
   POST /api/v1/designer-tasks/<taskId>/submissions
   Body: { stage: "case study", description: "Study complete" }

9. Login as CEO

10. Review submission
    POST /api/v1/designer-submissions/<submissionId>/review
    Body: { review_outcome: "approved", description: "Looks good" }

11. Repeat steps 8–10 for: designing → rendering → final stage

12. Create final task performance review
    POST /api/v1/designer-tasks/<taskId>/review
    Body: { Creativity: 4, Timeliness: 3, Rendering_quality: 5, Client_understanding: 4 }
```

### Workflow C: Pause / Resume / Remove

```
1. Pause a task
   POST /api/v1/designer-tasks/<taskId>/pause
   Body: { reason: "Waiting for materials" }

2. Resume the task
   POST /api/v1/designer-tasks/<taskId>/resume

3. Remove (deactivate) the task
   DELETE /api/v1/designer-tasks/<taskId>
   Body: { reason: "Project cancelled" }
```

### Workflow D: Data Collector / QS Tasks

```
1. CEO creates task and assigns directly
   POST /api/v1/data-collector-tasks
   Body: { title: "...", description: "...", assigned_to_user_id: "<dc-uuid>", due_date: "..." }

2. Data collector submits work
   POST /api/v1/data-collector-tasks/<taskId>/submissions
   Body: { description: "Work complete" }

3. CEO reviews
   POST /api/v1/data-collector-submissions/<submissionId>/review
   Body: { review_outcome: "feedback", description: "Revisions needed" }

4. Data collector re-submits (same endpoint)
   POST /api/v1/data-collector-tasks/<taskId>/submissions
   Body: { description: "Revisions done" }

5. CEO approves
   POST /api/v1/data-collector-submissions/<submissionId>/review
   Body: { review_outcome: "approved", description: "All good" }
```

### Workflow E: Notifications

```
1. Check unread count
   GET /api/v1/notifications/unread-count

2. List notifications
   GET /api/v1/notifications?page=1&limit=20

3. Mark single notification read
   PATCH /api/v1/notifications/<notificationId>/read

4. Mark all read
   PATCH /api/v1/notifications/read-all
```

---

## 13. Error Reference

| Status | Typical Cause |
|---|---|
| 400 | Validation error — missing or invalid request body fields |
| 401 | Missing/invalid/expired JWT token |
| 403 | Insufficient role for the endpoint (non-CEO accessing CEO-only, etc.) |
| 404 | Entity not found (task, user, paid customer, notification) |
| 409 | Business rule conflict (already assigned, already paid, duplicate application, etc.) |
| 500 | Internal server error — check server logs |

### Common 409 Scenarios:
| Endpoint | 409 Message |
|---|---|
| POST /users | "Email already exists" |
| POST /paid-customers | "Customer is already marked as paid" |
| POST /designer-tasks/:id/assign | "Task is already assigned to a designer" |
| POST /designer-tasks/:id/apply | "You have already applied for this task" |
| POST /designer-tasks/:id/apply | "This task is already assigned" |
| POST /designer-tasks/:id/pause | "Task is already paused" |
| POST /designer-tasks/:id/resume | "Task is not paused" |
| POST /designer-tasks/:id/submissions | "Cannot submit to a paused task" |

### Postman Environment Variables
For efficient testing, set up these Postman variables:
```
base_url: http://localhost:3001/api/v1
token: (set after login via Tests tab)
```

**Postman Pre-request Script** (for authenticated requests):
```javascript
// Paste this in the "Pre-request Script" tab
```

**Postman Tests Script** (after login):
```javascript
if (pm.response.code === 200) {
    var jsonData = pm.response.json();
    pm.environment.set("token", jsonData.data.accessToken);
}
```

---

**Document version**: 1.0 | **Total endpoints**: 50 | **Build status**: ✅ Passing
