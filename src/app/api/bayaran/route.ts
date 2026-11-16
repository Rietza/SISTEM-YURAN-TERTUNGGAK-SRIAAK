// SRIAAKL - Bayaran API (Rekod Bayaran with FIFO)
// GET /api/bayaran?muridId=  - list bayaran for a student
// POST /api/bayaran           - record new payment with FIFO allocation
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  TODAY, bakiBulanan, peruntukanFifo, type InvoisRingkas
} from '@/lib/tunggakan'

// POST: record payment
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { muridId, jumlah, tarikhBayar, kaedah, noRujukan, direkodOlehId, peruntukanManual } = body

    if (!muridId || !jumlah || !kaedah) {
      return NextResponse.json({ ralat: 'muridId, jumlah dan kaedah diperlukan' }, { status: 400 })
    }
    if (jumlah <= 0) {
      return NextResponse.json({ ralat: 'Jumlah bayaran mesti positif' }, { status: 400 })
    }

    // Get all unpaid invoices for FIFO
    const invois = await db.invois.findMany({
      where: { muridId },
      include: { peruntukan: true },
      orderBy: [{ tahun: 'asc' }, { bulan: 'asc' }],
    })

    const invoisRingkas: InvoisRingkas[] = invois.map(i => ({
      id: i.id, tahun: i.tahun, bulan: i.bulan,
      jumlah: i.jumlah, diskaun: i.diskaun, tarikhAkhir: i.tarikhAkhir,
      peruntukan: i.peruntukan.map(p => ({ jumlahDiperuntukkan: p.jumlahDiperuntukkan })),
    }))

    // Compute allocation: manual or FIFO
    let peruntukan: { invoisId: string; jumlahDiperuntukkan: number }[]
    if (peruntukanManual && Array.isArray(peruntukanManual) && peruntukanManual.length > 0) {
      peruntukan = peruntukanManual
    } else {
      peruntukan = peruntukanFifo(jumlah, invoisRingkas)
    }

    const tarikh = tarikhBayar ? new Date(tarikhBayar) : TODAY

    // Create payment
    const bayaran = await db.bayaran.create({
      data: {
        muridId,
        tarikhBayar: tarikh,
        jumlah,
        kaedah,
        noRujukan: noRujukan || null,
        direkodOlehId: direkodOlehId || null,
      },
    })

    // Create peruntukan
    if (peruntukan.length > 0) {
      await db.peruntukanBayaran.createMany({
        data: peruntukan.map(p => ({
          bayaranId: bayaran.id,
          invoisId: p.invoisId,
          jumlahDiperuntukkan: p.jumlahDiperuntukkan,
        })),
      })
    }

    // Log audit
    if (direkodOlehId) {
      await db.logAudit.create({
        data: {
          penggunaId: direkodOlehId,
          tindakan: 'REKOD_BAYARAN',
          entiti: 'BAYARAN',
          butiran: `Rekod bayaran RM${jumlah} (${kaedah}) untuk murid ${muridId}`,
        },
      })
    }

    return NextResponse.json({
      bayaranId: bayaran.id,
      peruntukan,
      jumlahDiperuntukkan: peruntukan.reduce((s, p) => s + p.jumlahDiperuntukkan, 0),
      lebihan: Math.max(0, jumlah - peruntukan.reduce((s, p) => s + p.jumlahDiperuntukkan, 0)),
    })
  } catch (e: any) {
    console.error('Bayaran POST error:', e)
    return NextResponse.json({ ralat: e.message }, { status: 500 })
  }
}

// GET: list bayaran + FIFO preview for a student
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const muridId = searchParams.get('muridId')
    const previewJumlah = parseFloat(searchParams.get('previewJumlah') || '0')

    if (!muridId) {
      // All recent bayaran
      const all = await db.bayaran.findMany({
        include: {
          murid: { include: { kelas: true } },
          peruntukan: { include: { invois: true } },
        },
        orderBy: { tarikhBayar: 'desc' },
        take: 100,
      })
      return NextResponse.json({
        bayaran: all.map(b => ({
          id: b.id,
          muridId: b.muridId,
          namaMurid: b.murid.nama,
          kelas: b.murid.kelas.namaKelas,
          tarikhBayar: b.tarikhBayar,
          jumlah: b.jumlah,
          kaedah: b.kaedah,
          noRujukan: b.noRujukan,
          peruntukan: b.peruntukan.map(p => ({
            invoisId: p.invoisId,
            tahun: p.invois.tahun,
            bulan: p.invois.bulan,
            jumlah: p.jumlahDiperuntukkan,
          })),
        })),
      })
    }

    const invois = await db.invois.findMany({
      where: { muridId },
      include: { peruntukan: true },
      orderBy: [{ tahun: 'asc' }, { bulan: 'asc' }],
    })

    // FIFO preview if jumlah provided
    let preview: any = null
    if (previewJumlah > 0) {
      const invoisRingkas: InvoisRingkas[] = invois.map(i => ({
        id: i.id, tahun: i.tahun, bulan: i.bulan,
        jumlah: i.jumlah, diskaun: i.diskaun, tarikhAkhir: i.tarikhAkhir,
        peruntukan: i.peruntukan.map(p => ({ jumlahDiperuntukkan: p.jumlahDiperuntukkan })),
      }))
      const invMap = new Map(invois.map(i => [i.id, i]))
      const p = peruntukanFifo(previewJumlah, invoisRingkas)
      preview = {
        peruntukan: p.map(x => ({
          invoisId: x.invoisId,
          tahun: invMap.get(x.invoisId)?.tahun,
          bulan: invMap.get(x.invoisId)?.bulan,
          jumlah: x.jumlahDiperuntukkan,
        })),
        jumlahDiperuntukkan: p.reduce((s, x) => s + x.jumlahDiperuntukkan, 0),
        lebihan: Math.max(0, previewJumlah - p.reduce((s, x) => s + x.jumlahDiperuntukkan, 0)),
      }
    }

    return NextResponse.json({
      invois: invois.map(i => ({
        id: i.id, tahun: i.tahun, bulan: i.bulan,
        jumlah: i.jumlah, diskaun: i.diskaun,
        tarikhAkhir: i.tarikhAkhir,
        dibayar: i.peruntukan.reduce((s, p) => s + p.jumlahDiperuntukkan, 0),
        baki: bakiBulanan({
          id: i.id, tahun: i.tahun, bulan: i.bulan,
          jumlah: i.jumlah, diskaun: i.diskaun, tarikhAkhir: i.tarikhAkhir,
          peruntukan: i.peruntukan.map(p => ({ jumlahDiperuntukkan: p.jumlahDiperuntukkan })),
        }),
      })),
      preview,
    })
  } catch (e: any) {
    console.error('Bayaran GET error:', e)
    return NextResponse.json({ ralat: e.message }, { status: 500 })
  }
}
