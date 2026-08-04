import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Allowed institutional email domain (US-B1)
const ALLOWED_DOMAIN = 'iiml.ac.in';

/**
 * T2-P2: Middleware to authenticate requests via Session Token / Authorization Header.
 * Verifies domain server-side and attaches user and role from the DB to req.user.
 */
export const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const sessionToken = req.headers['x-session-token'] || (authHeader && authHeader.split(' ')[1]);

    if (!sessionToken) {
      return res.status(401).json({ error: 'Authentication required. No session token provided.' });
    }

    // Lookup user directly in DB to resolve current state and role
    const user = await prisma.user.findUnique({
      where: { id: sessionToken },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid or expired session token.' });
    }

    // SERVER-SIDE domain validation (Guardrail: Do not trust client-side hints)
    const emailDomain = user.email.split('@')[1];
    if (emailDomain !== ALLOWED_DOMAIN) {
      return res.status(403).json({ 
        error: `Access restricted to institutional accounts (@${ALLOWED_DOMAIN}) only.` 
      });
    }

    // Attach verified user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    return res.status(500).json({ error: 'Internal server authentication error.' });
  }
};

/**
 * T2-P2 & T2-P3: Role-Based Access Control (RBAC) Middleware Generator.
 * Enforces authorization policies on protected endpoints.
 */
export const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Forbidden: You do not have permission to access this resource.' 
      });
    }

    next();
  };
};

/**
 * Helper shortcut for Admin-only routes (US-A3, US-B2, US-C1, US-C5)
 */
export const requireAdmin = requireRole(['Admin']);