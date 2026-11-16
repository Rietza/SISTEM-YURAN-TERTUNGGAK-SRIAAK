// SRIAAKL - Pelan Ansuran API
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { TODAY } from '@/lib/tunggakan'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const muridId = searchParams.get('muridId')
  const where: any = muridId ? { muridId } : {}
  const data = await db.pelanAnsuran.findMany({
    where,
    include: {
      murid: { include: { kelas: true } },
      ansuran: { orderBy: { bil: 'asc' } },
      diluluskanOleh: true,
    },
    orderBy: { tarikhCipta: 'desc' },
  })
  return NextResponse.json({
    pelan: data.map(p => ({
      id: p.id,
      muridId: p.muridId,
      namaMurid: p.murid.nama,
      kelas: p.murid.kelas.namaKelas,
      jumlahKeseluruhan: p.jumlahKeseluruhan,
      bilAnsuran: p.bilAnsuran,
      status: p.status,
      sebab: p.sebab,
      diluluskanOleh: p.diluluskanOleh?.nama ?? '-',
      tarikhCipta: p.tarikhCipta,
      ansuran: p.ansuran.map(a => ({
        id: a.id,
        bil: a.bil,
        tarikhAkhir: a.tarikhAkhir,
        jumlah: a.jumlah,
        status: a.status,
        tarikhBayar: a.tarikhBayar,
      })),
    })),
  })
}

export async function POST(req: NextRequest) {
  try {
    const { muridId, jumlahKeseluruhan, bilAnsuran, sebab, diluluskanOlehId, tarikhMula } = await req.json()
    if (!muridId || !jumlahKeseluruhan || !bilAnsuran) {
      return NextResponse.json({ ralat: 'muridId, jumlahKeseluruhan, bilAnsuran diperlukan' }, { status: 400 })
    }
    const jumlahPerAnsuran = Math.round((jumlahKeseluruhan / bilAnsuran) * 100) / 100

    const mula = tarikhMula ? new Date(tarikhMula) : TODAY
    const pelan = await db.pelanAnsuran.create({
      data: {
        muridId,
        jumlahKeseluruhan,
        bilAnsuran,
        status: 'AKTIF',
        sebab: sebab || null,
        diluluskanOlehId: diluluskanOlehId || null,
      },
    })

    // Create ansuran schedule (monthly)
    for (let i = 1; i <= bilAnsuran; i++) {
      const tarikhAkhir = new Date(Date.UTC(mula.getFullYear(), mula.getMonth() + i - 1, 10))
      await db.ansuran.create({
        data: {
          pelanId: pelan.id,
          bil: i,
          tarikhAkhir,
          jumlah: jumlahPerAnsuran,
          status: 'BELUM',
        },
      })
    }

    if (diluluskanOlehId) {
      await db.logAudit.create({
        data: {
          penggunaId: diluluskanOlehId,
          tindakan: 'CIPTA_PELAN_ANSURAN',
          entiti: 'PELAN_ANSURAN',
          butiran: `Cipta pelan ansuran RM${jumlahKeseluruhan} (${bilAnsuran} ansuran) untuk murid ${muridId}`,
        },
      })
    }

    return NextResponse.json({ pelanId: pelan.id, jumlahPerAnsuran })
  } catch (e: any) {
    return NextResponse.json({ ralat: e.message }, { status: 500 })
  }
}

// PATCH: update ansuran status
export async function PATCH(req: NextRequest) {
  try {
    const { ansuranId, status, tarikhBayar } = await req.json()
    if (!ansuranId || !status) {
      return NextResponse.json({ ralat: 'ansuranId dan status diperlukan' }, { status: 400 })
    }
    const updated = await db.ansuran.update({
      where: { id: ansuranId },
      data: {
        status,
        tarikhBayar: status === 'DIBAYAR' ? (tarikhBayar ? new Date(tarikhBayar) : TODAY) : null,
      },
    })
    return NextResponse.json({ ansuran: updated })
  } catch (e: any) {
    return NextResponse.json({ ralat: e.message }, { status: 500 })
  }
}
