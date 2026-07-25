// Entity shapes for the venue booking system — declarative only, no logic,
// no database calls. Each entry documents field name -> type/constraint.
// This is the reference both client and server read to avoid inventing shapes.
//
// Every model in server/prisma/schema.prisma must match an entity here. If a
// story needs a field that isn't listed, that's an Architect-review
// conversation (see README.md "Changing the schema"), not an ad hoc addition.

/**
 * @typedef {Object} FieldMap
 * @description keys are field names, values are human-readable type/constraint strings
 */

export const entities = Object.freeze({
  users: {
    id: "string (uuid, pk)",
    email: "string (unique, institutional domain — verified server-side at sign-in)",
    name: "string",
    role: "Role enum",
    approverTier: "number | null — set only when role is APPROVER",
    createdAt: "datetime",
  },

  // Not a separate table by itself — documents the Role enum's meaning.
  // An Approver additionally carries a tier (see users.approverTier).
  roles: {
    value: "Role enum (BOOKER | APPROVER | ADMIN)",
    note: "Public is not a stored role — anonymous, unauthenticated access only",
  },

  venues: {
    id: "string (uuid, pk)",
    name: "string",
    type: "string — venue type/category; determines which approval_chains row applies",
    location: "string",
    capacity: "number",
    attributes: "string[] — e.g. projector, sound system",
    approvalChainId: "string (fk -> approval_chains.id)",
    createdAt: "datetime",
  },

  venue_blocks: {
    id: "string (uuid, pk)",
    venueId: "string (fk -> venues.id)",
    startAt: "datetime",
    endAt: "datetime",
    recurring: "boolean — recurring blackout vs one-off",
    reason: "string",
    createdBy: "string (fk -> users.id, must be ADMIN)",
    createdAt: "datetime",
  },

  approval_chains: {
    id: "string (uuid, pk)",
    venueType: "string — matches venues.type",
    version: "number — incremented on every edit; bookings snapshot a version, never live config",
    steps: "Array<{ tier: number, role: 'APPROVER', escalationWindowHours: number }> — ordered lowest tier first",
    updatedAt: "datetime",
  },

  bookings: {
    id: "string (uuid, pk)",
    venueId: "string (fk -> venues.id)",
    bookerId: "string (fk -> users.id)",
    purpose: "string — event purpose; NEVER exposed on the public availability board",
    timeslot: "tstzrange — [startAt, endAt)",
    status: "BookingStatus enum",
    approvalChainSnapshot: "Array<{ tier: number, role: 'APPROVER', escalationWindowHours: number }> — copied from approval_chains at creation/re-approval; edits to live config never touch this",
    currentStepIndex: "number — index into approvalChainSnapshot of the lowest undecided step",
    createdAt: "datetime",
    updatedAt: "datetime",
  },

  approvals: {
    id: "string (uuid, pk)",
    bookingId: "string (fk -> bookings.id)",
    stepIndex: "number — which step in the booking's snapshot this decision resolves",
    approverId: "string (fk -> users.id) — the effective actor (may be a delegate, resolved at decision time)",
    decision: "ApprovalDecision enum",
    comment: "string | null — required when decision is REJECT",
    decidedAt: "datetime",
  },

  delegations: {
    id: "string (uuid, pk)",
    delegatorId: "string (fk -> users.id) — the approver delegating",
    delegateId: "string (fk -> users.id) — the substitute",
    startAt: "datetime",
    endAt: "datetime",
    createdAt: "datetime",
  },

  audit_log: {
    id: "string (uuid, pk)",
    entityType: "string — e.g. 'booking' | 'approval' | 'approval_chain' | 'user' | 'venue'",
    entityId: "string",
    action: "string — short verb phrase, e.g. 'BOOKING_CREATED'",
    actorId: "string | null (fk -> users.id) — null for system/cron actions",
    metadata: "json — details of what changed",
    createdAt: "datetime — append-only, no updatedAt: UPDATE/DELETE are revoked at the database level",
  },

  notification_outbox: {
    id: "string (uuid, pk)",
    bookingId: "string | null (fk -> bookings.id)",
    recipientId: "string (fk -> users.id)",
    templateKey: "string — selects the email template (server/src/lib/templates/)",
    payload: "json — data for template rendering",
    status: "NotificationStatus enum",
    attempts: "number — retry count, incremented by the delivery worker",
    createdAt: "datetime — written in the SAME transaction as the state change it notifies about",
    sentAt: "datetime | null",
  },
});
