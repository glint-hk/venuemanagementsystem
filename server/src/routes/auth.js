import { Router } from "express";
import { login, refresh, me } from "../controllers/auth.js";
import { authenticate } from "../middleware/auth.js";

// Public auth routes (no auth required for login/refresh).
// Team 2 (Prodnova) owned.
const router = Router();

// POST /auth/login — sign in with email (dev mode) or Google OAuth
router.post("/login", login);

// POST /auth/refresh — rotate refresh token
router.post("/refresh", refresh);

// GET /auth/me — get current user (requires auth)
router.get("/me", authenticate, me);

export default router;
