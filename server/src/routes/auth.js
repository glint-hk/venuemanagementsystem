import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateUser, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();
const prisma = new PrismaClient();
const ALLOWED_DOMAIN = 'iiml.ac.in';

/**
 * POST /api/auth/login
 * US-B1 & US-B2: Handles Institutional SSO authentication & auto-registration.
 * Expects { email, name, providerId } from verified SSO token exchange.
 */
router.post('/login', async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Valid institutional email is required.' });
    }

    // Server-Side Institutional Domain Check (T2-P2 Guardrail)
    const domain = email.split('@')[1];
    if (domain !== ALLOWED_DOMAIN) {
      return res.status(403).json({ 
        error: `Access denied. Only @${ALLOWED_DOMAIN} email addresses are permitted.` 
      });
    }

    // Find existing user or auto-register new user with default role 'Booker' (US-B2)
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: name || email.split('@')[0],
          role: 'Booker', // T2-P3 Guardrail: Always default to lowest-privilege role
        },
      });
    }

    return res.status(200).json({
      message: 'Authentication successful',
      token: user.id, // Using user ID as session token for database-backed lookup
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ error: 'Authentication failed due to a server error.' });
  }
});

/**
 * GET /api/auth/me
 * US-B1: Returns current session user info.
 */
router.get('/me', authenticateUser, (req, res) => {
  return res.status(200).json({ user: req.user });
});

/**
 * PUT /api/auth/roles/elevate
 * US-B2: Admin-only endpoint to elevate user roles.
 * T2-P3 Guardrail: Role updates MUST write an audit_log row in the exact same transaction.
 */
router.put('/roles/elevate', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { targetUserId, newRole } = req.body;

    const VALID_ROLES = ['Booker', 'Approver', 'Admin'];
    if (!targetUserId || !VALID_ROLES.includes(newRole)) {
      return res.status(400).json({ 
        error: `Invalid parameters. Allowed roles are: ${VALID_ROLES.join(', ')}` 
      });
    }

    // Atomic transaction: Update user role AND record audit log entry
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch current user state for audit context
      const targetUser = await tx.user.findUnique({
        where: { id: targetUserId },
      });

      if (!targetUser) {
        throw new Error('TARGET_USER_NOT_FOUND');
      }

      const previousRole = targetUser.role;

      // 2. Update role
      const updatedUser = await tx.user.update({
        where: { id: targetUserId },
        data: { role: newRole },
      });

      // 3. Write immutable audit log row in the same transaction
      await tx.auditLog.create({
        data: {
          actorId: req.user.id,
          action: 'ROLE_ELEVATED',
          entityType: 'USER',
          entityId: targetUserId,
          details: JSON.stringify({
            previousRole,
            newRole,
            targetEmail: targetUser.email,
          }),
        },
      });

      return updatedUser;
    });

    return res.status(200).json({
      message: 'User role updated successfully.',
      user: {
        id: result.id,
        email: result.email,
        name: result.name,
        role: result.role,
      },
    });
  } catch (error) {
    if (error.message === 'TARGET_USER_NOT_FOUND') {
      return res.status(404).json({ error: 'Target user not found.' });
    }
    console.error('Role Elevation Error:', error);
    return res.status(500).json({ error: 'Failed to update user role.' });
  }
});

export default router;