import { Router } from 'express';
import bookingController from '../controllers/bookingController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { Role } from '../shared/enums.js'; // Import frozen Role enum (BOOKER, APPROVER, ADMIN)

const router = Router();

// Require authentication for all booking routes
router.use(authenticate);

// CREATE: Bookers, Approvers, and Admins can create bookings
router.post(
  '/',
  authorize([Role.BOOKER, Role.APPROVER, Role.ADMIN]),
  bookingController.createBooking
);

// READ LIST: Authenticated users (Controller enforces row-level filtering)
router.get('/', bookingController.getBookings);

// READ BY ID: Authenticated users (Controller enforces Booker/Admin/Current-Approver access)
router.get('/:id', bookingController.getBookingById);

// UPDATE: Bookers, Approvers, and Admins (Controller enforces ownership/Admin check)
router.put(
  '/:id',
  authorize([Role.BOOKER, Role.APPROVER, Role.ADMIN]),
  bookingController.updateBooking
);

// CANCEL: Bookers, Approvers, and Admins (Controller enforces ownership/Admin check)
router.patch(
  '/:id/cancel',
  authorize([Role.BOOKER, Role.APPROVER, Role.ADMIN]),
  bookingController.cancelBooking
);

export default router;