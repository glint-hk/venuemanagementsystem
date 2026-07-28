import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import { listVenues, getVenue, getVenueAvailability } from "../controllers/venue.js";
import {
  createBooking,
  listMyBookings,
  getBooking,
  modifyBooking,
  cancelBooking,
  pendingApprovals,
  approveBooking,
} from "../controllers/booking.js";
import { listUsers, elevateRole, listAuditLogs } from "../controllers/admin.js";

// All authenticated routes, role/scope-gated via server/src/middleware/auth.js.
// Mounted here by resource area as controllers land — see README.md
// "Team ownership map" for who owns which resource.
const router = Router();

// All /api routes require authentication
router.use(authenticate);

// ── Venues ──
router.get("/venues", listVenues);
router.get("/venues/:venueId", getVenue);
router.get("/venues/:venueId/availability", getVenueAvailability);

// ── Bookings ──
router.post("/bookings", createBooking);
router.get("/bookings", listMyBookings);
router.get("/bookings/pending-approvals", pendingApprovals);
router.get("/bookings/:bookingId", getBooking);
router.patch("/bookings/:bookingId", modifyBooking);
router.delete("/bookings/:bookingId", cancelBooking);
router.post("/bookings/:bookingId/approve", approveBooking);

// ── Admin ──
router.get("/admin/users", requireRole("ADMIN"), listUsers);
router.patch("/admin/users/:userId/role", requireRole("ADMIN"), elevateRole);
router.get("/admin/audit-logs", requireRole("ADMIN"), listAuditLogs);

export default router;
