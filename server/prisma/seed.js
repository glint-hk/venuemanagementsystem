// Prisma seed script — populates approval chains, venues, users, and one
// demo PENDING booking per venue type, per specs/approval-chains.md.
//
// Chain order and venue-type mapping are stakeholder-sourced (see
// specs/approval-chains.md). Venue names for Estate-managed spaces are the
// real names cited in that spec; location/capacity/attributes are NOT
// sourced from specs/venue-registry.md (still all TODO there) — demo
// placeholder values only, not authoritative.
//
// Note: approver identity is GLOBAL per tier, not scoped to a chain — the
// approval_chains.steps shape has no field tying a tier to a specific
// chain, so the same tier-1 user acts on Estate, Hostel, AND Classroom
// tier-1 steps here. That's a limitation of the current contract shape,
// not an oversight in this file.
import { PrismaClient, Role, BookingStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ── Approval chains (specs/approval-chains.md) ──
  const estateChain = await prisma.approvalChain.create({
    data: {
      venueType: "ESTATE",
      version: 1,
      steps: [
        { tier: 1, role: "APPROVER", escalationWindowHours: 48 }, // Student Affairs Office
        { tier: 2, role: "APPROVER", escalationWindowHours: 48 }, // Student Affairs Chair
        { tier: 3, role: "APPROVER", escalationWindowHours: 48 }, // Dean (Infrastructure)
        { tier: 4, role: "APPROVER", escalationWindowHours: 48 }, // Director
      ],
    },
  });

  const hostelChain = await prisma.approvalChain.create({
    data: {
      venueType: "HOSTEL",
      version: 1,
      steps: [
        { tier: 1, role: "APPROVER", escalationWindowHours: 48 }, // Infrastructure Secretary
      ],
    },
  });

  const classroomChain = await prisma.approvalChain.create({
    data: {
      venueType: "CLASSROOM",
      version: 1,
      steps: [
        { tier: 1, role: "APPROVER", escalationWindowHours: 48 }, // PGP Office
      ],
    },
  });

  // ── Venues ──
  // Estate names are the real ones cited in specs/approval-chains.md.
  // Location/capacity/attributes are demo placeholders — venue-registry.md
  // is still all TODO, so none of this is stakeholder-confirmed.
  const aryabhatta = await prisma.venue.create({
    data: {
      name: "Aryabhatta",
      type: "ESTATE",
      location: "Main Campus",
      capacity: 500,
      attributes: ["stage", "sound system", "outdoor lighting"],
      approvalChainId: estateChain.id,
    },
  });
  const gnbCircle = await prisma.venue.create({
    data: {
      name: "GNB Circle",
      type: "ESTATE",
      location: "Main Campus",
      capacity: 300,
      attributes: ["sound system", "outdoor lighting"],
      approvalChainId: estateChain.id,
    },
  });
  await prisma.venue.create({
    data: {
      name: "MV Circle",
      type: "ESTATE",
      location: "Main Campus",
      capacity: 300,
      attributes: ["sound system"],
      approvalChainId: estateChain.id,
    },
  });
  await prisma.venue.create({
    data: {
      name: "Samanjasya",
      type: "ESTATE",
      location: "Main Campus",
      capacity: 1000,
      attributes: ["stage", "sound system", "outdoor lighting"],
      approvalChainId: estateChain.id,
    },
  });
  await prisma.venue.create({
    data: {
      name: "Utsav",
      type: "ESTATE",
      location: "Main Campus",
      capacity: 800,
      attributes: ["stage", "sound system"],
      approvalChainId: estateChain.id,
    },
  });

  const hostelCommonRoom = await prisma.venue.create({
    data: {
      name: "Hostel Common Room (demo)",
      type: "HOSTEL",
      location: "Hostel Block",
      capacity: 40,
      attributes: ["television", "sofa seating"],
      approvalChainId: hostelChain.id,
    },
  });

  const classroom = await prisma.venue.create({
    data: {
      name: "Classroom C-101 (demo)",
      type: "CLASSROOM",
      location: "Academic Block",
      capacity: 60,
      attributes: ["projector", "whiteboard"],
      approvalChainId: classroomChain.id,
    },
  });

  // ── Users ──
  // One global approver per tier — see the contract-gap note at the top
  // of this file.
  const approver1 = await prisma.user.upsert({
    where: { email: "approver1@iiml.ac.in" },
    update: {},
    create: { email: "approver1@iiml.ac.in", name: "Tier 1 Approver", role: Role.APPROVER, approverTier: 1 },
  });
  await prisma.user.upsert({
    where: { email: "approver2@iiml.ac.in" },
    update: {},
    create: { email: "approver2@iiml.ac.in", name: "Tier 2 Approver", role: Role.APPROVER, approverTier: 2 },
  });
  await prisma.user.upsert({
    where: { email: "approver3@iiml.ac.in" },
    update: {},
    create: { email: "approver3@iiml.ac.in", name: "Tier 3 Approver", role: Role.APPROVER, approverTier: 3 },
  });
  await prisma.user.upsert({
    where: { email: "approver4@iiml.ac.in" },
    update: {},
    create: { email: "approver4@iiml.ac.in", name: "Tier 4 Approver", role: Role.APPROVER, approverTier: 4 },
  });
  await prisma.user.upsert({
    where: { email: "admin@iiml.ac.in" },
    update: {},
    create: { email: "admin@iiml.ac.in", name: "Admin User", role: Role.ADMIN },
  });
  const booker = await prisma.user.upsert({
    where: { email: "booker@iiml.ac.in" },
    update: {},
    create: { email: "booker@iiml.ac.in", name: "Demo Booker", role: Role.BOOKER },
  });

  // ── One demo PENDING booking per chain, sitting at tier 1 ──
  // Mirrors what createBooking does (audit_log + notification_outbox to
  // the tier-1 approver), written directly since this script runs outside
  // the API.
  async function seedPendingBooking({ venue, chain, purpose, startAt, endAt }) {
    const booking = await prisma.booking.create({
      data: {
        venueId: venue.id,
        bookerId: booker.id,
        purpose,
        startAt,
        endAt,
        status: BookingStatus.PENDING,
        approvalChainSnapshot: chain.steps,
        currentStepIndex: 0,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "booking",
        entityId: booking.id,
        action: "SUBMIT_BOOKING",
        actorId: booker.id,
        metadata: { initialStatus: "PENDING", venueId: venue.id, seeded: true },
      },
    });

    const firstStep = chain.steps[0];
    const firstApprover = await prisma.user.findFirst({
      where: { role: Role.APPROVER, approverTier: firstStep.tier },
    });
    if (firstApprover) {
      await prisma.notificationOutbox.create({
        data: {
          bookingId: booking.id,
          recipientId: firstApprover.id,
          templateKey: "APPROVAL_REQUESTED",
          payload: {
            bookingId: booking.id,
            venueName: venue.name,
            purpose,
            timeslot: { startAt, endAt },
            stepTier: firstStep.tier,
          },
        },
      });
    }

    return booking;
  }

  await seedPendingBooking({
    venue: aryabhatta,
    chain: estateChain,
    purpose: "Annual Cultural Fest",
    startAt: new Date("2026-09-10T10:00:00Z"),
    endAt: new Date("2026-09-10T18:00:00Z"),
  });

  await seedPendingBooking({
    venue: hostelCommonRoom,
    chain: hostelChain,
    purpose: "Hostel Floor Meetup",
    startAt: new Date("2026-08-15T18:00:00Z"),
    endAt: new Date("2026-08-15T21:00:00Z"),
  });

  await seedPendingBooking({
    venue: classroom,
    chain: classroomChain,
    purpose: "Guest Lecture",
    startAt: new Date("2026-08-12T14:00:00Z"),
    endAt: new Date("2026-08-12T16:00:00Z"),
  });

  // A second Estate booking, one step further along (tier 1 already
  // approved), so the demo can show a mid-chain state without having to
  // click through tier 1 live.
  const midChainBooking = await prisma.booking.create({
    data: {
      venueId: gnbCircle.id,
      bookerId: booker.id,
      purpose: "Alumni Meet",
      startAt: new Date("2026-09-20T10:00:00Z"),
      endAt: new Date("2026-09-20T16:00:00Z"),
      status: BookingStatus.PENDING,
      approvalChainSnapshot: estateChain.steps,
      currentStepIndex: 1,
    },
  });
  await prisma.approval.create({
    data: {
      bookingId: midChainBooking.id,
      stepIndex: 0,
      approverId: approver1.id,
      decision: "APPROVE",
      comment: null,
    },
  });
  await prisma.auditLog.create({
    data: {
      entityType: "booking",
      entityId: midChainBooking.id,
      action: "BOOKING_STEP_APPROVED",
      actorId: approver1.id,
      metadata: { stepIndex: 0, decision: "APPROVE", resultingStatus: "PENDING", seeded: true },
    },
  });

  console.log("Seeding complete: 3 chains, 7 venues, 6 users, 4 PENDING bookings (one mid-chain).");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
