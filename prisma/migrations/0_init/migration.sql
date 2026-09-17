-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Utility" (
    "id" TEXT NOT NULL,
    "pwsid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCodes" TEXT NOT NULL,
    "county" TEXT,
    "population" INTEGER NOT NULL DEFAULT 0,
    "systemType" TEXT NOT NULL DEFAULT 'Community',
    "sourceType" TEXT NOT NULL DEFAULT 'Surface',
    "treatmentStatus" TEXT NOT NULL DEFAULT 'Treated',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "website" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Utility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contaminant" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "chemicalName" TEXT,
    "category" TEXT NOT NULL,
    "legalLimit" DOUBLE PRECISION,
    "legalLimitUnit" TEXT,
    "healthGuideline" DOUBLE PRECISION,
    "healthGuidelineUnit" TEXT,
    "ewgHealthLimit" DOUBLE PRECISION,
    "description" TEXT,
    "healthEffects" TEXT,
    "sources" TEXT,
    "regulated" BOOLEAN NOT NULL DEFAULT true,
    "trackedByUs" BOOLEAN NOT NULL DEFAULT false,
    "rarityNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contaminant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sample" (
    "id" TEXT NOT NULL,
    "utilityId" TEXT,
    "contaminantId" TEXT NOT NULL,
    "level" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "sampleDate" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'Utility CCR',
    "robot" BOOLEAN NOT NULL DEFAULT false,
    "treatmentStatus" TEXT NOT NULL DEFAULT 'Treated',
    "location" TEXT,
    "quality" TEXT NOT NULL DEFAULT 'verified',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "utilityId" TEXT,
    "reporterName" TEXT,
    "reporterEmail" TEXT,
    "zipCode" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "contaminant" TEXT,
    "appearance" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chapter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "chapterName" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "waterBody" TEXT,
    "organization" TEXT,
    "identifier" BOOLEAN NOT NULL DEFAULT false,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Volunteer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "zipCode" TEXT,
    "city" TEXT,
    "state" TEXT,
    "role" TEXT NOT NULL DEFAULT 'Chapter Lead',
    "skills" TEXT,
    "availability" TEXT,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Volunteer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertSubscription" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "utilityId" TEXT,
    "zipCode" TEXT,
    "contaminantId" TEXT,
    "threshold" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Donation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'Supporter',
    "message" TEXT,
    "anonymous" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pledged',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "externalId" TEXT,

    CONSTRAINT "Donation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Utility_pwsid_key" ON "Utility"("pwsid");

-- CreateIndex
CREATE INDEX "Utility_state_idx" ON "Utility"("state");

-- CreateIndex
CREATE INDEX "Utility_city_idx" ON "Utility"("city");

-- CreateIndex
CREATE UNIQUE INDEX "Contaminant_slug_key" ON "Contaminant"("slug");

-- CreateIndex
CREATE INDEX "Sample_utilityId_idx" ON "Sample"("utilityId");

-- CreateIndex
CREATE INDEX "Sample_contaminantId_idx" ON "Sample"("contaminantId");

-- CreateIndex
CREATE INDEX "Sample_sampleDate_idx" ON "Sample"("sampleDate");

-- CreateIndex
CREATE INDEX "Sample_quality_idx" ON "Sample"("quality");

-- CreateIndex
CREATE INDEX "Report_zipCode_idx" ON "Report"("zipCode");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Chapter_email_key" ON "Chapter"("email");

-- CreateIndex
CREATE INDEX "Chapter_status_idx" ON "Chapter"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Volunteer_email_key" ON "Volunteer"("email");

-- CreateIndex
CREATE INDEX "Volunteer_status_idx" ON "Volunteer"("status");

-- CreateIndex
CREATE INDEX "Volunteer_role_idx" ON "Volunteer"("role");

-- CreateIndex
CREATE INDEX "AlertSubscription_email_idx" ON "AlertSubscription"("email");

-- CreateIndex
CREATE INDEX "AlertSubscription_utilityId_idx" ON "AlertSubscription"("utilityId");

-- CreateIndex
CREATE INDEX "AlertSubscription_active_idx" ON "AlertSubscription"("active");

-- CreateIndex
CREATE UNIQUE INDEX "Donation_externalId_key" ON "Donation"("externalId");

-- CreateIndex
CREATE INDEX "Donation_status_idx" ON "Donation"("status");

-- CreateIndex
CREATE INDEX "Donation_tier_idx" ON "Donation"("tier");

-- AddForeignKey
ALTER TABLE "Sample" ADD CONSTRAINT "Sample_utilityId_fkey" FOREIGN KEY ("utilityId") REFERENCES "Utility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sample" ADD CONSTRAINT "Sample_contaminantId_fkey" FOREIGN KEY ("contaminantId") REFERENCES "Contaminant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_utilityId_fkey" FOREIGN KEY ("utilityId") REFERENCES "Utility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertSubscription" ADD CONSTRAINT "AlertSubscription_utilityId_fkey" FOREIGN KEY ("utilityId") REFERENCES "Utility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertSubscription" ADD CONSTRAINT "AlertSubscription_contaminantId_fkey" FOREIGN KEY ("contaminantId") REFERENCES "Contaminant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

