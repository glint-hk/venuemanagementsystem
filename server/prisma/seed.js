// Prisma seed script — populates sample campus venues, approval chains, and users into PostgreSQL.
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // 1. Create Approval Chains for venue types
  const classroomChain = await prisma.approvalChain.create({
    data: {
      venueType: "classroom",
      version: 1,
      steps: [
        { tier: 1, role: "APPROVER", escalationWindowHours: 24 },
      ],
    },
  });

  const auditoriumChain = await prisma.approvalChain.create({
    data: {
      venueType: "auditorium",
      version: 1,
      steps: [
        { tier: 1, role: "APPROVER", escalationWindowHours: 24 },
        { tier: 2, role: "APPROVER", escalationWindowHours: 48 },
      ],
    },
  });

  // 2. Create Sample Venues
  await prisma.venue.createMany({
    data: [
      {
        name: "Aryabhata Hall (L-1)",
        type: "auditorium",
        location: "Academic Block A, Ground Floor",
        capacity: 250,
        attributes: ["projector", "sound system", "air conditioning", "stage"],
        approvalChainId: auditoriumChain.id,
      },
      {
        name: "Bhaskara Classroom (C-101)",
        type: "classroom",
        location: "Academic Block B, First Floor",
        capacity: 60,
        attributes: ["projector", "whiteboard", "air conditioning"],
        approvalChainId: classroomChain.id,
      },
      {
        name: "Chanakya Seminar Room (S-202)",
        type: "classroom",
        location: "Management Block, Second Floor",
        capacity: 40,
        attributes: ["projector", "sound system", "video conferencing"],
        approvalChainId: classroomChain.id,
      },
      {
        name: "Ramanujan Discussion Room (D-12)",
        type: "classroom",
        location: "Library Building, Ground Floor",
        capacity: 15,
        attributes: ["whiteboard", "smart TV"],
        approvalChainId: classroomChain.id,
      },
      {
        name: "Main Campus Convocation Ground",
        type: "auditorium",
        location: "Outdoor Central Lawns",
        capacity: 1000,
        attributes: ["stage", "sound system", "outdoor lighting"],
        approvalChainId: auditoriumChain.id,
      },
    ],
  });

  // 3. Create Sample Users
  await prisma.user.upsert({
    where: { email: "admin@iiml.ac.in" },
    update: { role: Role.ADMIN },
    create: {
      email: "admin@iiml.ac.in",
      name: "Admin User",
      role: Role.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: "approver1@iiml.ac.in" },
    update: { role: Role.APPROVER, approverTier: 1 },
    create: {
      email: "approver1@iiml.ac.in",
      name: "Faculty Approver (Tier 1)",
      role: Role.APPROVER,
      approverTier: 1,
    },
  });

  await prisma.user.upsert({
    where: { email: "approver2@iiml.ac.in" },
    update: { role: Role.APPROVER, approverTier: 2 },
    create: {
      email: "approver2@iiml.ac.in",
      name: "Dean / Registrar (Tier 2)",
      role: Role.APPROVER,
      approverTier: 2,
    },
  });

  await prisma.user.upsert({
    where: { email: "student@iiml.ac.in" },
    update: { role: Role.BOOKER },
    create: {
      email: "student@iiml.ac.in",
      name: "Student Booker",
      role: Role.BOOKER,
    },
  });

  console.log("✅ Seeding complete! Populated 5 venues, 2 approval chains, and 4 test users.");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
