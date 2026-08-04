import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import { listVenues, getVenue, getVenueAvailability } from "../controllers/venue.js";
import {
  createBooking,
  getBookings,
  getBookingById,
  updateBooking,
  cancelBooking,
} from "../controllers/bookingController.js";
import { pendingApprovals, approveBooking } from "../controllers/approvalController.js";
import { listUsers, elevateRole, listAuditLogs } from "../controllers/admin.js";

// All authenticated routes, role/scope-gated via server/src/middleware/auth.js.
// Mounted here by resource area as controllers land — see README.md
// "Team ownership map" for who owns which resource.
const router = Router();

// All /api routes require authentication
router.use(authenticate);

// ── Venues (Team 1 / Team 2 read path) ──
router.get("/venues", listVenues);
router.get("/venues/:venueId", getVenue);
router.get("/venues/:venueId/availability", getVenueAvailability);

// ── Bookings (Team 1 — US-A2) ──
// NOTE: pending-approvals must be registered before the :bookingId param
// route below, or Express would try to resolve "pending-approvals" as a
// bookingId.
router.post("/bookings", createBooking);
router.get("/bookings", getBookings);
router.get("/bookings/pending-approvals", pendingApprovals);
router.get("/bookings/:bookingId", getBookingById);
router.patch("/bookings/:bookingId", updateBooking);
router.delete("/bookings/:bookingId", cancelBooking);

// ── Approvals (Team 3 — US-C2) ──
router.post("/bookings/:bookingId/approve", approveBooking);

// ── Admin (Team 2 — US-B2) ──
router.get("/admin/users", requireRole("ADMIN"), listUsers);
router.patch("/admin/users/:userId/role", requireRole("ADMIN"), elevateRole);
router.get("/admin/audit-logs", requireRole("ADMIN"), listAuditLogs);

export default router;
