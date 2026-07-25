import { Router } from "express";

// All authenticated routes, role/scope-gated via server/src/middleware/auth.js.
// Mounted here by resource area as controllers land — see README.md
// "Team ownership map" for who owns which resource.
const router = Router();

export default router;
