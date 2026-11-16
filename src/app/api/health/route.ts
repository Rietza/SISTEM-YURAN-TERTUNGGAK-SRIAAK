// SRIAAKL - Health/Diagnostic API
// GET /api/health - checks if DATABASE_URL is set and DB is reachable
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    node_env: process.env.NODE_ENV,
    database_url_set: !!process.env.DATABASE_URL,
    database_url_protocol: process.env.DATABASE_URL
      ? process.env.DATABASE_URL.split('://')[0]
      : null,
    database_url_host: process.env.DATABASE_URL
      ? (() => {
          try {
            const u = new URL(process.env.DATABASE_URL)
            return u.hostname
          } catch { return 'invalid-url' }
        })()
      : null,
  }

  // If DATABASE_URL not set, return setup instructions
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      status: 'ERROR',
      message: 'DATABASE_URL tidak dijumpai dalam environment',
      diagnostics,
      arahan_setup: [
        '═══ DI VERCEL ═══',
        '1. Pergi ke https://vercel.com/dashboard',
        '2. Pilih project SRIAAKL anda',
        '3. Settings → Environment Variables',
        '4. Klik "Add New"',
        '5. Key: DATABASE_URL',
        '6. Value: postgresql://postgres:Riezamahmood1211@db.bcovngbahyygvlcgctoc.supabase.co:5432/postgres',
        '7. Environments: tick Production + Preview + Development',
        '8. Save',
        '9. Deployments → Redeploy (atau push ke GitHub untuk auto-deploy)',
        '',
        '═══ DI TEMPATAN ═══',
        '1. cp .env.example .env',
        '2. Edit .env dengan DATABASE_URL yang betul',
        '3. Restart: bun run dev',
      ],
    }, { status: 503 })
  }

  // Test DB connection
  try {
    // Simple query to test connection
    const result = await db.$queryRaw`SELECT 1 as test`
    const userCount = await db.pengguna.count()

    return NextResponse.json({
      status: 'OK',
      message: 'Pangkalan data berfungsi',
      diagnostics: {
        ...diagnostics,
        db_connected: true,
        bil_pengguna: userCount,
      },
      akaun_demo_tersedia: userCount > 0,
    })
  } catch (e: any) {
    return NextResponse.json({
      status: 'DB_ERROR',
      message: 'DATABASE_URL diset tetapi pangkalan data tidak dapat dicapai',
      diagnostics: {
        ...diagnostics,
        db_connected: false,
        error: e.message?.substring(0, 300),
        error_code: e.code || e.errorCode,
      },
      kemungkinan_punca: [
        '1. Supabase project mungkin PAUSED - unpause di dashboard',
        '2. Connection string salah - semak format: postgresql://user:pass@host:port/db',
        '3. Network firewall blok port 5432/6543',
        '4. Jadual belum diwujudkan - jalankan: bun run db:push',
      ],
    }, { status: 502 })
  }
}
