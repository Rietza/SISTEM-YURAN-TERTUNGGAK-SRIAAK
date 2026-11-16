// SRIAAKL - Auth API
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createHash } from 'crypto'
import { Prisma } from '@prisma/client'

function hash(p: string) {
  return createHash('sha256').update(p).digest('hex')
}

// Friendly error untuk masalah pangkalan data biasa di Vercel
function databaseErrorHandler(e: any) {
  const msg = e?.message || ''
  // Prisma P1014 - schema not found
  if (e instanceof Prisma.PrismaClientInitializationError || msg.includes('Environment variable not found') || msg.includes('DATABASE_URL')) {
    return NextResponse.json({
      ralat: 'Pangkalan data belum dikonfigurasi. Sila set DATABASE_URL dalam Vercel Environment Variables.',
      arahan: [
        '1. Pergi ke Vercel Dashboard → Project → Settings → Environment Variables',
        '2. Tambah variable: Key=DATABASE_URL, Value=postgresql://postgres:PASSWORD@HOST:5432/postgres',
        '3. Tick semua environments: Production, Preview, Development',
        '4. Save dan Redeploy',
        '5. Pastikan Supabase project anda aktif (tidak paused)',
      ],
      debug: {
        DATABASE_URL_set: !!process.env.DATABASE_URL,
        NODE_ENV: process.env.NODE_ENV,
        error_type: e?.constructor?.name || 'Unknown',
      },
    }, { status: 503 })
  }
  // Prisma connection errors
  if (msg.includes("Can't reach database server") || msg.includes('Connection refused') || msg.includes('Timed out')) {
    return NextResponse.json({
      ralat: 'Tidak dapat sambung ke pangkalan data. Pastikan Supabase project aktif dan connection string betul.',
      debug: {
        DATABASE_URL_set: !!process.env.DATABASE_URL,
        NODE_ENV: process.env.NODE_ENV,
        error: msg.substring(0, 200),
      },
    }, { status: 502 })
  }
  // Table doesn't exist
  if (msg.includes('does not exist') || msg.includes('relation') && msg.includes('not found')) {
    return NextResponse.json({
      ralat: 'Jadual pangkalan data belum diwujudkan. Jalankan: bun run db:push',
      debug: { error: msg.substring(0, 200) },
    }, { status: 503 })
  }
  // Generic fallback
  return NextResponse.json({
    ralat: 'Ralat pangkalan data',
    debug: {
      DATABASE_URL_set: !!process.env.DATABASE_URL,
      NODE_ENV: process.env.NODE_ENV,
      error: msg.substring(0, 300),
    },
  }, { status: 500 })
}

export async function POST(req: NextRequest) {
  try {
    // Pre-check: DATABASE_URL must be set
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        ralat: 'DATABASE_URL tidak dijumpai dalam environment.',
        arahan: [
          '1. Vercel: Project Settings → Environment Variables',
          '2. Add Key: DATABASE_URL',
          '3. Value: postgresql://postgres:PASSWORD@HOST:5432/postgres',
          '4. Tick Production + Preview + Development',
          '5. Save + Redeploy',
        ],
      }, { status: 503 })
    }

    const { emel, kataLaluan } = await req.json()
    if (!emel || !kataLaluan) {
      return NextResponse.json({ ralat: 'Emel dan kata laluan diperlukan' }, { status: 400 })
    }
    const pengguna = await db.pengguna.findUnique({
      where: { emel: emel.toLowerCase() },
    })
    if (!pengguna || !pengguna.aktif) {
      return NextResponse.json({ ralat: 'Pengguna tidak dijumpai atau tidak aktif' }, { status: 401 })
    }
    if (pengguna.kataLaluanHash !== hash(kataLaluan)) {
      return NextResponse.json({ ralat: 'Kata laluan salah' }, { status: 401 })
    }
    await db.logAudit.create({
      data: {
        penggunaId: pengguna.id,
        tindakan: 'LOG_MASUK',
        entiti: 'PENGGUNA',
        butiran: `${pengguna.nama} log masuk`,
      },
    })
    return NextResponse.json({
      pengguna: {
        id: pengguna.id,
        nama: pengguna.nama,
        emel: pengguna.emel,
        peranan: pengguna.peranan,
      },
      token: Buffer.from(`${pengguna.id}:${Date.now()}`).toString('base64'),
    })
  } catch (e: any) {
    console.error('Login error:', e)
    return databaseErrorHandler(e)
  }
}
