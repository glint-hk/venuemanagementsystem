import { Router } from "express";
import authRoutes from "./auth.js";
import { authenticate, requireAdmin } from "../middleware/authMiddleware.js";

// Controllers
import * as bookingController from "../controllers/bookingController.js";
import {
  getAllVenues,
  getVenueById,
  createVenue,
  patchVenue,
  deleteVenue,
} from "../controllers/venueController.js";
import {
  createVenueBlock,
  removeVenueBlock,
  getUtilizationMetrics,
} from "../controllers/adminController.js";

const router = Router();

// ==========================================
// 1. AUTHENTICATION ROUTES
// ==========================================
router.use("/auth", authRoutes);

// ==========================================
// 2. BOOKING LIFECYCLE ROUTES (US-A2)
// ==========================================
router.post("/bookings", authenticate, bookingController.createBooking);
router.get("/bookings", authenticate, bookingController.getBookings);
router.get("/bookings/:id", authenticate, bookingController.getBookingById);
router.put("/bookings/:id", authenticate, bookingController.updateBooking);
router.patch("/bookings/:id/cancel", authenticate, bookingController.cancelBooking);

// ==========================================
// 3. VENUE MANAGEMENT ROUTES (US-A3 / US-A4)
// ==========================================
// Public / Authenticated read endpoints
router.get("/venues", authenticate, getAllVenues);
router.get("/venues/:id", authenticate, getVenueById);

// Admin Venue CRUD (Create, Modify, Delete)
router.post("/venues", authenticate, requireAdmin, createVenue);
router.patch("/venues/:id", authenticate, requireAdmin, patchVenue);
router.delete("/venues/:id", authenticate, requireAdmin, deleteVenue);

// ==========================================
// 4. ADMIN CONSOLE & BLACKOUT ROUTES (US-A4 / US-A5)
// ==========================================
router.post("/admin/venues/:id/blocks", authenticate, requireAdmin, createVenueBlock);
router.delete("/admin/blocks/:blockId", authenticate, requireAdmin, removeVenueBlock);
router.get("/admin/metrics/utilization", authenticate, requireAdmin, getUtilizationMetrics);

export default router;