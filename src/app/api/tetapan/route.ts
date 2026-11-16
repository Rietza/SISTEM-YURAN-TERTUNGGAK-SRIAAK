// SRIAAKL - Tetapan API (settings + risk weights + fee structure)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const tetapan = await db.tetapan.findMany()
  const yuran = await db.strukturYuran.findMany({ orderBy: [{ tahun: 'asc' }, { tahunDarjah: 'asc' }] })
  const pengguna = await db.pengguna.findMany({
    select: { id: true, nama: true, emel: true, peranan: true, aktif: true },
    orderBy: { nama: 'asc' },
  })
  return NextResponse.json({
    tetapan: tetapan.reduce((acc, t) => { acc[t.kunci] = t.nilai; return acc }, {} as Record<string, string>),
    yuran,
    pengguna,
  })
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { tetapan, yuran } = body

    if (tetapan) {
      for (const [kunci, nilai] of Object.entries(tetapan)) {
        await db.tetapan.upsert({
          where: { kunci },
          update: { nilai: String(nilai) },
          create: { kunci, nilai: String(nilai) },
        })
      }
    }

    if (yuran && Array.isArray(yuran)) {
      for (const y of yuran) {
        if (y.id) {
          await db.strukturYuran.update({
            where: { id: y.id },
            data: {
              jumlahBulanan: y.jumlahBulanan,
              hariAkhirBayar: y.hariAkhirBayar,
            },
          })
        } else {
          await db.strukturYuran.create({ data: y })
        }
      }
    }

    return NextResponse.json({ berjaya: true })
  } catch (e: any) {
    return NextResponse.json({ ralat: e.message }, { status: 500 })
  }
}
