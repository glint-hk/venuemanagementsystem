import { Router } from "express";
import { authenticate, requireAdmin } from "../middleware/authMiddleware.js";

import * as bookingController from "../controllers/bookingController.js";
import * as venueController from "../controllers/venueController.js";
import * as adminController from "../controllers/adminController.js";
import * as publicController from "../controllers/publicController.js";
import { pendingApprovals, approveBooking } from "../controllers/approvalController.js";

const router = Router();


// ==========================================
// BOOKING LIFECYCLE (US-A2)
// ==========================================
router.post("/bookings", authenticate, bookingController.createBooking);
router.get("/bookings", authenticate, bookingController.getBookings);
router.get("/bookings/:id", authenticate, bookingController.getBookingById);
router.patch("/bookings/:id", authenticate, bookingController.updateBooking);
router.patch(
  "/bookings/:id/cancel",
  authenticate,
  bookingController.cancelBooking
);

// ==========================================
// VENUE REGISTRY (US-A3 / US-A4)
// ==========================================
router.get("/venues", authenticate, venueController.getAllVenues);
router.get("/venues/:id", authenticate, venueController.getVenueById);
router.post("/venues", authenticate, requireAdmin, venueController.createVenue);
router.patch("/venues/:id", authenticate, requireAdmin, venueController.patchVenue);
router.delete("/venues/:id", authenticate, requireAdmin, venueController.deleteVenue);
router.get("/venues/:id/availability", authenticate, venueController.getVenueAvailability)

// ==========================================
// ADMIN CONSOLE (US-A4 / US-A5)
// ==========================================
router.post(
  "/admin/venues/:id/blocks",
  authenticate,
  requireAdmin,
  adminController.createVenueBlock
);
router.delete(
  "/admin/blocks/:blockId",
  authenticate,
  requireAdmin,
  adminController.removeVenueBlock
);
router.get(
  "/admin/metrics/utilization",
  authenticate,
  requireAdmin,
  adminController.getUtilizationMetrics
);
router.post(
  "/admin/users",
  authenticate,
  requireAdmin,
  adminController.listUsers
);
router.post(
  "/admin/logs",
  authenticate,
  requireAdmin,
  adminController.listAuditLogs
);

router.get("/bookings/:bookingId/approve", authenticate, approveBooking);
router.get("/bookings/approvals", authenticate, pendingApprovals);

export default router;
