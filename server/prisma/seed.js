// Prisma seed entry point (invoked by `npm run prisma:seed`).
// Team 1 owned. No seed data yet — add it once the schema has models.
import { PrismaClient } from '@prisma/client';
import { Role } from '../../shared/index.js'; // Adjust path if needed

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding users...');

  // 1. Create an Admin user
  const admin = await prisma.user.upsert({
    where: { email: 'pgp41270@iiml.ac.in' },
    update: {},
    create: {
      email: 'pgp41270@iiml.ac.in',
      name: 'System Admin',
      role: Role.ADMIN,
    },
  });

  // 2. Create a standard Booker user
  const booker = await prisma.user.upsert({
    where: { email: 'john.doe@iiml.ac.in' },
    update: {},
    create: {
      email: 'john.doe@iiml.ac.in',
      name: 'John Doe',
      role: Role.BOOKER,
    },
  });

  // 3. Create an Approver user
  const approver = await prisma.user.upsert({
    where: { email: 'approver@iiml.ac.in' },
    update: {},
    create: {
      email: 'approver@iiml.ac.in',
      name: 'Faculty Approver',
      role: Role.APPROVER,
      approverTier: 1,
    },
  });

  console.log('Seeding complete! Added:', { admin, booker, approver });
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
