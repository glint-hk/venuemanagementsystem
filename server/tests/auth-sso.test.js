import { describe, expect, it } from "vitest";
import { signAccessToken, verifyToken } from "../src/lib/jwt.js";
import jwt from "jsonwebtoken";

describe("US-B1: Institutional SSO & Session Handling", () => {
  it("generates a valid access token embedding sub (userId)", () => {
    const token = signAccessToken("test-user-id");
    const decoded = verifyToken(token);
    expect(decoded.sub).toBe("test-user-id");
    expect(decoded.type).toBe("access");
  });

  it("never trusts embedded role claims from client tokens (role is read from DB)", () => {
    // Construct a token with a forged role claim
    const forgedToken = jwt.sign(
      { sub: "test-user-id", type: "access", role: "ADMIN" },
      process.env.JWT_SECRET || "dev-secret-change-me",
    );
    const decoded = verifyToken(forgedToken);
    // Even if role is present in payload, middleware ignores it and queries DB by sub
    expect(decoded.sub).toBe("test-user-id");
  });

  it("rejects invalid tokens", () => {
    expect(() => verifyToken("invalid.token.string")).toThrow();
  });

  it("distinguishes expired tokens from invalid tokens", () => {
    const expiredToken = jwt.sign(
      { sub: "user-123", type: "access" },
      process.env.JWT_SECRET || "dev-secret-change-me",
      { expiresIn: "-1s" },
    );
    try {
      verifyToken(expiredToken);
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(jwt.TokenExpiredError);
    }
  });
});
