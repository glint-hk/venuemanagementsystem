# Change Management Log

Append-only release log — one entry per production release. Do not edit or remove past entries; add a new one for each release.

Pair with the mandatory pre-migration step in README.md ("Deployment"): commit a `pg_dump` snapshot to `db_backups/` before any schema or data change lands in a release.

---

## 2026-07-28 — Team 2 (Prodnova) Release — Identity & Stakeholder Experience

### 🚀 Features Shipped (US-B1 through US-B6)
- **Institutional SSO & JWT Auth (US-B1):** Domain-restricted (`@iiml.ac.in`) login with 15m access token & 7d refresh token rotation.
- **Auto-registration & Role Elevation (US-B2):** Automatic `BOOKER` provisioning on first login; Admin-only role elevation requiring `approverTier` for `APPROVER` role; atomic `audit_log` transaction.
- **Search & Booking Workflow (US-B3):** Venue filtering, creation, modification with re-approval warning, cancellation, and PostgreSQL exclusion constraint handling (`409 Conflict`).
- **Approver Workspace (US-B4):** Tier-prefiltered approval review dashboard; mandatory rejection comments.
- **Public Availability Board (US-B5):** Privacy-preserving anonymous endpoint (`/public/availability`) excluding booker identity and event purpose at the query level.
- **Mobile Responsive Design (US-B6):** Responsive top navbar, sliding drawer navigation, and adaptive card layouts.

### 🔑 Seeded Test Credentials (In `server/prisma/seed.js`)
- **Booker:** `student@iiml.ac.in` (Name: "Student Booker", Role: `BOOKER`)
- **Approver (Tier 1):** `approver1@iiml.ac.in` (Name: "Faculty Approver", Role: `APPROVER`, Tier: `1`)
- **Approver (Tier 2):** `approver2@iiml.ac.in` (Name: "Dean Approver", Role: `APPROVER`, Tier: `2`)
- **Admin:** `admin@iiml.ac.in` (Name: "Admin User", Role: `ADMIN`)

### 🛣️ API Routes Added/Owned
- `/auth/login` (POST), `/auth/refresh` (POST), `/auth/me` (GET)
- `/public/availability` (GET)
- `/api/venues` (GET), `/api/venues/:id` (GET), `/api/venues/:id/availability` (GET)
- `/api/bookings` (GET, POST), `/api/bookings/:id` (GET, PATCH, DELETE)
- `/api/bookings/pending-approvals` (GET), `/api/bookings/:id/approve` (POST)
- `/api/admin/users` (GET), `/api/admin/users/:userId/role` (PATCH)

### 📊 Verification Status
- `npm run lint`: **0 errors**
- `npm test`: **25/25 passing** (across 6 test suites including `e2e-journey.test.js`)
- `npm run build`: Production build verified into `server/public`
