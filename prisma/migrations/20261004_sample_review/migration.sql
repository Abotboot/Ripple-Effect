-- Additive only. Every statement is safe to re-run by hand (see
-- docs/migrations/provenance-baseline-runbook.md for the manual procedure).

-- The decision that published, held or rejected a submitted reading, by Jev
-- (TypeSafe AI's decision model) or an admin, with the checklist it was based on.
CREATE TABLE IF NOT EXISTS "SampleReview" (
    "sampleId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "decidedBy" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "model" TEXT,
    "summary" TEXT NOT NULL,
    "checks" JSONB NOT NULL,
    "answers" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SampleReview_pkey" PRIMARY KEY ("sampleId")
);

CREATE INDEX IF NOT EXISTS "SampleReview_decision_createdAt_idx" ON "SampleReview"("decision", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SampleReview_sampleId_fkey') THEN
    ALTER TABLE "SampleReview" ADD CONSTRAINT "SampleReview_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "Sample"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
