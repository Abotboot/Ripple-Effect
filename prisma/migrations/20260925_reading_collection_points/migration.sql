-- Additive only. Every statement is safe to re-run by hand (see
-- docs/migrations/provenance-baseline-runbook.md for the manual procedure).

-- Where a reading was collected: a point on the water plus the water body name.
CREATE TABLE IF NOT EXISTS "SampleCollectionPoint" (
    "sampleId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "waterBody" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SampleCollectionPoint_pkey" PRIMARY KEY ("sampleId")
);

-- Private contributor contact details, kept out of the public Sample.notes.
CREATE TABLE IF NOT EXISTS "SampleContributor" (
    "sampleId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SampleContributor_pkey" PRIMARY KEY ("sampleId")
);

-- Shared fixed-window throttle counters (keys are SHA-256 digests).
CREATE TABLE IF NOT EXISTS "RequestThrottle" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequestThrottle_pkey" PRIMARY KEY ("key")
);

CREATE INDEX IF NOT EXISTS "SampleCollectionPoint_latitude_longitude_idx" ON "SampleCollectionPoint"("latitude", "longitude");
CREATE INDEX IF NOT EXISTS "SampleContributor_email_createdAt_idx" ON "SampleContributor"("email", "createdAt");
CREATE INDEX IF NOT EXISTS "RequestThrottle_windowStart_idx" ON "RequestThrottle"("windowStart");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SampleCollectionPoint_sampleId_fkey') THEN
    ALTER TABLE "SampleCollectionPoint" ADD CONSTRAINT "SampleCollectionPoint_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "Sample"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SampleContributor_sampleId_fkey') THEN
    ALTER TABLE "SampleContributor" ADD CONSTRAINT "SampleContributor_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "Sample"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Move reporter emails out of legacy notes ("reporter:<email> | name:<name> | ...").
-- The old validator rejected whitespace, so \S+ captures the whole address,
-- including any '|' characters the old public redaction regex stopped at.
INSERT INTO "SampleContributor" ("sampleId", "email", "name", "createdAt")
SELECT s."id",
       substring(s."notes" from '^reporter:(\S+)'),
       COALESCE(NULLIF(btrim(substring(s."notes" from ' \| name:([^|]*)')), ''), 'Unknown'),
       s."createdAt"
FROM "Sample" s
WHERE s."notes" ~ '^reporter:\S+'
ON CONFLICT ("sampleId") DO NOTHING;

UPDATE "Sample"
SET "notes" = NULLIF(regexp_replace("notes", '^reporter:\S+( \| )?', ''), '')
WHERE "notes" ~ '^reporter:\S+';
