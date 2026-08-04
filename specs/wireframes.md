# Wireframe Specification — Team 2 (Prodnova)

## 1. Overview
This document specifies the wireframe layouts, interactive components, field lists, error/loading states, and role-based permissions for Team 2's screens:
- Login & Institutional SSO (`US-B1`)
- User Management & Role Elevation (`US-B2`)
- Venue Search & Availability Grid (`US-B3`)
- Booking Request Form & My Bookings (`US-B3`)
- Approver Review Workspace (`US-B4`)
- Public Availability Board (`US-B5`)
- Mobile Responsive Layouts (`US-B6`)

---

## 2. Screen Specifications

### Screen 1: Institutional Login (`/login`) — `US-B1`
- **Header:** Venue Booking logo, IIM Lucknow title.
- **Fields:**
  - `Institutional Email`: Text input, restricted server-side to `@iiml.ac.in`.
  - `Full Name`: Text input.
- **Actions:** `Sign In` button (triggers JWT token issuance).
- **Public Link:** "View public availability →" (links to `/availability`).
- **Error States:** Invalid domain error box (`403`), empty fields error (`400`).

---

### Screen 2: User Management (`/admin/users`) — `US-B2`
- **Access:** `ADMIN` role only.
- **Layout:** Data table displaying user list with columns:
  - Name, Email, Role badge (`BOOKER`, `APPROVER`, `ADMIN`), Approver Tier, Actions.
- **Action Modal (`Edit Role`):**
  - Role dropdown selector (`BOOKER` | `APPROVER` | `ADMIN`).
  - `Approver Tier` input (visible & required when role is `APPROVER`).
  - `Save` button (invokes `PATCH /api/admin/users/:userId/role`, writes `audit_log`).
- **Error States:** Missing tier when role is `APPROVER` (`400`), non-admin access refused (`403`).

---

### Screen 3: Venue Search & Availability Grid (`/search`) — `US-B3`
- **Filter Bar:**
  - Venue Type input (e.g., classroom, auditorium).
  - Minimum Capacity numeric input.
  - Attributes comma-separated input (projector, sound system).
  - `Search` button.
- **Venue Grid:** Cards displaying venue name, location, capacity, type, attribute chips, and `Book Now` button.
- **Booking Modal:**
  - Purpose, Date, Start Time, End Time.
  - **Re-approval Warning:** Alert box notifying user that modifying booking dates/times re-triggers approval.
- **Error States:** Slot occupied error (`409 Conflict`), empty search results state ("No venues match your filters").

---

### Screen 4: My Bookings Dashboard (`/dashboard`) — `US-B3`
- **Header:** Welcome greeting, `+ New Booking` button.
- **Booking List:** Cards displaying venue name, location, date/time window, purpose, status badge (`PENDING`, `APPROVED`, `REJECTED`, `MODIFIED`, `CANCELLED`).
- **Actions:** `Modify` button (opens edit modal), `Cancel` button (with confirm dialog).
- **Empty State:** Graphic placeholder with link to search venues.

---

### Screen 5: Approver Review Workspace (`/approvals`) — `US-B4`
- **Access:** `APPROVER` and `ADMIN` roles only.
- **Layout:** List of pending bookings matching the signed-in approver's step tier.
- **Cards Display:** Venue, Booker name, requested timeslot, purpose, current step index.
- **Decision Modal:**
  - `Approve` / `Reject` buttons.
  - `Comment` textarea (optional for approval, **mandatory** for rejection).

---

### Screen 6: Public Availability Board (`/availability`) — `US-B5`
- **Access:** Anonymous public (no login required).
- **Privacy Rule:** Response shape is strictly `PublicAvailabilitySlotDTO` (`venueId`, `timeslot`, `busy`). Identity and event purpose are stripped at query level.
- **Controls:** Date range selectors (`From`, `To`).
- **Grid:** Card per slot showing Venue Name, Timeslot, and Status Badge (`Booked` / `Available`).

---

### Screen 7: Mobile Admin Overview (`/admin`) — `US-B6`
- **Responsive Layout:** Single-column layout on viewports < 768px, collapsible sidebar navigation, full width tables with scroll containers.
