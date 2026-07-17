// Database seed script for A Ripples Effect
// Run with: bun run db:seed
import { db } from '../src/lib/db'
import { hashPassword } from '../src/lib/auth'

async function main() {
  console.log('🌱 Seeding A Ripples Effect database...')

  // ── Admin user ────────────────────────────────────────────────────────
  // Strong default password — change immediately after first login.
  // Credentials: admin@arippleseffect.org / Ripples#2026!Secure
  await db.user.upsert({
    where: { email: 'admin@arippleseffect.org' },
    update: {},
    create: {
      email: 'admin@arippleseffect.org',
      name: 'A Ripples Effect Admin',
      password: hashPassword('Ripples#2026!Secure'),
      role: 'admin',
    },
  })

  // ── Contaminants ──────────────────────────────────────────────────────
  const contaminants = [
    {
      slug: 'microplastics',
      name: 'Microplastics',
      chemicalName: 'Polymer fragments < 5mm',
      category: 'Microplastic',
      legalLimit: null,
      legalLimitUnit: null,
      healthGuideline: 0,
      healthGuidelineUnit: 'particles/L',
      ewgHealthLimit: 0,
      description:
        'Tiny plastic particles less than 5 millimeters in size. Found in drinking water worldwide. Currently unregulated in the United States despite growing health concerns.',
      healthEffects:
        'Emerging research links microplastic ingestion to inflammation, endocrine disruption, and cellular damage. Particle size determines whether they cross the gut and lung barriers.',
      sources:
        'Plastic packaging, synthetic textiles, tire wear, breakdown of larger plastic debris, water treatment processes that cannot filter sub-micron particles.',
      regulated: false,
    },
    {
      slug: 'lead',
      name: 'Lead',
      chemicalName: 'Pb',
      category: 'Metal',
      legalLimit: 15,
      legalLimitUnit: 'ppb',
      healthGuideline: 0.2,
      healthGuidelineUnit: 'ppb',
      ewgHealthLimit: 0.2,
      description:
        'A neurotoxic heavy metal that enters drinking water primarily through corrosion of plumbing materials.',
      healthEffects:
        'Especially harmful to children - causes irreversible neurological damage, lowered IQ, behavioral problems, and anemia. No safe level of exposure exists.',
      sources: 'Lead service lines, brass fixtures, lead solder in plumbing, galvanized pipes.',
      regulated: true,
    },
    {
      slug: 'arsenic',
      name: 'Arsenic',
      chemicalName: 'As',
      category: 'Metal',
      legalLimit: 10,
      legalLimitUnit: 'ppb',
      healthGuideline: 0.004,
      healthGuidelineUnit: 'ppb',
      ewgHealthLimit: 0.004,
      description:
        'A naturally occurring element widely distributed in the Earth\'s crust. The EPA-classified human carcinogen.',
      healthEffects:
        'Long-term exposure causes skin, bladder, and lung cancer. Also linked to cardiovascular disease, diabetes, and reduced cognitive function in children.',
      sources: 'Natural deposits in bedrock, industrial runoff, agricultural pesticides, smelting.',
      regulated: true,
    },
    {
      slug: 'pfoa',
      name: 'PFOA (Perfluorooctanoic acid)',
      chemicalName: 'C8HF15O2',
      category: 'PFAS',
      legalLimit: 4,
      legalLimitUnit: 'ppt',
      healthGuideline: 0.1,
      healthGuidelineUnit: 'ppt',
      ewgHealthLimit: 0.1,
      description:
        'A "forever chemical" in the PFAS family. Does not break down in the environment or human body.',
      healthEffects:
        'Linked to kidney and testicular cancer, thyroid disease, immune suppression, pregnancy-induced hypertension, and low birth weight.',
      sources:
        'Industrial discharges, firefighting foam (AFFF), stain-resistant carpets, non-stick cookware manufacturing, waterproof textiles.',
      regulated: true,
    },
    {
      slug: 'pfos',
      name: 'PFOS (Perfluorooctane sulfonate)',
      chemicalName: 'C8HF17SO3',
      category: 'PFAS',
      legalLimit: 4,
      legalLimitUnit: 'ppt',
      healthGuideline: 0.1,
      healthGuidelineUnit: 'ppt',
      ewgHealthLimit: 0.1,
      description: 'A persistent PFAS compound used in fire-fighting foams and stain repellents.',
      healthEffects:
        'Associated with liver damage, immune effects, thyroid disruption, and decreased fertility.',
      sources: 'Aqueous film-forming foams (AFFF), textile treatments, paper coatings, chrome plating.',
      regulated: true,
    },
    {
      slug: 'thm',
      name: 'Total Trihalomethanes (TTHM)',
      chemicalName: 'CHCl3 + CHBrCl2 + CHBr2Cl + CHBr3',
      category: 'Disinfection Byproduct',
      legalLimit: 80,
      legalLimitUnit: 'ppb',
      healthGuideline: 0.15,
      healthGuidelineUnit: 'ppb',
      ewgHealthLimit: 0.15,
      description:
        'Formed when chlorine disinfectant reacts with natural organic matter in source water.',
      healthEffects:
        'Increased cancer risk (especially bladder cancer), potential reproductive and developmental issues.',
      sources: 'Chlorination of water containing organic matter; levels rise during warm seasons.',
      regulated: true,
    },
    {
      slug: 'hAA5',
      name: 'Haloacetic Acids (HAA5)',
      chemicalName: '5 haloacetic acid species',
      category: 'Disinfection Byproduct',
      legalLimit: 60,
      legalLimitUnit: 'ppb',
      healthGuideline: 0.1,
      healthGuidelineUnit: 'ppb',
      ewgHealthLimit: 0.1,
      description: 'A group of five haloacetic acid compounds formed as disinfection byproducts.',
      healthEffects: 'Linked to cancer and potential developmental harm during pregnancy.',
      sources: 'Chlorination and chloramination disinfection processes.',
      regulated: true,
    },
    {
      slug: 'chromium6',
      name: 'Chromium-6 (Hexavalent Chromium)',
      chemicalName: 'Cr(VI)',
      category: 'Metal',
      legalLimit: 100,
      legalLimitUnit: 'ppb',
      healthGuideline: 0.02,
      healthGuidelineUnit: 'ppb',
      ewgHealthLimit: 0.02,
      description:
        'The cancer-causing chemical made famous by the film "Erin Brockovich." Regulated only as total chromium.',
      healthEffects:
        'Known human carcinogen when inhaled; linked to stomach and intestinal cancer when ingested.',
      sources:
        'Industrial discharge from steel and pulp mills, electroplating, leather tanning, natural erosion.',
      regulated: true,
    },
    {
      slug: 'nitrate',
      name: 'Nitrate',
      chemicalName: 'NO3-',
      category: 'Agricultural',
      legalLimit: 10,
      legalLimitUnit: 'ppm',
      healthGuideline: 0.14,
      healthGuidelineUnit: 'ppm',
      ewgHealthLimit: 0.14,
      description:
        'A nitrogen compound that enters water from fertilizer runoff and septic systems.',
      healthEffects:
        'Infants under 6 months can develop methemoglobinemia ("blue baby syndrome"), which can be fatal.',
      sources: 'Synthetic fertilizer, manure, septic systems, sewage, atmospheric deposition.',
      regulated: true,
    },
    {
      slug: 'atrazine',
      name: 'Atrazine',
      chemicalName: 'C8H14ClN5',
      category: 'Pesticide',
      legalLimit: 3,
      legalLimitUnit: 'ppb',
      healthGuideline: 0.15,
      healthGuidelineUnit: 'ppb',
      ewgHealthLimit: 0.15,
      description:
        'One of the most widely used agricultural herbicides in the United States, banned in the EU.',
      healthEffects:
        'Endocrine disruptor that alters hormone levels; linked to reproductive harm and birth defects.',
      sources: 'Corn and sugarcane herbicide runoff.',
      regulated: true,
    },
    {
      slug: 'uranium',
      name: 'Uranium',
      chemicalName: 'U',
      category: 'Radioactive',
      legalLimit: 30,
      legalLimitUnit: 'ppb',
      healthGuideline: 0.43,
      healthGuidelineUnit: 'ppb',
      ewgHealthLimit: 0.43,
      description: 'A naturally occurring radioactive element found in some groundwater.',
      healthEffects:
        'Kidney toxicity and elevated cancer risk from long-term alpha radiation exposure.',
      sources: 'Natural uranium-bearing rocks and minerals; mining and milling wastes.',
      regulated: true,
    },
    {
      slug: 'chlorine',
      name: 'Chlorine (Free)',
      chemicalName: 'Cl2',
      category: 'Disinfectant',
      legalLimit: 4,
      legalLimitUnit: 'ppm',
      healthGuideline: 0.4,
      healthGuidelineUnit: 'ppm',
      ewgHealthLimit: 0.4,
      description: 'Most common drinking water disinfectant in the United States.',
      healthEffects:
        'Can react with organic matter to form disinfection byproducts; some people are sensitive to chlorine taste and odor.',
      sources: 'Added at water treatment plants for pathogen control.',
      regulated: true,
    },
  ]

  for (const c of contaminants) {
    await db.contaminant.upsert({
      where: { slug: c.slug },
      update: c,
      create: c,
    })
  }
  console.log(`✓ Seeded ${contaminants.length} contaminants`)

  // ── Utilities (real-ish US systems) ───────────────────────────────────
  const utilities = [
    {
      pwsid: 'IL0316040',
      name: 'City of Chicago Department of Water Management',
      city: 'Chicago',
      state: 'IL',
      zipCodes: '60601,60602,60603,60604,60605,60606,60607,60608,60609,60610,60611,60612,60613,60614,60615,60616,60617,60618,60619,60620',
      county: 'Cook',
      population: 2716000,
      systemType: 'Community',
      sourceType: 'Surface',
      treatmentStatus: 'Treated',
      latitude: 41.8781,
      longitude: -87.6298,
      website: 'https://www.chicago.gov/city/en/depts/water.html',
      notes: 'Draws from Lake Michigan, one of the largest surface water systems in the US.',
    },
    {
      pwsid: 'NY7003493',
      name: 'New York City Department of Environmental Protection',
      city: 'New York',
      state: 'NY',
      zipCodes: '10001,10002,10003,10004,10005,10011,10012,10013,10021,10024,10025,10036',
      county: 'New York',
      population: 8336000,
      systemType: 'Community',
      sourceType: 'Surface',
      treatmentStatus: 'Treated',
      latitude: 40.7128,
      longitude: -74.006,
      website: 'https://www.nyc.gov/site/dep/index.page',
      notes: 'Sources: Catskill/Delaware and Croton watersheds. Mostly unfiltered, UV + chlorine disinfection.',
    },
    {
      pwsid: 'CA1910052',
      name: 'Los Angeles Department of Water and Power',
      city: 'Los Angeles',
      state: 'CA',
      zipCodes: '90001,90002,90003,90004,90005,90006,90007,90008,90011,90012,90013,90015,90017,90019,90020,90024,90026,90028,90042,90048',
      county: 'Los Angeles',
      population: 3902000,
      systemType: 'Community',
      sourceType: 'Mixed',
      treatmentStatus: 'Treated',
      latitude: 34.0522,
      longitude: -118.2437,
      website: 'https://www.ladwp.com',
      notes: 'Sources: LA Aqueduct (Owens Valley), California Aqueduct, Colorado River Aqueduct, local groundwater.',
    },
    {
      pwsid: 'TX1010337',
      name: 'City of Houston Public Works',
      city: 'Houston',
      state: 'TX',
      zipCodes: '77001,77002,77003,77004,77005,77006,77007,77008,77009,77010,77011,77012,77013,77014,77015,77016,77018,77019,77020,77021',
      county: 'Harris',
      population: 2303000,
      systemType: 'Community',
      sourceType: 'Surface',
      treatmentStatus: 'Treated',
      latitude: 29.7604,
      longitude: -95.3698,
      website: 'https://www.publicworks.houstontx.gov',
      notes: 'Sources: Lake Houston, Lake Conroe, Trinity River.',
    },
    {
      pwsid: 'AZ0413027',
      name: 'City of Phoenix Water Services Department',
      city: 'Phoenix',
      state: 'AZ',
      zipCodes: '85001,85002,85003,85004,85006,85007,85008,85009,85012,85013,85014,85015,85016,85017,85018,85019,85020,85021,85022,85023',
      county: 'Maricopa',
      population: 1626000,
      systemType: 'Community',
      sourceType: 'Mixed',
      treatmentStatus: 'Treated',
      latitude: 33.4484,
      longitude: -112.074,
      website: 'https://www.phoenix.gov/waterservices',
      notes: 'Sources: Salt River Project, Colorado River (via CAP), and groundwater.',
    },
    {
      pwsid: 'PA1510001',
      name: 'Philadelphia Water Department',
      city: 'Philadelphia',
      state: 'PA',
      zipCodes: '19102,19103,19104,19106,19107,19111,19114,19115,19116,19118,19119,19120,19121,19122,19123,19124,19125,19127,19128,19129',
      county: 'Philadelphia',
      population: 1574000,
      systemType: 'Community',
      sourceType: 'Surface',
      treatmentStatus: 'Treated',
      latitude: 39.9526,
      longitude: -75.1652,
      website: 'https://www.phila.gov/water',
      notes: 'Sources: Schuylkill and Delaware Rivers.',
    },
    {
      pwsid: 'FL6020055',
      name: 'Miami-Dade Water and Sewer Department',
      city: 'Miami',
      state: 'FL',
      zipCodes: '33101,33109,33110,33124,33125,33126,33127,33128,33129,33130,33131,3idence32,3idence33,33134,33135,33136,33137,3idence38,3idence39,3idence40',
      county: 'Miami-Dade',
      population: 2356000,
      systemType: 'Community',
      sourceType: 'Ground',
      treatmentStatus: 'Treated',
      latitude: 25.7617,
      longitude: -80.1918,
      website: 'https://www.miamidade.gov/water',
      notes: 'Sources: Biscayne Aquifer (groundwater).',
    },
    {
      pwsid: 'OH1800312',
      name: 'City of Columbus Division of Water',
      city: 'Columbus',
      state: 'OH',
      zipCodes: '43201,43202,43203,43204,43205,43206,43207,43209,43210,43211,43212,43213,43214,43215,43219,43220,43221,43222,43223,43224',
      county: 'Franklin',
      population: 898000,
      systemType: 'Community',
      sourceType: 'Surface',
      treatmentStatus: 'Treated',
      latitude: 39.9612,
      longitude: -82.9988,
      website: 'https://www.columbus.gov/utilities',
      notes: 'Sources: Scioto River and Big Walnut Creek.',
    },
    {
      pwsid: 'CA3610008',
      name: 'San Diego Water Department',
      city: 'San Diego',
      state: 'CA',
      zipCodes: '92101,92102,92103,92104,92105,92106,92107,92108,92109,92110,92111,92113,92114,92115,92116,92117,92119,92120,92121,92122',
      county: 'San Diego',
      population: 1386000,
      systemType: 'Community',
      sourceType: 'Mixed',
      treatmentStatus: 'Treated',
      latitude: 32.7157,
      longitude: -117.1611,
      website: 'https://www.sandiego.gov/public-utilities',
      notes: 'Sources: Imported (Colorado River, Northern CA) and local surface water.',
    },
    {
      pwsid: 'WA5376550',
      name: 'Seattle Public Utilities',
      city: 'Seattle',
      state: 'WA',
      zipCodes: '98101,98102,98103,98104,98105,98106,98107,98idence08,98109,98112,98115,98116,98117,98118,98119,98121,98122,98125,98126,98133',
      county: 'King',
      population: 753000,
      systemType: 'Community',
      sourceType: 'Surface',
      treatmentStatus: 'Treated',
      latitude: 47.6062,
      longitude: -122.3321,
      website: 'https://www.seattle.gov/utilities',
      notes: 'Sources: Cedar River and Tolt River watersheds.',
    },
    {
      pwsid: 'TX2200012',
      name: 'Fort Worth Water Department',
      city: 'Fort Worth',
      state: 'TX',
      zipCodes: '76137,76101,76102,76103,76104,76105,76106,76107,76108,76109,76110,76111,76112,76114,76115,76116,76117,76118,76119,76120',
      county: 'Tarrant',
      population: 950000,
      systemType: 'Community',
      sourceType: 'Surface',
      treatmentStatus: 'Treated',
      latitude: 32.7555,
      longitude: -97.3308,
      website: 'https://www.fortworthtexas.gov/departments/water',
      notes: 'Draws from Lake Worth, Eagle Mountain Lake, Lake Bridgeport, and Cedar Creek Reservoir.',
    },
  ]

  // Fix any stray typos in zip codes
  for (const u of utilities) {
    u.zipCodes = u.zipCodes.replace(/3idence/g, '331')
    u.zipCodes = u.zipCodes.replace(/98idence/g, '981')
  }

  const utilityIds: Record<string, string> = {}
  for (const u of utilities) {
    const created = await db.utility.upsert({
      where: { pwsid: u.pwsid },
      update: u,
      create: u,
    })
    utilityIds[u.pwsid] = created.id
  }
  console.log(`✓ Seeded ${utilities.length} utilities`)

  // ── Sample measurements ───────────────────────────────────────────────
  const contaminantsDb = await db.contaminant.findMany()
  const cBySlug = Object.fromEntries(contaminantsDb.map((c) => [c.slug, c]))

  // Helper: deterministic pseudo-random in range (so seed is reproducible)
  function rng(seed: number) {
    let s = seed
    return () => {
      s = (s * 9301 + 49297) % 233280
      return s / 233280
    }
  }
  const rand = rng(42)

  // For each utility x contaminant, generate 3-5 historical samples over ~3 years
  const samples: Array<{
    utilityId: string
    contaminantId: string
    level: number
    unit: string
    sampleDate: Date
    source: string
    treatmentStatus: string
    location: string
  }> = []

  const sourceOptions = ['Utility CCR', 'Research Lab', 'Citizen Test', 'EPA UCMR']
  const locationOptions = ['Treatment Plant Outflow', 'Distribution Tap', 'Reservoir', 'Source Water Intake']

  // Build level profiles per utility x contaminant - some elevated, some clean
  // Realistic-ish levels based on EWG data ranges
  function levelFor(pwsid: string, slug: string): number {
    const baseRanges: Record<string, [number, number]> = {
      microplastics: [0.5, 12],
      lead: [0.1, 12],
      arsenic: [0.1, 4],
      pfoa: [0.2, 8],
      pfos: [0.1, 6],
      thm: [5, 65],
      hAA5: [2, 35],
      chromium6: [0.03, 1.2],
      nitrate: [0.1, 4.5],
      atrazine: [0.02, 0.9],
      uranium: [0.1, 6],
      chlorine: [0.5, 2.5],
    }
    const r = baseRanges[slug] ?? [0.1, 1]
    // City-specific modifiers (Chicago surface water, Phoenix groundwater etc.)
    const mod =
      {
        IL0316040: 1.0, // Chicago - Lake Michigan - relatively clean
        NY7003493: 0.85, // NYC - protected watershed - very clean
        CA1910052: 1.2, // LA - imported water - higher DBPs
        TX1010337: 1.4, // Houston - agricultural runoff - higher nitrates/atrazine
        AZ0413027: 1.6, // Phoenix - groundwater - higher arsenic/uranium/cr6
        PA1510001: 1.1, // Philly - river source - moderate
        FL6020055: 1.3, // Miami - groundwater - higher contaminants
        OH1800312: 1.15, // Columbus - river source
        CA3610008: 1.25, // San Diego - imported
        WA5376550: 0.7, // Seattle - pristine mountain source - lowest
        TX2200012: 1.1, // Fort Worth
      }[pwsid] ?? 1
    const [lo, hi] = r
    return +(lo + rand() * (hi - lo) * mod).toFixed(3)
  }

  for (const u of utilities) {
    for (const c of contaminantsDb) {
      // Generate 4 samples per contaminant-utility pair (quarterly-ish over 3 years)
      const numSamples = 4
      for (let i = 0; i < numSamples; i++) {
        const monthsBack = 36 - i * 9 // most recent first... actually let's go forward
        const date = new Date()
        date.setMonth(date.getMonth() - (numSamples - 1 - i) * 9 - Math.floor(rand() * 2))
        const level = levelFor(u.pwsid, c.slug)
        samples.push({
          utilityId: utilityIds[u.pwsid],
          contaminantId: c.id,
          level,
          unit: c.legalLimitUnit || c.healthGuidelineUnit || 'ppb',
          sampleDate: date,
          source: sourceOptions[Math.floor(rand() * sourceOptions.length)],
          treatmentStatus: u.treatmentStatus,
          location:
            rand() < 0.5 ? 'Treatment Plant Outflow' : 'Distribution Tap',
        })
      }
    }
  }

  // Also create some "Untreated" / raw intake samples for microplastics comparison
  for (const u of utilities) {
    const mp = cBySlug['microplastics']
    const date = new Date()
    date.setMonth(date.getMonth() - 6)
    samples.push({
      utilityId: utilityIds[u.pwsid],
      contaminantId: mp.id,
      level: +(8 + rand() * 30).toFixed(2), // untreated source water typically higher
      unit: 'particles/L',
      sampleDate: date,
      source: 'Research Lab',
      treatmentStatus: 'Untreated',
      location: 'Source Water Intake',
    })
  }

  // Clear then bulk insert samples for idempotency
  await db.sample.deleteMany({})
  // Insert in batches to avoid SQLite variable limits
  for (let i = 0; i < samples.length; i += 100) {
    await db.sample.createMany({ data: samples.slice(i, i + 100) })
  }
  console.log(`✓ Seeded ${samples.length} sample measurements`)

  // ── Community reports ─────────────────────────────────────────────────
  await db.report.deleteMany({})
  const reports = [
    {
      utilityId: utilityIds['IL0316040'],
      reporterName: 'Maria G.',
      reporterEmail: null,
      zipCode: '60614',
      city: 'Chicago',
      state: 'IL',
      title: 'Cloudy water in Lincoln Park',
      description:
        'Tap water has been cloudy for the past 3 days. Settles after a minute but unusual for this area.',
      contaminant: 'Unknown',
      appearance: 'cloudy',
      severity: 'warning',
      status: 'reviewed',
    },
    {
      utilityId: utilityIds['CA1910052'],
      reporterName: 'Anonymous',
      reporterEmail: null,
      zipCode: '90026',
      city: 'Los Angeles',
      state: 'CA',
      title: 'Strong chlorine taste',
      description:
        'Water has a noticeably strong chlorine taste and smell this week. Filling a pitcher and letting it sit helps.',
      contaminant: 'Chlorine',
      appearance: 'odor',
      severity: 'info',
      status: 'pending',
    },
    {
      utilityId: utilityIds['TX1010337'],
      reporterName: 'James R.',
      reporterEmail: 'j***@example.com',
      zipCode: '77007',
      city: 'Houston',
      state: 'TX',
      title: 'Brown discoloration after storm',
      description:
        'After the heavy rains, water came out brown for several hours. Boil notice issued and lifted next day.',
      contaminant: 'Sediment',
      appearance: 'discolored',
      severity: 'critical',
      status: 'resolved',
    },
    {
      utilityId: utilityIds['AZ0413027'],
      reporterName: 'Priya K.',
      reporterEmail: null,
      zipCode: '85016',
      city: 'Phoenix',
      state: 'AZ',
      title: 'Concerned about microplastics',
      description:
        'Installed a countertop filter after reading about microplastics in tap water. Would love to see local testing data.',
      contaminant: 'Microplastics',
      appearance: 'normal',
      severity: 'info',
      status: 'pending',
    },
    {
      utilityId: utilityIds['WA5376550'],
      reporterName: 'Anonymous',
      reporterEmail: null,
      zipCode: '98103',
      city: 'Seattle',
      state: 'WA',
      title: 'Water tastes great',
      description: 'Seattle tap water has always tasted clean to me. Sharing a positive report!',
      contaminant: null,
      appearance: 'normal',
      severity: 'info',
      status: 'reviewed',
    },
  ]
  await db.report.createMany({ data: reports })
  console.log(`✓ Seeded ${reports.length} community reports`)

  console.log('\n✅ Seed complete.')
  console.log('   Admin login: admin@arippleseffect.org / Ripples#2026!Secure')
  console.log('   ⚠️  Change this password immediately after first login.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
