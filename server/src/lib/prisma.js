// Prisma client singleton — imported by controllers.
// See README.md "Server layering" and AGENTS.md conventions.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default prisma;
