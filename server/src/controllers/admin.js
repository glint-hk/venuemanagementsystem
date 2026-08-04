// Admin controller — role elevation and user management.
// Team 2 (Prodnova) owned. US-B2: Auto-registration & role elevation.
//
// Rules enforced:
// - Role elevation is Admin-only, enforced in middleware (not UI hiding)
// - No self-elevation path
// - Elevating to APPROVER requires approverTier
// - Every elevation writes an audit_log row
import prisma from "../lib/prisma.js";
import { Role } from "shared";

/**
 * GET /api/admin/users — list all users with their roles.
 * Admin-only.
 */
export async function listUsers(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        approverTier: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return res.json(users);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/admin/users/:userId/role — elevate or change a user's role.
 * Admin-only (enforced by middleware in routes).
 *
 * Body: RoleElevationRequest from shared/contracts.js
 *   { userId, role, approverTier }
 *
 * US-B2 rules:
 * - approverTier required when role is APPROVER, rejected otherwise
 * - Every change writes an audit_log row in the same transaction
 */
export async function elevateRole(req, res, next) {
  try {
    const { userId } = req.params;
    const { role, approverTier } = req.body;

    // Validate role is a valid Role enum value
    if (!Object.values(Role).includes(role)) {
      return res.status(400).json({ error: `Invalid role: ${role}` });
    }

    // US-B2: Elevating to APPROVER requires approverTier
    if (role === Role.APPROVER && (approverTier === undefined || approverTier === null)) {
      return res.status(400).json({
        error: "approverTier is required when elevating to APPROVER",
      });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const previousRole = targetUser.role;
    const previousTier = targetUser.approverTier;

    // Perform role change + audit log in the same transaction
    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          role,
          approverTier: role === Role.APPROVER ? approverTier : null,
        },
      }),
      prisma.auditLog.create({
        data: {
          entityType: "user",
          entityId: userId,
          action: "ROLE_ELEVATED",
          actorId: req.user.id,
          metadata: {
            previousRole,
            previousTier,
            newRole: role,
            newTier: role === Role.APPROVER ? approverTier : null,
          },
        },
      }),
    ]);

    return res.json({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      approverTier: updatedUser.approverTier,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/audit-logs — list system audit logs.
 * Admin-only.
 */
export async function listAuditLogs(req, res, next) {
  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        actor: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return res.json(logs);
  } catch (err) {
    next(err);
  }
}

