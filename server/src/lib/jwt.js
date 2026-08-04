// JWT utility — signs and verifies access/refresh tokens.
// Never trust a role claim from a client-presented token (AGENTS.md rule 4).
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const ACCESS_EXPIRES = "15m";
const REFRESH_EXPIRES = "7d";

/**
 * Sign an access token. Contains only the user id — role is always
 * re-read from the database on every request (AGENTS.md rule 4).
 */
export function signAccessToken(userId) {
  return jwt.sign({ sub: userId, type: "access" }, SECRET, {
    expiresIn: ACCESS_EXPIRES,
  });
}

/**
 * Sign a refresh token. Same minimal payload — role is never embedded.
 */
export function signRefreshToken(userId) {
  return jwt.sign({ sub: userId, type: "refresh" }, SECRET, {
    expiresIn: REFRESH_EXPIRES,
  });
}

/**
 * Verify a token. Returns the decoded payload or throws.
 * Throws jwt.TokenExpiredError for expired tokens (distinct from invalid).
 */
export function verifyToken(token) {
  return jwt.verify(token, SECRET);
}
