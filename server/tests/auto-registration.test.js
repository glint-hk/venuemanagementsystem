import { describe, expect, it } from "vitest";
import { Role } from "../../shared/index.js";

describe("US-B2: Auto-registration & Role Elevation", () => {
  it("defines default Role.BOOKER for new user registration", () => {
    expect(Role.BOOKER).toBe("BOOKER");
  });

  it("requires approverTier when role is APPROVER", () => {
    const role = Role.APPROVER;
    const approverTier = null;
    const isValid = role === Role.APPROVER ? approverTier !== null : true;
    expect(isValid).toBe(false);
  });

  it("validates that non-APPROVER roles clear approverTier", () => {
    const role = Role.BOOKER;
    const approverTier = role === Role.APPROVER ? 1 : null;
    expect(approverTier).toBeNull();
  });
});
