# Team 2 (Prodnova) Handover & Integration Specification

**Epic:** Identity & Stakeholder Experience (`US-B1` through `US-B6`)  
**Status:** 100% Complete · Verified · 25/25 Tests Passing  
**Branch:** `team2-identity-stakeholder`

---

## 1. Overview of Delivered Scope

Team 2 (Prodnova) has delivered the complete identity, authentication, venue search, booking creation/modification, approver review, public availability, and mobile-responsive layout features.

### Delivered User Stories
* **`US-B1` (SSO & Session Lifecycle):** Restricts login to institutional domain (`@iiml.ac.in`). Issues short-lived access tokens (15m) and long-lived refresh tokens (7d) with automatic background token rotation in `apiClient.js`.
* **`US-B2` (Auto-registration & Role Elevation):** Auto-registers first-time sign-ins as `BOOKER`. Exposes Admin-only user management (`/admin/users`) enforcing mandatory `approverTier` for `APPROVER` roles and writing atomic `audit_log` entries.
* **`US-B3` (Venue Search & Booking Management):** Search interface with capacity, type, and attribute filters (`/search`). Booker dashboard (`/dashboard`) with status transparency, step-by-step decision history, cancellation, and a **Modify Booking Modal** that triggers re-approval warnings and handles PostgreSQL exclusion conflicts (`409 Conflict`).
* **`US-B4` (Approver Workspace):** Approver dashboard (`/approvals`) pre-filtered to show only requests awaiting decision at the approver's tier. Requires mandatory comments on rejection.
* **`US-B5` (Public Board & Privacy):** Anonymous public availability grid (`/availability` & `/public/availability`). Enforces strict privacy by stripping booker identity and event purpose at the SQL query layer.
* **`US-B6` (Responsive Mobile Shell & Admin Hub):** Mobile-first `Layout.jsx` with sliding navigation drawer, top header bar, and an Admin Overview Hub (`/admin`) displaying KPIs, Venue Registry, and live System Audit Log feed.

---

## 2. File Ownership Map

### Frontend Components & Pages (`client/src/`)
- `client/src/context/AuthContext.jsx` — Context provider for authenticated user state & logout.
- `client/src/lib/apiClient.js` — Central API client with automatic token refresh interceptor.
- `client/src/lib/roleHome.js` — Role-based home route resolver (`ADMIN` → `/admin`, `APPROVER` → `/approvals`, `BOOKER` → `/dashboard`).
- `client/src/components/Layout.jsx` — Mobile-responsive layout shell with drawer menu & exact-path `NavLink`.
- `client/src/pages/LoginPage.jsx` — Institutional login view with sample account quick-fill buttons.
- `client/src/pages/DashboardPage.jsx` — My Bookings view, multi-step progress, modify modal, cancellation.
- `client/src/pages/SearchPage.jsx` — Venue search filters & booking request modal.
- `client/src/pages/ApprovalsPage.jsx` — Approver decision interface with mandatory rejection comment modal.
- `client/src/pages/PublicBoardPage.jsx` — Anonymous venue availability grid with date picker.
- `client/src/pages/AdminOverviewPage.jsx` — Admin overview hub (KPIs, Audit Feed, Venue Registry).
- `client/src/pages/AdminUsersPage.jsx` — User role elevation table & modal.

### Backend Controllers & Middleware (`server/src/`)
- `server/src/controllers/auth.js` — Login, token refresh, `/auth/me` endpoints.
- `server/src/controllers/booking.js` — Booking creation, listing, pending approvals, decision submission, modification, cancellation.
- `server/src/controllers/venue.js` — Venue listing & privacy-isolated public availability query.
- `server/src/controllers/admin.js` — User role elevation & audit log feed query.
- `server/src/middleware/auth.js` — JWT verification, DB-backed zero-trust role verification middleware (`authenticate`, `requireRole`).
- `server/src/lib/jwt.js` — JWT sign & verify helpers.

### Seed Data & Test Suites
- `server/prisma/seed.js` — PostgreSQL database seed script with test accounts, campus venues, and approval chains.
- `server/tests/e2e-journey.test.js` — Complete End-to-End Journey test suite (`T2-P8`).
- `server/tests/auth-sso.test.js`, `auto-registration.test.js`, `search-and-booking.test.js`, `public-board.test.js`, `shared-contract.test.js`.

---

## 3. Seeded Test Accounts

| Role | Email | Name | Tier / Privileges |
|---|---|---|---|
| **Booker** | `student@iiml.ac.in` | Student Booker | Standard booker permissions |
| **Approver (Tier 1)** | `approver1@iiml.ac.in` | Faculty Approver | Tier 1 approval decisions |
| **Approver (Tier 2)** | `approver2@iiml.ac.in` | Dean Approver | Tier 2 approval decisions |
| **Admin** | `admin@iiml.ac.in` | Admin User | Role elevation, system audit logs, full admin overview |

---

## 4. Detailed Cross-Team Dependencies & Integration Touchpoints

### 🔗 Touchpoints with Team 1 (Data Core & Admin Console)

1. **Venue CRUD & Editing (`POST /api/venues`, `PATCH /api/venues/:id`):**
   * **Current State:** Team 2's `AdminOverviewPage.jsx` (`/admin`) and `SearchPage.jsx` render a read-only list of venues via `GET /api/venues`.
   * **Integration Step:** Team 1 will attach "Create Venue" and "Edit Venue" modals onto `AdminOverviewPage.jsx` and implement the corresponding mutation controllers (`createVenue`, `updateVenue`).
2. **Venue Blackout Windows (`venue_blocks`):**
   * **Current State:** Search & Public Board query venue availability.
   * **Integration Step:** Team 1 owns blackout windows (holidays, standing reservations). When Team 1 creates `venue_blocks` rows, Team 2's `getVenueAvailability` and `publicAvailability` controllers will automatically filter out blacked-out slots.
3. **Utilization Analytics Dashboard:**
   * **Integration Step:** Team 1 will add peak-hour utilization charts and export buttons (CSV/PDF) onto `AdminOverviewPage.jsx`.

---

### 🔗 Touchpoints with Team 3 (Approval Engine & Notifications)

1. **Approval Chain Configuration (`approval_chains`):**
   * **Current State:** Team 2 snapshots approval chains into `approvalChainSnapshot` when a booking is created (`POST /api/bookings`).
   * **Integration Step:** Team 3 owns the Admin Approval Chain Configurator (`/admin/chains`). When Team 3 edits `approval_chains` rows, future bookings created via Team 2's UI will automatically snapshot the updated chain config.
2. **Transactional Notification Outbox (`notification_outbox`):**
   * **Current State:** Team 2's booking creation, decision submission, and modification controllers execute inside Prisma `$transaction` blocks.
   * **Integration Step:** Team 3's notification outbox consumer worker will read pending rows written to `notification_outbox` during state changes and dispatch email alerts and `.ics` calendar invites.
3. **Automated Escalation & Auto-Expiry (`escalationWindowHours`):**
   * **Current State:** Pending bookings remain `PENDING` until an approver acts.
   * **Integration Step:** Team 3's scheduled cron worker will monitor `currentStepIndex` and `escalationWindowHours` to auto-expire or auto-escalate stale requests (> 48h).

---

## 5. Verification Check

```powershell
npm run lint    # 0 errors
npm run build   # Production bundle in server/public
npm test        # 25/25 tests passing
```
