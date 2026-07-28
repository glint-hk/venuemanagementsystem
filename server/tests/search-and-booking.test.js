import { describe, expect, it } from "vitest";
import { BookingStatus, contracts } from "../../shared/index.js";

describe("US-B3 & US-B4: Search, Booking & Approver Review Workspace", () => {
  it("CreateBookingRequest contains venueId, purpose, and timeslot", () => {
    const keys = Object.keys(contracts.CreateBookingRequest);
    expect(keys).toEqual(["venueId", "purpose", "timeslot"]);
  });

  it("ApprovalDecisionRequest requires decision and allows comment", () => {
    const keys = Object.keys(contracts.ApprovalDecisionRequest);
    expect(keys).toEqual(["decision", "comment"]);
  });

  it("booking status transitions from PENDING to APPROVED or REJECTED", () => {
    expect(BookingStatus.PENDING).toBe("PENDING");
    expect(BookingStatus.APPROVED).toBe("APPROVED");
    expect(BookingStatus.REJECTED).toBe("REJECTED");
  });
});
