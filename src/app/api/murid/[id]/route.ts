// SRIAAKL - Murid detail API
// GET /api/murid/[id]
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  TODAY, bakiBulanan, statusSel, kategoriAgeing, kiraRingkasanTunggakan,
  kiraSkorRisiko, PEMBERAT_DEFAULT, maskNoKp, type InvoisRingkas
} from '@/lib/tunggakan'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const m = await db.murid.findUnique({
      where: { id },
      include: {
        kelas: { include: { guruKelas: true } },
        invois: {
          include: { peruntukan: { include: { bayaran: true } } },
          orderBy: [{ tahun: 'asc' }, { bulan: 'asc' }],
        },
        bayaran: {
          include: { peruntukan: { include: { invois: true } } },
          orderBy: { tarikhBayar: 'desc' },
        },
        peringatan: { orderBy: { tarikhHantar: 'desc' }, take: 20 },
        notaSusulan: { orderBy: { tarikhCipta: 'desc' }, take: 20, include: { diciptaOleh: true } },
        pelanAnsuran: { include: { ansuran: { orderBy: { bil: 'asc' } }, diluluskanOleh: true } },
        pengecualian: { include: { diluluskanOleh: true } },
      },
    })
    if (!m) return NextResponse.json({ ralat: 'Murid tidak dijumpai' }, { status: 404 })

    const invoisRingkas: InvoisRingkas[] = m.invois.map(i => ({
      id: i.id, tahun: i.tahun, bulan: i.bulan,
      jumlah: i.jumlah, diskaun: i.diskaun, tarikhAkhir: i.tarikhAkhir,
      peruntukan: i.peruntukan.map(p => ({ jumlahDiperuntukkan: p.jumlahDiperuntukkan })),
    }))
    const ringkasan = kiraRingkasanTunggakan(invoisRingkas, TODAY)
    const bilMungkir = m.pelanAnsuran.reduce((s, p) =>
      s + p.ansuran.filter(a => a.status === 'MUNGKIR').length, 0)
    const skor = kiraSkorRisiko(ringkasan, bilMungkir, PEMBERAT_DEFAULT)

    // Build matrix for both years
    const matrix: Record<number, any[]> = { 2025: [], 2026: [] }
    for (const t of [2025, 2026]) {
      for (let b = 1; b <= 12; b++) {
        const inv = m.invois.find(i => i.tahun === t && i.bulan === b)
        if (!inv) {
          matrix[t].push({ bulan: b, status: 'TIADA_INVOIS', baki: 0, jumlah: 0, dibayar: 0 })
          continue
        }
        const st = statusSel({
          id: inv.id, tahun: inv.tahun, bulan: inv.bulan,
          jumlah: inv.jumlah, diskaun: inv.diskaun, tarikhAkhir: inv.tarikhAkhir,
          peruntukan: inv.peruntukan.map(p => ({ jumlahDiperuntukkan: p.jumlahDiperuntukkan })),
        }, TODAY)
        matrix[t].push({
          bulan: b,
          status: st,
          baki: Math.round(bakiBulanan({
            id: inv.id, tahun: inv.tahun, bulan: inv.bulan,
            jumlah: inv.jumlah, diskaun: inv.diskaun, tarikhAkhir: inv.tarikhAkhir,
            peruntukan: inv.peruntukan.map(p => ({ jumlahDiperuntukkan: p.jumlahDiperuntukkan })),
          }) * 100) / 100,
          jumlah: inv.jumlah,
          dibayar: Math.round(inv.peruntukan.reduce((s, p) => s + p.jumlahDiperuntukkan, 0) * 100) / 100,
          invoisId: inv.id,
          tarikhAkhir: inv.tarikhAkhir,
          umur: st === 'TERTUNGGAK' || st === 'SEPARA'
            ? Math.floor((TODAY.getTime() - new Date(inv.tarikhAkhir).getTime()) / (1000*60*60*24))
            : 0,
          kategoriAgeing: kategoriAgeing({
            id: inv.id, tahun: inv.tahun, bulan: inv.bulan,
            jumlah: inv.jumlah, diskaun: inv.diskaun, tarikhAkhir: inv.tarikhAkhir,
            peruntukan: inv.peruntukan.map(p => ({ jumlahDiperuntukkan: p.jumlahDiperuntukkan })),
          }, TODAY),
        })
      }
    }

    return NextResponse.json({
      murid: {
        id: m.id,
        noMurid: m.noMurid,
        nama: m.nama,
        kelas: m.kelas.namaKelas,
        tahunDarjah: m.kelas.tahunDarjah,
        guruKelas: m.kelas.guruKelas?.nama ?? '-',
        namaPenjaga: m.namaPenjaga,
        noTelefonPenjaga: m.noTelefonPenjaga,
        noKpPenjaga: maskNoKp(m.noKpPenjaga),
        status: m.status,
        tarikhDaftar: m.tarikhDaftar,
      },
      matrix,
      ringkasan: {
        ...ringkasan,
        baki2025: Math.round(ringkasan.baki2025 * 100) / 100,
        baki2026: Math.round(ringkasan.baki2026 * 100) / 100,
        tunggakanSebelum: Math.round(ringkasan.tunggakanSebelum * 100) / 100,
        tunggakanSemasa: Math.round(ringkasan.tunggakanSemasa * 100) / 100,
        jumlahKeseluruhan: Math.round(ringkasan.jumlahKeseluruhan * 100) / 100,
      },
      skor,
      bilMungkir,
      bayaran: m.bayaran.map(b => ({
        id: b.id,
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
      peringatan: m.peringatan,
      notaSusulan: m.notaSusulan,
      pelanAnsuran: m.pelanAnsuran,
      pengecualian: m.pengecualian,
      invois: m.invois.map(i => ({
        id: i.id,
        tahun: i.tahun,
        bulan: i.bulan,
        jumlah: i.jumlah,
        diskaun: i.diskaun,
        tarikhAkhir: i.tarikhAkhir,
        dibayar: i.peruntukan.reduce((s, p) => s + p.jumlahDiperuntukkan, 0),
        baki: bakiBulanan({
          id: i.id, tahun: i.tahun, bulan: i.bulan,
          jumlah: i.jumlah, diskaun: i.diskaun, tarikhAkhir: i.tarikhAkhir,
          peruntukan: i.peruntukan.map(p => ({ jumlahDiperuntukkan: p.jumlahDiperuntukkan })),
        }),
        status: statusSel({
          id: i.id, tahun: i.tahun, bulan: i.bulan,
          jumlah: i.jumlah, diskaun: i.diskaun, tarikhAkhir: i.tarikhAkhir,
          peruntukan: i.peruntukan.map(p => ({ jumlahDiperuntukkan: p.jumlahDiperuntukkan })),
        }, TODAY),
      })),
    })
  } catch (e: any) {
    console.error('Murid detail error:', e)
    return NextResponse.json({ ralat: e.message }, { status: 500 })
  }
}
