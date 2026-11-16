import { PrismaClient } from '@prisma/client'

// Validate DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error(`
╔══════════════════════════════════════════════════════════════════╗
║  RALAT: DATABASE_URL tidak dijumpai dalam environment            ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  Di Vercel: Project Settings → Environment Variables → Add        ║
║    Key: DATABASE_URL                                              ║
║    Value: postgresql://postgres:PASSWORD@HOST:5432/postgres       ║
║                                                                   ║
║  Di tempatan: salin .env.example ke .env                          ║
║    cp .env.example .env                                           ║
║                                                                   ║
║  SQLite (untuk dev tempatan sahaja, TIDAK untuk Vercel):          ║
║    DATABASE_URL="file:./db/custom.db"                             ║
║    cp prisma/schema.sqlite.prisma prisma/schema.prisma            ║
║                                                                   ║
║  Supabase PostgreSQL (untuk Vercel/production):                   ║
║    DATABASE_URL="postgresql://postgres.XXX:PASS@HOST:5432/postgres"
║                                                                   ║
╚══════════════════════════════════════════════════════════════════╝
`)
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Prisma client singleton - reuse across hot reloads
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db