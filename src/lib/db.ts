import { PrismaClient } from '@prisma/client'

// Friendly error if DATABASE_URL is missing
if (!process.env.DATABASE_URL) {
  console.error(`
╔══════════════════════════════════════════════════════════════════╗
║  RALAT: DATABASE_URL tidak dijumpai dalam .env                    ║
╠══════════════════════════════════════════════════════════════════╣
║  Cara betulkan:                                                   ║
║                                                                   ║
║  1. Salin .env.example ke .env:                                   ║
║     cp .env.example .env                                          ║
║                                                                   ║
║  2. Untuk SQLite (tempatan - paling mudah):                       ║
║     DATABASE_URL="file:./db/custom.db"                            ║
║                                                                   ║
║  3. Untuk Supabase PostgreSQL:                                    ║
║     DATABASE_URL="postgresql://postgres:PASSWORD@HOST:5432/postgres"
║                                                                   ║
║  4. Push schema ke database:                                      ║
║     bun run db:push                                               ║
║                                                                   ║
║  5. Jana data dummy:                                              ║
║     bun run prisma/seed.ts                                        ║
║                                                                   ║
║  6. Mulakan semula dev server:                                    ║
║     bun run dev                                                   ║
╚══════════════════════════════════════════════════════════════════╝
`)
}

// Fallback to local SQLite if DATABASE_URL not set (clone & jalankan)
const databaseUrl = process.env.DATABASE_URL || 'file:./db/custom.db'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
    datasourceUrl: databaseUrl,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db