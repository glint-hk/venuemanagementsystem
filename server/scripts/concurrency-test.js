// Stress-test script proving the two structural guarantees added by
// prisma/migrations/*_add_concurrency_guarantee: (1) the venue/timeslot
// exclusion constraint makes double-booking impossible under real
// concurrency, and (2) audit_log's immutability is enforced by a database
// grant. See AGENTS.md rules 1 and 3, and README.md "Key design guarantees".
//
// Connects as app_user — the least-privilege role the running server itself
// uses — not the migration/admin role, because the audit_log grant only
// proves anything if it's tested from the role it actually restricts.

import "dotenv/config";
import { randomUUID } from "node:crypto";
import pg from "pg";

const { Pool } = pg;

function appUserConnectionString() {
  const url = new URL(process.env.DATABASE_URL);
  url.username = "app_user";
  url.password = "CHANGE_ME_LOCAL_DEV_ONLY"; // pragma: allowlist-secret -- matches the placeholder created by the add_concurrency_guarantee migration, not a real credential
  return url.toString();
}

const adminPool = new Pool({ connectionString: process.env.DATABASE_URL });
const appPool = new Pool({ connectionString: appUserConnectionString() });

async function seedFixtures() {
  const chainId = randomUUID();
  const venueId = randomUUID();
  const bookerId = randomUUID();

  await appPool.query(
    `INSERT INTO approval_chains (id, "venueType", version, steps, "updatedAt")
     VALUES ($1, 'stress-test-room', 1, '[]'::jsonb, now())`,
    [chainId],
  );

  await appPool.query(
    `INSERT INTO venues (id, name, type, location, capacity, attributes, "approvalChainId", "createdAt")
     VALUES ($1, 'Concurrency Test Room', 'stress-test-room', 'Test Block', 30, ARRAY[]::text[], $2, now())`,
    [venueId, chainId],
  );

  await appPool.query(
    `INSERT INTO users (id, email, name, role, "createdAt")
     VALUES ($1, 'stress-test-booker@example.edu', 'Stress Test Booker', 'BOOKER', now())`,
    [bookerId],
  );

  return { chainId, venueId, bookerId };
}

async function runConcurrencyTest(venueId, bookerId) {
  const startAt = new Date("2027-01-01T10:00:00Z");
  const endAt = new Date("2027-01-01T11:00:00Z");

  const attempts = Array.from({ length: 20 }, (_, i) =>
    appPool.query(
      `INSERT INTO bookings
         (id, "venueId", "bookerId", purpose, "startAt", "endAt", status, "approvalChainSnapshot", "currentStepIndex", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', '[]'::jsonb, 0, now(), now())`,
      [randomUUID(), venueId, bookerId, `concurrent attempt #${i + 1}`, startAt, endAt],
    ),
  );

  const results = await Promise.allSettled(attempts);
  const succeeded = results.filter((r) => r.status === "fulfilled");
  const failed = results.filter((r) => r.status === "rejected");
  const unexpectedFailures = failed.filter((r) => r.reason?.code !== "23P01");

  return { succeeded, failed, unexpectedFailures };
}

async function runAuditImmutabilityTest() {
  const rowId = randomUUID();

  await appPool.query(
    `INSERT INTO audit_log (id, "entityType", "entityId", action, "actorId", metadata, "createdAt")
     VALUES ($1, 'booking', $2, 'TEST_EVENT', NULL, '{}'::jsonb, now())`,
    [rowId, randomUUID()],
  );

  let updateBlocked = false;
  let updateErrorCode = null;
  try {
    await appPool.query(`UPDATE audit_log SET action = 'TAMPERED' WHERE id = $1`, [rowId]);
  } catch (err) {
    updateBlocked = true;
    updateErrorCode = err.code;
  }

  return { rowId, updateBlocked, updateErrorCode };
}

async function cleanup({ venueId, bookerId, chainId, auditRowId }) {
  await appPool.query(`DELETE FROM bookings WHERE "venueId" = $1`, [venueId]);
  await appPool.query(`DELETE FROM venues WHERE id = $1`, [venueId]);
  await appPool.query(`DELETE FROM approval_chains WHERE id = $1`, [chainId]);
  await appPool.query(`DELETE FROM users WHERE id = $1`, [bookerId]);
  // app_user cannot delete from audit_log by design — use the admin pool.
  if (auditRowId) {
    await adminPool.query(`DELETE FROM audit_log WHERE id = $1`, [auditRowId]);
  }
}

async function main() {
  console.log("Seeding fixtures as app_user...");
  const { chainId, venueId, bookerId } = await seedFixtures();

  console.log("\n=== Concurrency test: 20 simultaneous bookings, same venue + timeslot ===");
  const { succeeded, failed, unexpectedFailures } = await runConcurrencyTest(venueId, bookerId);
  console.log(`Succeeded: ${succeeded.length}`);
  console.log(`Rejected:  ${failed.length}`);
  if (unexpectedFailures.length > 0) {
    console.log("UNEXPECTED failure reasons (not exclusion violations, code 23P01):");
    for (const f of unexpectedFailures) console.log(`  - [${f.reason.code}] ${f.reason.message}`);
  }
  const pass1 = succeeded.length === 1 && failed.length === 19 && unexpectedFailures.length === 0;
  console.log(
    pass1
      ? "PASS: exactly one booking succeeded; the other 19 were rejected by the database exclusion constraint."
      : "FAIL: the exclusion constraint did not behave as specified.",
  );

  console.log("\n=== Audit log immutability test ===");
  const { rowId: auditRowId, updateBlocked, updateErrorCode } = await runAuditImmutabilityTest();
  console.log(`UPDATE attempt blocked: ${updateBlocked} (Postgres error code: ${updateErrorCode})`);
  const pass2 = updateBlocked && updateErrorCode === "42501";
  console.log(
    pass2
      ? "PASS: UPDATE against audit_log was refused by the database (permission denied)."
      : "FAIL: audit_log accepted a mutation.",
  );

  await cleanup({ venueId, bookerId, chainId, auditRowId });
  await appPool.end();
  await adminPool.end();

  if (!pass1 || !pass2) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
