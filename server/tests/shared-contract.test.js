// Phase-0 smoke test: proves the CI pipeline actually runs tests, and that
// the frozen contract in shared/ is importable and internally consistent.
// Feature test suites (T1-P7, T2-P8, T3-P8) land under this same tests/
// directory as each team's work ships.

import { describe, expect, it } from "vitest";
import { BookingStatus, entities, terminalStates, transitions } from "../../shared/index.js";

describe("shared contract", () => {
  it("exposes every core entity", () => {
    const expected = [
      "users",
      "roles",
      "venues",
      "venue_blocks",
      "approval_chains",
      "bookings",
      "approvals",
      "delegations",
      "audit_log",
      "notification_outbox",
    ];
    for (const name of expected) {
      expect(entities).toHaveProperty(name);
    }
  });

  it("has no outgoing transition from a terminal state", () => {
    for (const state of terminalStates) {
      const outgoing = transitions.filter((t) => t.from === state);
      expect(outgoing).toHaveLength(0);
    }
  });

  it("every transition references a real BookingStatus value", () => {
    const validStatuses = Object.values(BookingStatus);
    for (const t of transitions) {
      expect(validStatuses).toContain(t.from);
      expect(validStatuses).toContain(t.to);
    }
  });
});
