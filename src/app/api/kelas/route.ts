// SRIAAKL - Kelas API
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const kelas = await db.kelas.findMany({
    include: { guruKelas: true, _count: { select: { murid: true } } },
    orderBy: [{ tahunDarjah: 'asc' }, { namaKelas: 'asc' }],
  })
  return NextResponse.json({
    kelas: kelas.map(k => ({
      id: k.id,
      namaKelas: k.namaKelas,
      tahunDarjah: k.tahunDarjah,
      guruKelas: k.guruKelas?.nama ?? '-',
      bilMurid: k._count.murid,
    })),
  })
}
