import request from 'supertest'
import express from 'express'
import prisma from '../src/prisma'
import bookingController from '../src/controllers/bookingController'

// Set up a lightweight Express app for testing
const app = express();
app.use(express.json());

// Mock user auth middleware
app.use((req, res, next) => {
  req.user = { id: 'test-user-id', role: 'BOOKER' };
  next();
});

// Mount controller endpoints
app.post('/api/bookings', bookingController.createBooking);
app.get('/api/bookings', bookingController.getBookings);
app.get('/api/bookings/:id', bookingController.getBookingById);
app.patch('/api/bookings/:id/cancel', bookingController.cancelBooking);

// Attach the exact inline error handler from server/src/index.js
app.use((err, req, res, next) => {
  console.error(err);

  // Prisma unique constraint violation (e.g. duplicate email)
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'A record with this unique value already exists.' });
  }

  // PostgreSQL Exclusion Constraint Violation (Double-booking attempt)
  if (err.code === 'P2010' || err.message?.includes('exclusion constraint')) {
    return res.status(409).json({ error: 'Venue is already booked for the requested timeslot.' });
  }

  return res.status(500).json({ error: err.message || 'Internal Server Error' });
});

describe('Booking Controller Integration Tests', () => {
  let testVenueId;

  // Set up dummy database state before tests run
  beforeAll(async () => {
    const chain = await prisma.approvalChain.create({
      data: { venueType: 'AUDITORIUM', steps: [{ tier: 1 }] },
    });

    const venue = await prisma.venue.create({
      data: {
        name: 'Main Hall',
        type: 'AUDITORIUM',
        location: 'Campus North',
        capacity: 200,
        approvalChainId: chain.id,
      },
    });
    testVenueId = venue.id;

    await prisma.user.upsert({
      where: { id: 'test-user-id' },
      update: {},
      create: {
        id: 'test-user-id',
        email: 'test@iiml.ac.in',
        name: 'Test Booker',
        role: 'BOOKER',
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

  test('POST /api/bookings - creates booking with notification and audit log', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({
        venueId: testVenueId,
        purpose: 'Annual Fest Meeting',
        startAt: '2026-08-10T10:00:00Z',
        endAt: '2026-08-10T12:00:00Z',
        isDraft: false,
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('PENDING');

    const outbox = await prisma.notificationOutbox.findFirst({
      where: { bookingId: res.body.id },
    });
    expect(outbox).not.toBeNull();

    const audit = await prisma.auditLog.findFirst({
      where: { entityId: res.body.id },
    });
    expect(audit).not.toBeNull();
    expect(audit.action).toBe('SUBMIT_BOOKING');
  });

  test('POST /api/bookings - prevents double-booking via database EXCLUDE constraint', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({
        venueId: testVenueId,
        purpose: 'Conflicting Event',
        startAt: '2026-08-10T11:00:00Z',
        endAt: '2026-08-10T13:00:00Z',
        isDraft: false,
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Venue is already booked for the requested timeslot.');
  });
});