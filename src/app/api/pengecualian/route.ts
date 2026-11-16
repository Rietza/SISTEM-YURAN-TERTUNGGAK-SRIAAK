// SRIAAKL - Pengecualian API
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const muridId = searchParams.get('muridId')
  const where: any = muridId ? { muridId } : {}
  const data = await db.pengecualian.findMany({
    where,
    include: { murid: { include: { kelas: true } }, diluluskanOleh: true },
    orderBy: { tarikhCipta: 'desc' },
  })
  return NextResponse.json({
    pengecualian: data.map(p => ({
      id: p.id,
      muridId: p.muridId,
      namaMurid: p.murid.nama,
      kelas: p.murid.kelas.namaKelas,
      jenis: p.jenis,
      jumlah: p.jumlah,
      sebab: p.sebab,
      diluluskanOleh: p.diluluskanOleh?.nama ?? '-',
      tarikhCipta: p.tarikhCipta,
    })),
  })
}

export async function POST(req: NextRequest) {
  try {
    const { muridId, jenis, jumlah, sebab, diluluskanOlehId } = await req.json()
    if (!muridId || !jenis || jumlah === undefined || !sebab) {
      return NextResponse.json({ ralat: 'muridId, jenis, jumlah, sebab diperlukan' }, { status: 400 })
    }
    const p = await db.pengecualian.create({
      data: {
        muridId,
        jenis,
        jumlah,
        sebab,
        diluluskanOlehId: diluluskanOlehId || null,
      },
    })
    if (diluluskanOlehId) {
      await db.logAudit.create({
        data: {
          penggunaId: diluluskanOlehId,
          tindakan: 'LULUS_PENGECUALIAN',
          entiti: 'PENGECUALIAN',
          butiran: `Lulus pengecualian ${jenis} RM${jumlah} untuk murid ${muridId}`,
        },
      })
    }
    return NextResponse.json({ pengecualian: p })
  } catch (e: any) {
    return NextResponse.json({ ralat: e.message }, { status: 500 })
  }
}
