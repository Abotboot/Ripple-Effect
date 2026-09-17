import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../../src/lib/auth'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.ADMIN_EMAIL || process.argv[2]
  const password = process.env.ADMIN_PASSWORD || process.argv[3]
  const name = process.env.ADMIN_NAME || process.argv[4] || 'A Ripple Effect Admin'

  if (!email || !password) {
    console.error('Usage: ts-node scripts/maintenance/create-admin.ts <email> <password> [name]')
    console.error('Or set ADMIN_EMAIL and ADMIN_PASSWORD environment variables.')
    process.exit(1)
  }

  if (password.length < 8) {
    console.error('Error: Password must be at least 8 characters.')
    process.exit(1)
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashPassword(password),
      name,
      role: 'admin',
    },
    create: {
      email,
      name,
      password: hashPassword(password),
      role: 'admin',
    },
  })

  console.log(`[maintenance] Admin user created/updated successfully: ${user.email} (ID: ${user.id})`)
}

main()
  .catch((err) => {
    console.error('[maintenance] Failed to create admin:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
