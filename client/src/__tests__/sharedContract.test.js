// Phase-0 smoke test: proves the client can consume the frozen contract from
// shared/ and that the CI pipeline runs client-side tests too.

import { describe, expect, it } from "vitest";
import { BookingStatus, Role } from "../../../shared/index.js";

describe("shared contract (client-side import)", () => {
  it("resolves the Role enum", () => {
    expect(Role.BOOKER).toBe("BOOKER");
    expect(Role.APPROVER).toBe("APPROVER");
    expect(Role.ADMIN).toBe("ADMIN");
  });

  it("resolves the BookingStatus enum", () => {
    expect(BookingStatus.DRAFT).toBe("DRAFT");
    expect(BookingStatus.PENDING).toBe("PENDING");
  });
});
