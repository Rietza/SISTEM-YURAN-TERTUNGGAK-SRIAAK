// SRIAAKL - Nota Susulan API
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { TODAY } from '@/lib/tunggakan'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const muridId = searchParams.get('muridId')
  const where: any = muridId ? { muridId } : {}
  const data = await db.notaSusulan.findMany({
    where,
    include: { murid: { include: { kelas: true } }, diciptaOleh: true },
    orderBy: { tarikhCipta: 'desc' },
    take: 100,
  })
  return NextResponse.json({
    nota: data.map(n => ({
      id: n.id,
      muridId: n.muridId,
      namaMurid: n.murid.nama,
      kelas: n.murid.kelas.namaKelas,
      jenis: n.jenis,
      catatan: n.catatan,
      janjiBayarTarikh: n.janjiBayarTarikh,
      diciptaOleh: n.diciptaOleh?.nama ?? '-',
      tarikhCipta: n.tarikhCipta,
    })),
  })
}

export async function POST(req: NextRequest) {
  try {
    const { muridId, jenis, catatan, janjiBayarTarikh, diciptaOlehId } = await req.json()
    if (!muridId || !jenis || !catatan) {
      return NextResponse.json({ ralat: 'muridId, jenis, catatan diperlukan' }, { status: 400 })
    }
    const nota = await db.notaSusulan.create({
      data: {
        muridId,
        jenis,
        catatan,
        janjiBayarTarikh: janjiBayarTarikh ? new Date(janjiBayarTarikh) : null,
        diciptaOlehId: diciptaOlehId || null,
      },
    })
    if (diciptaOlehId) {
      await db.logAudit.create({
        data: {
          penggunaId: diciptaOlehId,
          tindakan: 'TAMBAH_NOTA_SUSULAN',
          entiti: 'NOTA_SUSULAN',
          butiran: `Tambah nota (${jenis}) untuk murid ${muridId}`,
        },
      })
    }
    return NextResponse.json({ nota })
  } catch (e: any) {
    return NextResponse.json({ ralat: e.message }, { status: 500 })
  }
}
