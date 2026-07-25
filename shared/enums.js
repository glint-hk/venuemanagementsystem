// Enums shared by client and server. Runtime values (frozen objects) so both
// sides import the same source of truth instead of duplicating string literals.

/** @enum {string} */
export const Role = Object.freeze({
  BOOKER: "BOOKER",
  APPROVER: "APPROVER",
  ADMIN: "ADMIN",
});

/** @enum {string} */
export const BookingStatus = Object.freeze({
  DRAFT: "DRAFT",
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  MODIFIED: "MODIFIED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
});

/** @enum {string} */
export const ApprovalDecision = Object.freeze({
  APPROVE: "APPROVE",
  REJECT: "REJECT",
  DELEGATE: "DELEGATE",
});

/** @enum {string} */
export const NotificationStatus = Object.freeze({
  PENDING: "PENDING",
  SENT: "SENT",
  FAILED: "FAILED",
});
