// Auth middleware — JWT verification + RBAC + scope guards.
// Team 2 (Prodnova) owned. See AGENTS.md rule 4:
//   Authorization is enforced server-side in middleware on every authenticated
//   route. Never trust a role claim from the client. UI hiding is not access control.
import jwt from "jsonwebtoken";
import { verifyToken } from "../lib/jwt.js";
import prisma from "../lib/prisma.js";

/**
 * authenticate — verifies the JWT and attaches the full user record to req.user.
 * Role is ALWAYS read from the database, never from the token.
 *
 * Returns 401 with a distinct error for expired vs invalid tokens so the client
 * can decide whether to refresh or re-authenticate.
 */
export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const token = header.slice(7);
  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: "Token expired", code: "TOKEN_EXPIRED" });
    }
    return res.status(401).json({ error: "Invalid token" });
  }

  if (payload.type !== "access") {
    return res.status(401).json({ error: "Invalid token type" });
  }

  // Always read role from the database — never trust the token's claims.
  prisma.user
    .findUnique({ where: { id: payload.sub } })
    .then((user) => {
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      req.user = user;
      next();
    })
    .catch(next);
}

/**
 * requireRole — role-based access control middleware.
 * Pass one or more allowed roles. Requires authenticate() to have run first.
 *
 * Usage:
 *   router.get("/admin/venues", authenticate, requireRole("ADMIN"), handler);
 *   router.get("/approvals", authenticate, requireRole("APPROVER", "ADMIN"), handler);
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}
