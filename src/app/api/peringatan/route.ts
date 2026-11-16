// SRIAAKL - Peringatan API
// GET /api/peringatan  - list reminders
// POST /api/peringatan - send reminder (simulated, bulk supported)
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { TODAY, bakiBulanan, statusSel, type InvoisRingkas } from '@/lib/tunggakan'

const TEMPLAT: Record<string, (namaMurid: string, namaPenjaga: string, jumlah: number) => string> = {
  MESRA: (n, p, j) => `Assalamualaikum ${p}, peringatan mesra: yuran ${n} sebanyak RM${j.toFixed(2)} untuk bulan ini belum diterima. Sila jelaskan sebelum tarikh akhir. Terima kasih. - SRIAAKL`,
  TEGAS: (n, p, j) => `Dimaklumkan ${p}, yuran ${n} sebanyak RM${j.toFixed(2)} telah MELEBIHI tarikh akhir bayaran. Sila hubungi pejabat sekolah segera untuk pengaturan bayaran. - SRIAAKL`,
  NOTIS_AKHIR: (n, p, j) => `NOTIS AKHIR: Tunggakan yuran ${n} (RM${j.toFixed(2)}) telah lama tertunggak. Tindakan susulan akan diambil jika bayaran tidak diterima dalam 7 hari dari tarikh ini. - SRIAAKL`,
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const muridId = searchParams.get('muridId')
  const where: any = muridId ? { muridId } : {}
  const data = await db.peringatan.findMany({
    where,
    include: { murid: { include: { kelas: true } }, dihantarOleh: true },
    orderBy: { tarikhHantar: 'desc' },
    take: 100,
  })
  return NextResponse.json({
    peringatan: data.map(p => ({
      id: p.id,
      muridId: p.muridId,
      namaMurid: p.murid.nama,
      kelas: p.murid.kelas.namaKelas,
      saluran: p.saluran,
      peringkat: p.peringkat,
      mesej: p.mesej,
      tarikhHantar: p.tarikhHantar,
      status: p.status,
      dihantarOleh: p.dihantarOleh?.nama ?? '-',
    })),
    templat: Object.keys(TEMPLAT),
  })
}

export async function POST(req: NextRequest) {
  try {
    const { muridIds, saluran, peringkat, dihantarOlehId } = await req.json()
    if (!muridIds || !Array.isArray(muridIds) || muridIds.length === 0) {
      return NextResponse.json({ ralat: 'muridIds diperlukan' }, { status: 400 })
    }
    if (!saluran || !peringkat) {
      return NextResponse.json({ ralat: 'saluran dan peringkat diperlukan' }, { status: 400 })
    }
    const templatFn = TEMPLAT[peringkat]
    if (!templatFn) {
      return NextResponse.json({ ralat: 'Peringkat tidak sah' }, { status: 400 })
    }

    const muridList = await db.murid.findMany({
      where: { id: { in: muridIds } },
      include: { invois: { include: { peruntukan: true } } },
    })

    const created = []
    for (const m of muridList) {
      // Calculate current outstanding
      const invoisRingkas: InvoisRingkas[] = m.invois.map(i => ({
        id: i.id, tahun: i.tahun, bulan: i.bulan,
        jumlah: i.jumlah, diskaun: i.diskaun, tarikhAkhir: i.tarikhAkhir,
        peruntukan: i.peruntukan.map(p => ({ jumlahDiperuntukkan: p.jumlahDiperuntukkan })),
      }))
      const tertunggak = invoisRingkas.filter(i => {
        const st = statusSel(i, TODAY)
        return st === 'TERTUNGGAK' || st === 'SEPARA'
      })
      const jumlah = tertunggak.reduce((s, i) => s + bakiBulanan(i), 0)
      if (jumlah < 0.01) continue

      const mesej = templatFn(m.nama, m.namaPenjaga, jumlah)
      const p = await db.peringatan.create({
        data: {
          muridId: m.id,
          saluran,
          peringkat,
          mesej,
          tarikhHantar: TODAY,
          status: 'DIHANTAR',
          dihantarOlehId: dihantarOlehId || null,
        },
      })
      created.push(p)
    }

    if (dihantarOlehId) {
      await db.logAudit.create({
        data: {
          penggunaId: dihantarOlehId,
          tindakan: 'HANTAR_PERINGATAN',
          entiti: 'PERINGATAN',
          butiran: `Hantar ${created.length} peringatan (${saluran}/${peringkat})`,
        },
      })
    }

    return NextResponse.json({ bilDihantar: created.length, peringatan: created })
  } catch (e: any) {
    return NextResponse.json({ ralat: e.message }, { status: 500 })
  }
}
