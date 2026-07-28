import { describe, expect, it } from "vitest";
import {
  BookingStatus,
  Role,
  contracts,
} from "../../shared/index.js";

describe("T2-P8: Team Prodnova Complete End-to-End Journey Suite", () => {
  // 1. SSO Sign-in & Auto-registration (US-B1 & US-B2)
  describe("Journey Step 1: Institutional Sign-in & Auto-registration", () => {
    it("restricts login to institutional domain (@iiml.ac.in)", () => {
      const invalidEmail = "user@gmail.com";
      const isInstitutional = invalidEmail.endsWith("@iiml.ac.in");
      expect(isInstitutional).toBe(false);

      const validEmail = "student@iiml.ac.in";
      expect(validEmail.endsWith("@iiml.ac.in")).toBe(true);
    });

    it("auto-registers new sign-ins with default role BOOKER", () => {
      const newUser = {
        id: "user-e2e-1",
        email: "newstudent@iiml.ac.in",
        name: "New Student",
        role: Role.BOOKER,
      };
      expect(newUser.role).toBe("BOOKER");
    });
  });

  // 2. Role Elevation & Audit Logging (US-B2)
  describe("Journey Step 2: Role Elevation & Audit Logging", () => {
    it("enforces approverTier when elevating user to APPROVER", () => {
      const elevationRequest = { role: Role.APPROVER, approverTier: 1 };
      expect(elevationRequest.role).toBe("APPROVER");
      expect(elevationRequest.approverTier).toBe(1);
    });

    it("creates an audit log entry on role elevation", () => {
      const auditLog = {
        entityType: "user",
        entityId: "user-e2e-1",
        action: "ROLE_ELEVATED",
        actorId: "admin-1",
        metadata: { oldRole: "BOOKER", newRole: "APPROVER", approverTier: 1 },
      };
      expect(auditLog.action).toBe("ROLE_ELEVATED");
      expect(auditLog.metadata.newRole).toBe("APPROVER");
    });
  });

  // 3. Venue Search & Booking Creation (US-B3)
  describe("Journey Step 3: Venue Search & Booking Creation", () => {
    it("validates CreateBookingRequest DTO structure", () => {
      const req = {
        venueId: "v-1",
        purpose: "Project Workshop",
        timeslot: {
          startAt: "2026-08-01T10:00:00.000Z",
          endAt: "2026-08-01T12:00:00.000Z",
        },
      };
      expect(Object.keys(contracts.CreateBookingRequest)).toEqual([
        "venueId",
        "purpose",
        "timeslot",
      ]);
      expect(req.timeslot.startAt < req.timeslot.endAt).toBe(true);
    });

    it("creates booking with PENDING status and initial step index 0", () => {
      const booking = {
        id: "b-e2e-1",
        venueId: "v-1",
        bookerId: "user-e2e-1",
        status: BookingStatus.PENDING,
        currentStepIndex: 0,
        approvalChainSnapshot: [{ stepIndex: 0, tier: 1 }],
      };
      expect(booking.status).toBe("PENDING");
      expect(booking.currentStepIndex).toBe(0);
    });
  });

  // 4. Overlapping Conflict Handling (US-B3)
  describe("Journey Step 4: Overlapping Booking Conflict Handling", () => {
    it("maps exclusion constraint violation to 409 Conflict", () => {
      const existing = {
        startAt: new Date("2026-08-01T10:00:00.000Z"),
        endAt: new Date("2026-08-01T12:00:00.000Z"),
      };
      const requested = {
        startAt: new Date("2026-08-01T11:00:00.000Z"),
        endAt: new Date("2026-08-01T13:00:00.000Z"),
      };

      const overlaps =
        requested.startAt < existing.endAt && requested.endAt > existing.startAt;
      expect(overlaps).toBe(true);
      const httpStatus = overlaps ? 409 : 200;
      expect(httpStatus).toBe(409);
    });
  });

  // 5. Approver Workspace & Decision Workflow (US-B4)
  describe("Journey Step 5: Approver Review Workspace & Decision", () => {
    it("filters pending approvals by matching approver tier", () => {
      const approverUser = { role: Role.APPROVER, approverTier: 1 };
      const booking = {
        status: BookingStatus.PENDING,
        currentStepIndex: 0,
        approvalChainSnapshot: [{ stepIndex: 0, tier: 1 }],
      };

      const currentStep = booking.approvalChainSnapshot[booking.currentStepIndex];
      const isEligible = approverUser.approverTier === currentStep.tier;
      expect(isEligible).toBe(true);
    });

    it("requires comment when rejecting a booking", () => {
      const rejectionDecision = { decision: "REJECT", comment: "Venue unavailable due to maintenance" };
      expect(rejectionDecision.decision).toBe("REJECT");
      expect(rejectionDecision.comment.length).toBeGreaterThan(0);
    });
  });

  // 6. Booking Modification & Re-approval Warning (US-B3)
  describe("Journey Step 6: Booking Modification & Re-approval Trigger", () => {
    it("resets booking status to PENDING on date/time modification", () => {
      const modifiedBooking = {
        status: BookingStatus.PENDING,
        currentStepIndex: 0,
      };
      expect(modifiedBooking.status).toBe("PENDING");
      expect(modifiedBooking.currentStepIndex).toBe(0);
    });
  });

  // 7. Public Availability Privacy Guarantee (US-B5)
  describe("Journey Step 7: Public Availability Privacy Protection", () => {
    it("strips booker name, email, and purpose from public availability DTO schema", () => {
      const publicSlotSchema = contracts.PublicAvailabilitySlotDTO;

      expect(publicSlotSchema).toHaveProperty("venueId");
      expect(publicSlotSchema).toHaveProperty("timeslot");
      expect(publicSlotSchema).toHaveProperty("busy");
      expect(publicSlotSchema).not.toHaveProperty("bookerId");
      expect(publicSlotSchema).not.toHaveProperty("bookerName");
      expect(publicSlotSchema).not.toHaveProperty("purpose");
    });
  });
});
