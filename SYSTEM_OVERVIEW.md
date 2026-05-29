# Workflow Management Telegram App - Complete System Guide

## 1. Executive Summary
The **Workflow Management Telegram App** is a high-fidelity digital workspace delivered as a Telegram Mini App (TMA). It serves as a unified command center for construction and design firms, seamlessly integrating customer lead generation, creative design workflows, financial verification, and executive oversight into a single mobile-first platform.

---

## 2. Technical Architecture

### Frontend Stack
- **Framework**: React 18 (TypeScript)
- **Tooling**: Vite for optimized bundling and HMR.
- **Routing**: `HashRouter` from `react-router-dom`. (Crucial for TMA environments where standard path routing can conflict with Telegram's Webview container).
- **Styling**: Tailwind CSS + Radix UI logic.
- **Iconography**: Lucide React.
- **Animations**: Framer Motion for smooth state transitions.

### Integration Layer
- **Telegram SDK**: `window.Telegram.WebApp` serves as the primary bridge.
    - **Ready Signal**: `webApp.ready()` is called on mount to gracefully display the app.
    - **Context Recovery**: Retrieves `initDataUnsafe.user` for authentication.
    - **Theme Bridging**: Synchronizes CSS variables with Telegram's `colorScheme`.

### Persistence & Data Layer
The application implements a custom Persistence Engine using `localStorage`. It features "Seed Synchronization," where missing records are automatically populated from `mockData.ts` on initialization.
- **Persistence Strategy**: JSON-serialized objects stored in the browser's persistent storage.
- **Type Safety**: All mock and persistent data is strictly typed via interfaces in `src/app/types/index.ts`.

---

## 3. User Roles & Modules

| Role | Core Identity | Primary Functional Access |
| :--- | :--- | :--- |
| **CEO / GM** | Executives | Full oversight, Designer task assignment, Final project sign-offs. |
| **Finance Officer** | Gatekeeper | Verification of payment proofs, resubmission management. |
| **Quantity Surveyor** | Technical | Material/cost evaluations, technical audit queue. |
| **Designer** | Production | Job application portal, Phase-based design submissions. |
| **Site Engineer** | Field Ops | Site condition reporting, measurement verification. |
| **Marketing Lead** | Acquisition | Lead logging, responding to finance clarification requests. |

---

## 4. Operational Workflows (Deep-Dive)

### A. The "Paid Customer" Activation Flow
1. **Lead Entry**: Marketing logs a `CustomerRequest`.
2. **Payment Lifecycle**:
    - **Marketing Action**: Uploads `PaymentProof` (Image/PDF).
    - **Finance Review**: Finance Officer reviews the proof. Action options:
        - **Verify**: Moves record to `verified-records`.
        - **Reject**: Permanent failure state.
        - **Clarify**: Triggers a `request_clarification` task for Marketing.
3. **Project Ignition**: Once verified, the object is promoted to a `PaidCustomer` record, unlocking project-level tasking.

### B. Designer Multi-Phase Production Engine
Designer tasks follow a linear, gated 4-phase sequence. Designers cannot skip phases; each requires management sign-off to proceed.
1. **Case Study**: Contextual research & site analysis.
2. **Design Stage**: Drafting & layout.
3. **Rendering**: 3D visualization.
4. **Final Stage**: Execution-ready technical drawings.

**State Rules**:
- **Phase History**: Every submission logs a `snapshot` of the note and screenshot at that time.
- **Gating**: The "Next Phase" button is only enabled when the previous phase is `Approved`.
- **Feedbacks**: If management gives feedback, the designer must "Submit Revision" to restart the review for that specific phase.

### C. Quantity Surveyor (QS) Lifecycle
The QS module operates via an "Evaluation Record" system:
- **Assignment**: CEO/GM forwards a design submission to the QS.
- **Technical Review**: QS performs a cost/quality audit.
- **Recommendation**: QS chooses `recommended_for_approval` or `recommends_revision`.
- **Final Decision**: CEO/GM reviews the QS evaluation and makes the final decision (`Approved` vs `Feedback`).

---

## 5. Automation & Notifications

### Smart Badge System
The application uses two-tier notification logic:
1. **Role Filtering**: Notifications are only broadcast to `targetRoles`.
2. **Intersection Visibility**: To handle "New" badges accurately, the app uses an `IntersectionObserver`. 
    - A record is only marked as "Seen" (removing the badge) if it is ≥70% visible in the user's viewport.
    - Badges persist across page visits until the user actually scrolls to the record.

### Automated State Triggers
- **Finance `Verified`**: Promotes Lead to Project.
- **Job Application `Assigned`**: Creates a `DesignerTask` and links the Designer's UID.
- **Evaluation `Approved`**: Triggers a notification to the original task owner.

---

## 6. Developer Cheat Sheet

### Storage Keys (LocalStorage)
- `user`: Current session user object.
- `paid-customers`: Core project and payment data.
- `designer-tasks`: Designer-specific work items.
- `designer-submission-progress`: Detailed phase history for designer tasks.
- `quantity-surveyor-review-tasks`: QS technical queue.
- `quantity-surveyor-notifications`: Unified role-based alert records.

### Entity ID Prefixes
- `proj-`: Project containers.
- `task-`: Site Engineer / General Tasks.
- `dtask-`: Designer Task IDs.
- `pc-fin-`: Finance Verification Records.
- `qs-review-`: Quantity Surveyor Technical Review Records.




