-- CreateEnum
CREATE TYPE " SampleProvenance\ AS ENUM ('UNKNOWN', 'ILLUSTRATIVE', 'CITIZEN_CONTRIBUTED', 'REGULATORY_REPORTED', 'LAB_REPORTED');

-- CreateEnum
CREATE TYPE \SampleVerification\ AS ENUM ('UNREVIEWED', 'VERIFIED', 'REJECTED');

-- AlterTable
ALTER TABLE \Sample\
 ADD COLUMN \provenance\ \SampleProvenance\ NOT NULL DEFAULT 'UNKNOWN',
 ADD COLUMN \verificationStatus\ \SampleVerification\ NOT NULL DEFAULT 'UNREVIEWED',
 ADD COLUMN \sourceUrl\ TEXT,
 ADD COLUMN \sourceRecordId\ TEXT,
 ADD COLUMN \reportingPeriod\ TEXT,
 ADD COLUMN \method\ TEXT,
 ADD COLUMN \verifiedAt\ TIMESTAMP(3),
 ALTER COLUMN \source\ SET DEFAULT 'Unknown',
 ALTER COLUMN \quality\ SET DEFAULT 'unreviewed';
