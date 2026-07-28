import { describe, expect, it } from "vitest";
import { contracts } from "../../shared/index.js";

describe("US-B5: Public Availability Board Privacy Guarantee", () => {
  it("PublicAvailabilitySlotDTO contains only venueId, timeslot, and busy fields", () => {
    const keys = Object.keys(contracts.PublicAvailabilitySlotDTO);
    expect(keys).toEqual(["venueId", "timeslot", "busy"]);
    expect(keys).not.toContain("booker");
    expect(keys).not.toContain("purpose");
    expect(keys).not.toContain("bookerId");
  });
});
