import request from "supertest";
import express from "express";
import prisma from "../src/lib/prisma.js";
import {
  createBooking,
  getBookings,
  getBookingById,
  cancelBooking,
  updateBooking,
} from "../src/controllers/bookingController.js";
import { BookingStatus } from "../../shared/index.js";

const app = express();
app.use(express.json());

app.use((req, _res, next) => {
  req.user = { id: "test-user-id", role: "BOOKER" };
  next();
});

app.post("/api/bookings", createBooking);
app.get("/api/bookings", getBookings);
app.get("/api/bookings/:id", getBookingById);
app.put("/api/bookings/:id", updateBooking);
app.patch("/api/bookings/:id/cancel", cancelBooking);

app.use((err, _req, res, _next) => {
  console.error(err);

  if (err.code === "P2002") {
    return res.status(409).json({
      error: "A record with this unique value already exists.",
    });
  }

  if (err.code === "P2010" || err.message?.includes("exclusion constraint")) {
    return res.status(409).json({
      error: "Venue is already booked for the requested timeslot.",
    });
  }

  return res.status(500).json({ error: err.message || "Internal Server Error" });
});

describe("Booking lifecycle", () => {
  let testVenueId;

  beforeAll(async () => {
    const chain = await prisma.approvalChain.create({
      data: {
        venueType: "AUDITORIUM",
        steps: [{ tier: 1, role: "APPROVER", escalationWindowHours: 48 }],
      },
    });

    const venue = await prisma.venue.create({
      data: {
        name: "Main Hall",
        type: "AUDITORIUM",
        location: "Campus North",
        capacity: 200,
        attributes: [],
        approvalChainId: chain.id,
      },
    });
    testVenueId = venue.id;

    await prisma.user.upsert({
      where: { id: "test-user-id" },
      update: {},
      create: {
        id: "test-user-id",
        email: "test@iiml.ac.in",
        name: "Test Booker",
        role: "BOOKER",
      },
    });
  });

  afterAll(async () => {
    await prisma.notificationOutbox.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.venue.deleteMany();
    await prisma.approvalChain.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  test("POST /api/bookings — creates booking with notification and audit log", async () => {
    const res = await request(app).post("/api/bookings").send({
      venueId: testVenueId,
      purpose: "Annual Fest Meeting",
      timeslot: {
        startAt: "2026-08-10T10:00:00Z",
        endAt: "2026-08-10T12:00:00Z",
      },
    });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe(BookingStatus.PENDING);

    const outbox = await prisma.notificationOutbox.findFirst({
      where: { bookingId: res.body.id },
    });
    expect(outbox).not.toBeNull();

    const audit = await prisma.auditLog.findFirst({
      where: { entityId: res.body.id },
    });
    expect(audit).not.toBeNull();
    expect(audit.action).toBe("BOOKING_CREATED");
  });

  test("POST /api/bookings — double-booking returns 409", async () => {
    const res = await request(app).post("/api/bookings").send({
      venueId: testVenueId,
      purpose: "Conflicting Event",
      timeslot: {
        startAt: "2026-08-10T11:00:00Z",
        endAt: "2026-08-10T13:00:00Z",
      },
    });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already booked|booked for this venue/i);
  });

  test("PATCH /api/bookings/:id/cancel — frees slot for rebooking", async () => {
    const createRes = await request(app).post("/api/bookings").send({
      venueId: testVenueId,
      purpose: "Temporary Event",
      timeslot: {
        startAt: "2026-09-01T10:00:00Z",
        endAt: "2026-09-01T12:00:00Z",
      },
    });
    expect(createRes.status).toBe(201);

    const cancelRes = await request(app).patch(
      `/api/bookings/${createRes.body.id}/cancel`
    );
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.status).toBe(BookingStatus.CANCELLED);

    const rebookRes = await request(app).post("/api/bookings").send({
      venueId: testVenueId,
      purpose: "Rebooked Event",
      timeslot: {
        startAt: "2026-09-01T10:00:00Z",
        endAt: "2026-09-01T12:00:00Z",
      },
    });
    expect(rebookRes.status).toBe(201);
  });

  test("PUT /api/bookings/:id — slot change moves booking back to PENDING", async () => {
    const createRes = await request(app).post("/api/bookings").send({
      venueId: testVenueId,
      purpose: "Modifiable Event",
      timeslot: {
        startAt: "2026-10-01T10:00:00Z",
        endAt: "2026-10-01T12:00:00Z",
      },
    });
    expect(createRes.status).toBe(201);

    const modifyRes = await request(app)
      .put(`/api/bookings/${createRes.body.id}`)
      .send({
        timeslot: {
          startAt: "2026-10-01T14:00:00Z",
          endAt: "2026-10-01T16:00:00Z",
        },
      });

    expect(modifyRes.status).toBe(200);
    expect(modifyRes.body.status).toBe(BookingStatus.PENDING);
  });
});
