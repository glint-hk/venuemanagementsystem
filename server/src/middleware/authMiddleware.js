import prisma from "../lib/prisma.js";
import { Role } from "../../../shared/index.js";

const ALLOWED_DOMAIN = "iiml.ac.in";

/**
 * Authenticate requests via session token (user id) in Authorization header
 * or x-session-token. Roles are always read from the database.
 */
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const sessionToken =
      req.headers["x-session-token"] ||
      (authHeader && authHeader.split(" ")[1]);

    if (!sessionToken) {
      return res
        .status(401)
        .json({ error: "Authentication required. No session token provided." });
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionToken },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        approverTier: true,
      },
    });

    if (!user) {
      return res
        .status(401)
        .json({ error: "Invalid or expired session token." });
    }

    const emailDomain = user.email.split("@")[1];
    if (emailDomain !== ALLOWED_DOMAIN) {
      return res.status(403).json({
        error: `Access restricted to institutional accounts (@${ALLOWED_DOMAIN}) only.`,
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    return res
      .status(500)
      .json({ error: "Internal server authentication error." });
  }
}

/** RBAC middleware — allowedRoles must be Role enum values from shared/. */
export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated." });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Forbidden: You do not have permission to access this resource.",
      });
    }

    next();
  };
}

export const requireAdmin = requireRole([Role.ADMIN]);
