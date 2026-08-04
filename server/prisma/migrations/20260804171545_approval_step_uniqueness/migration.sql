-- Two concurrent decisions on the same approval step must not both be
-- recordable. The application-level "does a decision already exist" check
-- in approvalController.js is a SELECT-then-INSERT race on its own -- this
-- is the database-level guarantee, the same pattern as the booking
-- exclusion constraint (see *_add_concurrency_guarantee).

-- CreateIndex
CREATE UNIQUE INDEX "approvals_bookingId_stepIndex_key" ON "approvals"("bookingId", "stepIndex");
