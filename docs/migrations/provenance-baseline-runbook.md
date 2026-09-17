# Database Migration & Baselining Runbook: Provenance & Verification

## 1. Overview & Objective
This runbook guides safe deployment of the additive schema enhancements introduced in `agent/cinematic-water-v2` for `A Ripple Effect Initiative`.

### Key Safety Invariants
1. **Never run `prisma db push --accept-data-loss` in build or CI pipelines.** (Netlify build command is now `npx prisma generate && npm run build`).
2. **Schema changes are strictly additive.** All new columns (`provenance`, `verificationStatus`, `sourceUrl`, `sourceRecordId`, `reportingPeriod`, `method`, `verifiedAt`) have safe defaults or are nullable. Existing columns (`source`, `quality`) are preserved.
3. **Legacy data stays intact.** Ambiguous legacy records default to `UNKNOWN` / `UNREVIEWED`. No synthetic values are backfilled as real institutional data.

---

## 2. Additive Migration SQL

```sql
-- Step 1: Create Enums (PostgreSQL) or Text Constraints (SQLite/PostgreSQL compatible)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SampleProvenance') THEN
    CREATE TYPE "SampleProvenance" AS ENUM (
      'UNKNOWN',
      'ILLUSTRATIVE',
      'CITIZEN_CONTRIBUTED',
      'REGULATORY_REPORTED',
      'LAB_REPORTED'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SampleVerification') THEN
    CREATE TYPE "SampleVerification" AS ENUM (
      'UNREVIEWED',
      'VERIFIED',
      'REJECTED'
    );
  END IF;
END $$;

-- Step 2: Add additive columns to "Sample" table
ALTER TABLE "Sample"
  ADD COLUMN IF NOT EXISTS "provenance" "SampleProvenance" NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN IF NOT EXISTS "verificationStatus" "SampleVerification" NOT NULL DEFAULT 'UNREVIEWED',
  ADD COLUMN IF NOT EXISTS "sourceUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceRecordId" TEXT,
  ADD COLUMN IF NOT EXISTS "reportingPeriod" TEXT,
  ADD COLUMN IF NOT EXISTS "method" TEXT,
  ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3);

-- Step 3: Alter defaults for non-authoritative fallback
ALTER TABLE "Sample" ALTER COLUMN "source" SET DEFAULT 'Unknown';
ALTER TABLE "Sample" ALTER COLUMN "quality" SET DEFAULT 'unreviewed';
```

---

## 3. Baselining Procedure (Prisma v6)

If the target database was previously updated via `prisma db push` without migration tracking:
```bash
# 1. Take a full snapshot/backup of the database before touching schema
pg_dump $DATABASE_URL > backup_pre_provenance_$(date +%Y%m%d%H%M%S).sql

# 2. Mark initial baseline migration as applied if existing tables exist
npx prisma migrate resolve --applied 0_init

# 3. Apply the additive migration
npx prisma migrate deploy
```

---

## 4. Dry-Run Backfill Verification Script

Before executing any updates to historical rows, run a dry-run report:

```bash
# Dry run report: Inspect ambiguous vs clear demonstration rows
node -e '
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function check() {
  const all = await prisma.sample.findMany({ select: { id: true, source: true, quality: true } });
  let illustrative = 0, citizen = 0, unknown = 0;
  for (const s of all) {
    const src = (s.source || "").toLowerCase();
    const q = (s.quality || "").toLowerCase();
    if (src.includes("demo") || src.includes("illustrative") || q === "illustrative") {
      illustrative++;
    } else if (src.includes("citizen") || q === "citizen") {
      citizen++;
    } else {
      unknown++;
    }
  }
  console.log({ total: all.length, illustrative, citizen, unreviewed_unknown: unknown });
}
check().finally(() => prisma.$disconnect());
'
```

---

## 5. Rollback Plan

Because all column additions are strictly additive, nullable, or carry safe backwards-compatible defaults, rollback follows the Expand/Contract migration discipline:
1. **Zero-downtime application rollback**: Revert application deployment to previous release tag.
2. **Database stability**: Retain additive columns in the database. Older code continues to read `source` and `quality` normally and ignores additive columns. No destructive `DROP COLUMN` operations during routine rollback.
3. If schema contraction is ever desired in the future, it must be planned as a separate, independently tested migration cycle after verified deprecation.
