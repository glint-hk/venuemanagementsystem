// API request/response shapes — declarative only. These are the DTOs client
// and server both import so their idea of "what a booking looks like over
// the wire" cannot drift. Scoped to what the entities + roles already imply;
// do not add a shape here for a story that doesn't exist yet.

export const contracts = Object.freeze({
  CreateBookingRequest: {
    venueId: "string",
    purpose: "string",
    timeslot: "{ startAt: datetime, endAt: datetime }",
  },

  ModifyBookingRequest: {
    venueId: "string | undefined — present only if the venue is changing",
    purpose: "string | undefined",
    timeslot: "{ startAt: datetime, endAt: datetime } | undefined",
  },

  // Full booking detail — returned to the booker, the current approver, and
  // Admin. NEVER returned by the anonymous public endpoint.
  BookingDTO: {
    id: "string",
    venue: "{ id: string, name: string, location: string }",
    booker: "{ id: string, name: string }",
    purpose: "string",
    timeslot: "{ startAt: datetime, endAt: datetime }",
    status: "BookingStatus enum",
    currentStepIndex: "number",
  },

  // The ONLY shape the anonymous public availability endpoint may return.
  // No booker identity, no purpose, no approval detail — see AGENTS.md /
  // README.md public-board privacy guarantee.
  PublicAvailabilitySlotDTO: {
    venueId: "string",
    timeslot: "{ startAt: datetime, endAt: datetime }",
    busy: "boolean",
  },

  ApprovalDecisionRequest: {
    decision: "ApprovalDecision enum ('APPROVE' | 'REJECT')",
    comment: "string | null — required when decision is 'REJECT'",
  },

  ApprovalChainConfigRequest: {
    venueType: "string",
    steps: "Array<{ tier: number, role: 'APPROVER', escalationWindowHours: number }>",
  },

  DelegationRequest: {
    delegateId: "string",
    startAt: "datetime",
    endAt: "datetime",
  },

  RoleElevationRequest: {
    userId: "string",
    role: "Role enum",
    approverTier: "number | null — required when role is 'APPROVER'",
  },
});
