import { Router } from "express";
import prisma from "../lib/prisma.js";
import { Role } from "../../../shared/index.js";
import { authenticate, requireAdmin } from "../middleware/authMiddleware.js";

const router = Router();
const ALLOWED_DOMAIN = "iiml.ac.in";

/**
 * POST /auth/login
 * Institutional SSO login + auto-registration (US-B1 / US-B2).
 */
router.post("/login", async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email || typeof email !== "string") {
      return res
        .status(400)
        .json({ error: "Valid institutional email is required." });
    }

    const domain = email.split("@")[1];
    if (domain !== ALLOWED_DOMAIN) {
      return res.status(403).json({
        error: `Access denied. Only @${ALLOWED_DOMAIN} email addresses are permitted.`,
      });
    }

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: name || email.split("@")[0],
          role: Role.BOOKER,
        },
      });
    }

    return res.status(200).json({
      message: "Authentication successful",
      token: user.id,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        approverTier: user.approverTier,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res
      .status(500)
      .json({ error: "Authentication failed due to a server error." });
  }
});

/** GET /auth/me — current session user. */
router.get("/me", authenticate, (req, res) => {
  return res.status(200).json({ user: req.user });
});

/**
 * PUT /auth/roles/elevate
 * Admin-only role elevation (RoleElevationRequest contract).
 */
router.put("/roles/elevate", authenticate, requireAdmin, async (req, res) => {
  try {
    const { userId, role, approverTier } = req.body;

    const validRoles = Object.values(Role);
    if (!userId || !validRoles.includes(role)) {
      return res.status(400).json({
        error: `Invalid parameters. Allowed roles: ${validRoles.join(", ")}`,
      });
    }

    if (role === Role.APPROVER && (approverTier == null || approverTier < 1)) {
      return res.status(400).json({
        error: "approverTier is required when elevating to APPROVER.",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const targetUser = await tx.user.findUnique({ where: { id: userId } });
      if (!targetUser) {
        throw Object.assign(new Error("TARGET_USER_NOT_FOUND"), {
          status: 404,
        });
      }

      const previousRole = targetUser.role;
      const previousTier = targetUser.approverTier;

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          role,
          approverTier: role === Role.APPROVER ? approverTier : null,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: req.user.id,
          action: "ROLE_ELEVATED",
          entityType: "user",
          entityId: userId,
          metadata: {
            previousRole,
            previousTier,
            newRole: role,
            newTier: role === Role.APPROVER ? approverTier : null,
            targetEmail: targetUser.email,
          },
        },
      });

      return updatedUser;
    });

    return res.status(200).json({
      message: "User role updated successfully.",
      user: {
        id: result.id,
        email: result.email,
        name: result.name,
        role: result.role,
        approverTier: result.approverTier,
      },
    });
  } catch (error) {
    if (error.message === "TARGET_USER_NOT_FOUND") {
      return res.status(404).json({ error: "Target user not found." });
    }
    console.error("Role Elevation Error:", error);
    return res.status(500).json({ error: "Failed to update user role." });
  }
});

export default router;
