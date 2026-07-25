-- AGENTS.md rule 1: double-booking is prevented by a PostgreSQL EXCLUDE
-- constraint on (venue_id, timeslot), never by application-level checks.
-- Prisma's schema DSL cannot express this, so it is raw SQL here.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Architect decision (AGENTS.md section 7, "does Pending hold the slot"):
-- PENDING, APPROVED, and MODIFIED bookings hold the slot. DRAFT never held
-- it; REJECTED, CANCELLED, and COMPLETED have released it. Scoping the
-- constraint to these statuses means a rejected/cancelled booking's old
-- timeslot never blocks a new request for the same slot.
ALTER TABLE "bookings"
  ADD CONSTRAINT booking_no_overlap
  EXCLUDE USING gist (
    "venueId" WITH =,
    tstzrange("startAt", "endAt") WITH &&
  )
  WHERE (status IN ('PENDING', 'APPROVED', 'MODIFIED'));

-- AGENTS.md rule 3: audit_log is append-only. Immutability is a database
-- grant, not an application convention — so it holds even if a bug (or a
-- future developer who never read this file) writes an UPDATE/DELETE call.
--
-- app_user is the least-privilege role the running server connects as
-- (see server/.env.example DATABASE_URL). Migrations themselves run as a
-- more privileged role (e.g. postgres), which is why this migration is the
-- only place that needs to create app_user if it doesn't already exist.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user LOGIN PASSWORD 'CHANGE_ME_LOCAL_DEV_ONLY';
  END IF;
END
$$;

-- current_database() keeps this portable across dev/CI/staging/prod, where
-- the database name will differ.
DO $$
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO app_user', current_database());
END
$$;
GRANT USAGE ON SCHEMA public TO app_user;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- The immutability guarantee itself: revoke the two privileges that would
-- let anyone mutate history, from every role, unconditionally.
REVOKE UPDATE, DELETE ON "audit_log" FROM app_user;
REVOKE UPDATE, DELETE ON "audit_log" FROM PUBLIC;
