-- CreateTable
CREATE TABLE " User\ (
 \id\ TEXT NOT NULL,
 \email\ TEXT NOT NULL,
 \name\ TEXT,
 \password\ TEXT NOT NULL,
 \role\ TEXT NOT NULL DEFAULT 'user',
 \createdAt\ TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 \updatedAt\ TIMESTAMP(3) NOT NULL,

 CONSTRAINT \User_pkey\ PRIMARY KEY (\id\)
);

-- CreateTable
CREATE TABLE \Utility\ (
 \id\ TEXT NOT NULL,
 \pwsid\ TEXT NOT NULL,
 \name\ TEXT NOT NULL,
 \city\ TEXT NOT NULL,
 \state\ TEXT NOT NULL,
 \zipCodes\ TEXT NOT NULL,
 \county\ TEXT,
 \population\ INTEGER NOT NULL,
 \systemType\ TEXT NOT NULL,
 \sourceType\ TEXT NOT NULL,
 \treatmentStatus\ TEXT NOT NULL DEFAULT 'Treated',
 \latitude\ DOUBLE PRECISION,
 \longitude\ DOUBLE PRECISION,
 \website\ TEXT,
 \notes\ TEXT,
 \createdAt\ TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

 CONSTRAINT \Utility_pkey\ PRIMARY KEY (\id\)
);

-- CreateTable
CREATE TABLE \Contaminant\ (
 \id\ TEXT NOT NULL,
 \slug\ TEXT NOT NULL,
 \name\ TEXT NOT NULL,
 \chemicalName\ TEXT,
 \category\ TEXT NOT NULL,
 \legalLimit\ DOUBLE PRECISION,
 \legalLimitUnit\ TEXT,
 \healthGuideline\ DOUBLE PRECISION,
 \healthGuidelineUnit\ TEXT,
 \ewgHealthLimit\ DOUBLE PRECISION,
 \description\ TEXT,
 \healthEffects\ TEXT,
 \sources\ TEXT,
 \rarityNote\ TEXT,
 \regulated\ BOOLEAN NOT NULL DEFAULT false,
 \trackedByUs\ BOOLEAN NOT NULL DEFAULT false,

 CONSTRAINT \Contaminant_pkey\ PRIMARY KEY (\id\)
);

-- CreateTable
CREATE TABLE \Sample\ (
 \id\ TEXT NOT NULL,
 \utilityId\ TEXT,
 \contaminantId\ TEXT NOT NULL,
 \level\ DOUBLE PRECISION NOT NULL,
 \unit\ TEXT NOT NULL,
 \sampleDate\ TIMESTAMP(3) NOT NULL,
 \source\ TEXT NOT NULL DEFAULT 'Utility CCR',
 \robot\ BOOLEAN NOT NULL DEFAULT false,
 \treatmentStatus\ TEXT NOT NULL DEFAULT 'Treated',
 \location\ TEXT,
 \quality\ TEXT NOT NULL DEFAULT 'verified',
 \notes\ TEXT,
 \createdAt\ TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

 CONSTRAINT \Sample_pkey\ PRIMARY KEY (\id\)
);

-- CreateTable
CREATE TABLE \Report\ (
 \id\ TEXT NOT NULL,
 \utilityId\ TEXT,
 \reporterName\ TEXT,
 \reporterEmail\ TEXT,
 \zipCode\ TEXT NOT NULL,
 \city\ TEXT,
 \state\ TEXT,
 \title\ TEXT NOT NULL,
 \description\ TEXT NOT NULL,
 \contaminant\ TEXT,
 \appearance\ TEXT,
 \severity\ TEXT NOT NULL DEFAULT 'info',
 \status\ TEXT NOT NULL DEFAULT 'pending',
 \createdAt\ TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

 CONSTRAINT \Report_pkey\ PRIMARY KEY (\id\)
);

-- CreateTable
CREATE TABLE \Donation\ (
 \id\ TEXT NOT NULL,
 \amount\ DOUBLE PRECISION NOT NULL,
 \currency\ TEXT NOT NULL DEFAULT 'usd',
 \name\ TEXT,
 \email\ TEXT,
 \message\ TEXT,
 \public\ BOOLEAN NOT NULL DEFAULT true,
 \stripePaymentIntentId\ TEXT,
 \createdAt\ TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

 CONSTRAINT \Donation_pkey\ PRIMARY KEY (\id\)
);

-- CreateTable
CREATE TABLE \Volunteer\ (
 \id\ TEXT NOT NULL,
 \name\ TEXT NOT NULL,
 \email\ TEXT NOT NULL,
 \phone\ TEXT,
 \city\ TEXT,
 \state\ TEXT,
 \interests\ TEXT NOT NULL DEFAULT '[]',
 \hoursPerWeek\ TEXT,
 \notes\ TEXT,
 \createdAt\ TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

 CONSTRAINT \Volunteer_pkey\ PRIMARY KEY (\id\)
);

-- CreateTable
CREATE TABLE \AlertSubscription\ (
 \id\ TEXT NOT NULL,
 \email\ TEXT NOT NULL,
 \utilityId\ TEXT NOT NULL,
 \threshold\ TEXT NOT NULL DEFAULT 'any',
 \verified\ BOOLEAN NOT NULL DEFAULT false,
 \createdAt\ TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

 CONSTRAINT \AlertSubscription_pkey\ PRIMARY KEY (\id\)
);

-- CreateTable
CREATE TABLE \Session\ (
 \id\ TEXT NOT NULL,
 \userId\ TEXT NOT NULL,
 \token\ TEXT NOT NULL,
 \expiresAt\ TIMESTAMP(3) NOT NULL,
 \createdAt\ TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

 CONSTRAINT \Session_pkey\ PRIMARY KEY (\id\)
);

-- CreateTable
CREATE TABLE \Chapter\ (
 \id\ TEXT NOT NULL,
 \name\ TEXT NOT NULL,
 \chapterName\ TEXT NOT NULL,
 \email\ TEXT NOT NULL,
 \city\ TEXT NOT NULL,
 \state\ TEXT NOT NULL,
 \status\ TEXT NOT NULL DEFAULT 'pending',
 \memberCount\ INTEGER NOT NULL DEFAULT 1,
 \notes\ TEXT,
 \createdAt\ TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

 CONSTRAINT \Chapter_pkey\ PRIMARY KEY (\id\)
);

-- CreateIndex
CREATE UNIQUE INDEX \User_email_key\ ON \User\(\email\);
CREATE UNIQUE INDEX \Utility_pwsid_key\ ON \Utility\(\pwsid\);
CREATE UNIQUE INDEX \Contaminant_slug_key\ ON \Contaminant\(\slug\);
CREATE INDEX \Sample_utilityId_idx\ ON \Sample\(\utilityId\);
CREATE INDEX \Sample_contaminantId_idx\ ON \Sample\(\contaminantId\);
CREATE INDEX \Sample_sampleDate_idx\ ON \Sample\(\sampleDate\);
CREATE INDEX \Sample_quality_idx\ ON \Sample\(\quality\);
CREATE INDEX \Report_utilityId_idx\ ON \Report\(\utilityId\);
CREATE INDEX \Report_zipCode_idx\ ON \Report\(\zipCode\);
CREATE INDEX \Report_status_idx\ ON \Report\(\status\);
CREATE UNIQUE INDEX \Volunteer_email_key\ ON \Volunteer\(\email\);
CREATE INDEX \AlertSubscription_utilityId_idx\ ON \AlertSubscription\(\utilityId\);
CREATE UNIQUE INDEX \AlertSubscription_email_utilityId_key\ ON \AlertSubscription\(\email\, \utilityId\);
CREATE UNIQUE INDEX \Session_token_key\ ON \Session\(\token\);
CREATE INDEX \Session_userId_idx\ ON \Session\(\userId\);
CREATE UNIQUE INDEX \Chapter_chapterName_key\ ON \Chapter\(\chapterName\);
CREATE UNIQUE INDEX \Chapter_email_key\ ON \Chapter\(\email\);

-- AddForeignKey
ALTER TABLE \Sample\ ADD CONSTRAINT \Sample_utilityId_fkey\ FOREIGN KEY (\utilityId\) REFERENCES \Utility\(\id\) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE \Sample\ ADD CONSTRAINT \Sample_contaminantId_fkey\ FOREIGN KEY (\contaminantId\) REFERENCES \Contaminant\(\id\) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE \Report\ ADD CONSTRAINT \Report_utilityId_fkey\ FOREIGN KEY (\utilityId\) REFERENCES \Utility\(\id\) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE \AlertSubscription\ ADD CONSTRAINT \AlertSubscription_utilityId_fkey\ FOREIGN KEY (\utilityId\) REFERENCES \Utility\(\id\) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE \Session\ ADD CONSTRAINT \Session_userId_fkey\ FOREIGN KEY (\userId\) REFERENCES \User\(\id\) ON DELETE CASCADE ON UPDATE CASCADE;
