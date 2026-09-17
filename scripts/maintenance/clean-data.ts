import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Explicit maintenance cleanup tool.
 * Requires explicit manifest or confirmation flags.
 * Usage:
 *   Dry run: bun scripts/maintenance/clean-data.ts --dry-run
 *   Apply:   bun scripts/maintenance/clean-data.ts --apply
 */
async function main() {
  const isApply = process.argv.includes('--apply')
  const isDryRun = process.argv.includes('--dry-run') || !isApply

  console.log(`[clean-data] Mode: ${isApply ? 'APPLY' : 'DRY RUN'}`)

  // Identify legacy demo records
  const [donations, reports, chapters] = await Promise.all([
    prisma.donation.findMany({
      where: {
        OR: [
          { email: { in: ['jordan@example.com', 'hello@greenearth.example'] } },
          { name: { in: ['Green Earth Co.', 'Jordan Lee'] } },
        ],
      },
      select: { id: true, name: true, email: true, amount: true },
    }),
    prisma.report.findMany({
      where: {
        OR: [
          { reporterName: { in: ['Maria G.', 'James R.', 'Priya K.'] } },
          { title: { in: ['Water tastes great', 'Strong chlorine taste'] }, reporterName: 'Anonymous' },
        ],
      },
      select: { id: true, title: true, reporterName: true, zipCode: true },
    }),
    prisma.chapter.findMany({
      where: {
        email: { in: ['dev.sharma@example.edu', 'aisha.khan@example.org', 'marco.reyes@example.edu'] },
      },
      select: { id: true, name: true, chapterName: true, email: true },
    }),
  ])

  console.log(`[clean-data] Matched candidate records:`)
  console.log(`  - Donations: ${donations.length}`)
  console.log(`  - Community Reports: ${reports.length}`)
  console.log(`  - Chapters: ${chapters.length}`)

  if (isDryRun) {
    console.log('[clean-data] Dry run complete. Pass --apply to execute cleanup.')
    return
  }

  // Execute deletion only on explicit --apply
  const [deletedDonations, deletedReports, deletedChapters] = await Promise.all([
    prisma.donation.deleteMany({ where: { id: { in: donations.map(d => d.id) } } }),
    prisma.report.deleteMany({ where: { id: { in: reports.map(r => r.id) } } }),
    prisma.chapter.deleteMany({ where: { id: { in: chapters.map(c => c.id) } } }),
  ])

  console.log(`[clean-data] Cleanup applied:`)
  console.log(`  - Deleted donations: ${deletedDonations.count}`)
  console.log(`  - Deleted reports: ${deletedReports.count}`)
  console.log(`  - Deleted chapters: ${deletedChapters.count}`)
}

main()
  .catch((err) => {
    console.error('[clean-data] Execution error:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
