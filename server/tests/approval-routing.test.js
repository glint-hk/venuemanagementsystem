// US-C2 — sequential approval routing. Tests call the controller function
// directly (mock req/res) against a real Postgres test database, rather than
// going through supertest/express — supertest is imported by Team 1's
// booking-lifecycle.test.js but isn't declared in any package.json on any
// branch, so it can't be relied on here.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import prisma from "../src/lib/prisma.js";
import { approveBooking } from "../src/controllers/approvalController.js";

function mockReq({ user, bookingId, body = {} }) {
  return { user, params: { bookingId }, body };
}

function mockRes() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

async function callApprove({ user, bookingId, decision, comment }) {
  const req = mockReq({ user, bookingId, body: { decision, comment } });
  const res = mockRes();
  let thrown;
  await approveBooking(req, res, (err) => {
    thrown = err;
  });
  if (thrown) throw thrown; // approveBooking only calls next() on a genuine bug
  return res;
}

describe("approval routing (US-C2)", () => {
  let venue;
  let booker, approverTier1, approverTier2, admin;

  const TWO_TIER_CHAIN = [
    { tier: 1, role: "APPROVER", escalationWindowHours: 48 },
    { tier: 2, role: "APPROVER", escalationWindowHours: 48 },
  ];
  const ONE_TIER_CHAIN = [{ tier: 1, role: "APPROVER", escalationWindowHours: 48 }];

  beforeAll(async () => {
    const chain = await prisma.approvalChain.create({
      data: { venueType: "TEST_ROUTING", version: 1, steps: TWO_TIER_CHAIN },
    });

    venue = await prisma.venue.create({
      data: {
        name: "Test Routing Venue",
        type: "TEST_ROUTING",
        location: "Test Block",
        capacity: 10,
        attributes: [],
        approvalChainId: chain.id,
      },
    });

    booker = await prisma.user.upsert({
      where: { email: "routing-test-booker@iiml.ac.in" },
      update: {},
      create: { email: "routing-test-booker@iiml.ac.in", name: "Test Booker", role: "BOOKER" },
    });
    approverTier1 = await prisma.user.upsert({
      where: { email: "routing-test-approver1@iiml.ac.in" },
      update: {},
      create: {
        email: "routing-test-approver1@iiml.ac.in",
        name: "Test Approver Tier 1",
        role: "APPROVER",
        approverTier: 1,
      },
    });
    approverTier2 = await prisma.user.upsert({
      where: { email: "routing-test-approver2@iiml.ac.in" },
      update: {},
      create: {
        email: "routing-test-approver2@iiml.ac.in",
        name: "Test Approver Tier 2",
        role: "APPROVER",
        approverTier: 2,
      },
    });
    admin = await prisma.user.upsert({
      where: { email: "routing-test-admin@iiml.ac.in" },
      update: {},
      create: { email: "routing-test-admin@iiml.ac.in", name: "Test Admin", role: "ADMIN" },
    });
  });

  afterAll(async () => {
    await prisma.notificationOutbox.deleteMany({ where: { booking: { venueId: venue.id } } });
    await prisma.auditLog.deleteMany({ where: { entityType: "booking" } });
    await prisma.approval.deleteMany({ where: { booking: { venueId: venue.id } } });
    await prisma.booking.deleteMany({ where: { venueId: venue.id } });
    await prisma.venue.delete({ where: { id: venue.id } });
    await prisma.approvalChain.deleteMany({ where: { venueType: "TEST_ROUTING" } });
    await prisma.user.deleteMany({
      where: { email: { in: [booker.email, approverTier1.email, approverTier2.email, admin.email] } },
    });
    await prisma.$disconnect();
  });

  // Each test gets its own fresh booking, created directly (bypassing
  // createBooking) since this suite tests decision-time behavior only.
  // A distinct hourOffset per call gives each test its own timeslot -- these
  // tests don't clean up their booking between cases (only afterAll does),
  // so reusing one hardcoded timeslot would trip the exclusion constraint
  // against the PREVIOUS test's still-PENDING/APPROVED booking.
  async function seedBooking(chainSnapshot, hourOffset) {
    const startAt = new Date(Date.UTC(2027, 0, 1, hourOffset, 0, 0));
    const endAt = new Date(Date.UTC(2027, 0, 1, hourOffset + 1, 0, 0));
    return prisma.booking.create({
      data: {
        venueId: venue.id,
        bookerId: booker.id,
        purpose: "Approval routing test",
        startAt,
        endAt,
        status: "PENDING",
        approvalChainSnapshot: chainSnapshot,
        currentStepIndex: 0,
      },
    });
  }

  it("refuses a decision from anyone but the lowest undecided step's approver", async () => {
    const booking = await seedBooking(TWO_TIER_CHAIN, 1);

    // Tier-2 approver tries to act while the current step is tier 1.
    const res = await callApprove({ user: approverTier2, bookingId: booking.id, decision: "APPROVE" });
    expect(res.statusCode).toBe(403);

    // A booker (not an approver at all) tries to act.
    const res2 = await callApprove({ user: booker, bookingId: booking.id, decision: "APPROVE" });
    expect(res2.statusCode).toBe(403);

    const unchanged = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(unchanged.status).toBe("PENDING");
    expect(unchanged.currentStepIndex).toBe(0);
  });

  it("approves on the last step and marks the booking APPROVED", async () => {
    const booking = await seedBooking(ONE_TIER_CHAIN, 2);

    const res = await callApprove({ user: approverTier1, bookingId: booking.id, decision: "APPROVE" });
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("APPROVED");

    const updated = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(updated.status).toBe("APPROVED");

    const notification = await prisma.notificationOutbox.findFirst({
      where: { bookingId: booking.id, templateKey: "BOOKING_APPROVED" },
    });
    expect(notification).not.toBeNull();
    expect(notification.recipientId).toBe(booker.id);
  });

  it("approves on a non-last step, advances currentStepIndex, and notifies the next approver", async () => {
    const booking = await seedBooking(TWO_TIER_CHAIN, 3);

    const res = await callApprove({ user: approverTier1, bookingId: booking.id, decision: "APPROVE" });
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("PENDING");
    expect(res.body.currentStepIndex).toBe(1);

    const notification = await prisma.notificationOutbox.findFirst({
      where: { bookingId: booking.id, templateKey: "APPROVAL_REQUESTED" },
    });
    expect(notification).not.toBeNull();
    expect(notification.recipientId).toBe(approverTier2.id);
  });

  it("rejects at any step, requires a comment, and marks the booking REJECTED", async () => {
    const booking = await seedBooking(TWO_TIER_CHAIN, 4);

    const missingComment = await callApprove({ user: approverTier1, bookingId: booking.id, decision: "REJECT" });
    expect(missingComment.statusCode).toBe(400);

    const res = await callApprove({
      user: approverTier1,
      bookingId: booking.id,
      decision: "REJECT",
      comment: "Venue unavailable for setup that day",
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("REJECTED");

    const notification = await prisma.notificationOutbox.findFirst({
      where: { bookingId: booking.id, templateKey: "BOOKING_REJECTED" },
    });
    expect(notification).not.toBeNull();
    expect(notification.recipientId).toBe(booker.id);
  });

  it("refuses a second decision on an already-decided step", async () => {
    const booking = await seedBooking(TWO_TIER_CHAIN, 5);

    // Genuine concurrency: two simultaneous APPROVE calls for the same
    // approver on the same still-current step. A SEQUENTIAL second call
    // would not exercise this path -- by the time it runs, the first call
    // has already advanced currentStepIndex past tier 1, so the second call
    // would get 403 ("not the approver for the current step"), not 409. Only
    // a real race lands both requests on the same current step at once,
    // which is what the unique constraint on (bookingId, stepIndex) guards
    // against (server/prisma/migrations/*_approval_step_uniqueness).
    const [first, second] = await Promise.all([
      callApprove({ user: approverTier1, bookingId: booking.id, decision: "APPROVE" }),
      callApprove({ user: approverTier1, bookingId: booking.id, decision: "APPROVE" }),
    ]);

    const statusCodes = [first.statusCode, second.statusCode].sort();
    expect(statusCodes).toEqual([200, 409]);

    const decisions = await prisma.approval.findMany({
      where: { bookingId: booking.id, stepIndex: 0 },
    });
    expect(decisions).toHaveLength(1);
  });

  it("writes exactly one audit_log row per decision, in the same transaction as the status change", async () => {
    const booking = await seedBooking(ONE_TIER_CHAIN, 6);

    const before = await prisma.auditLog.count({ where: { entityType: "booking", entityId: booking.id } });
    expect(before).toBe(0);

    await callApprove({ user: approverTier1, bookingId: booking.id, decision: "APPROVE" });

    const after = await prisma.auditLog.findMany({ where: { entityType: "booking", entityId: booking.id } });
    expect(after).toHaveLength(1);
    expect(after[0].action).toBe("BOOKING_STEP_APPROVED");
  });
});
