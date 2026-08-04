// Auth controller — handles sign-in, token refresh, and session info.
// Team 2 (Prodnova) owned.
//
// US-B1: Institutional SSO & session
// US-B2: Auto-registration & role elevation
//
// For local development without Google OAuth, a dev-login endpoint is provided
// that accepts email + name directly. In production, the Google OAuth flow
// verifies the institutional domain server-side.
import prisma from "../lib/prisma.js";
import { signAccessToken, signRefreshToken, verifyToken } from "../lib/jwt.js";
import jwt from "jsonwebtoken";
import { Role } from "shared";

// The institutional email domain — verified server-side, never trusted
// from a client-side hint.
const INSTITUTIONAL_DOMAIN = process.env.INSTITUTIONAL_DOMAIN || "iiml.ac.in";

/**
 * POST /auth/login — Dev-mode login (no OAuth).
 * Accepts { email, name } and issues tokens.
 * In production, this would be replaced by the Google OAuth callback.
 *
 * US-B1 rules enforced:
 * - Institutional domain verified server-side
 * - Auto-registers with BOOKER role on first sign-in (US-B2)
 * - Existing users keep their current role (no reset)
 */
export async function login(req, res, next) {
  try {
    const { email, name } = req.body;
    if (!email || !name) {
      return res.status(400).json({ error: "email and name are required" });
    }

    // Server-side domain verification — AGENTS.md rule 4
    const domain = email.split("@")[1];
    if (domain !== INSTITUTIONAL_DOMAIN) {
      return res.status(403).json({
        error: "Only institutional accounts are allowed",
      });
    }

    // Find or create user — US-B2: first sign-in creates BOOKER,
    // subsequent sign-ins preserve existing role.
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          role: Role.BOOKER, // Always BOOKER — no parameter can override
        },
      });
    }

    const accessToken = signAccessToken(user.id);
    const refreshToken = signRefreshToken(user.id);

    return res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        approverTier: user.approverTier,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/refresh — rotates the refresh token.
 * US-B1: using the refresh token rotates it rather than silently extending.
 */
export async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: "refreshToken is required" });
    }

    let payload;
    try {
      payload = verifyToken(refreshToken);
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ error: "Refresh token expired", code: "REFRESH_EXPIRED" });
      }
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    if (payload.type !== "refresh") {
      return res.status(401).json({ error: "Invalid token type" });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Rotate: issue new pair
    const newAccessToken = signAccessToken(user.id);
    const newRefreshToken = signRefreshToken(user.id);

    return res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        approverTier: user.approverTier,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /auth/me — returns the current user from the session.
 * Requires authenticate middleware.
 */
export async function me(req, res) {
  const user = req.user;
  return res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    approverTier: user.approverTier,
  });
}
