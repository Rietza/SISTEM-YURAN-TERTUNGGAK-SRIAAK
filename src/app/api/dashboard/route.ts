// SRIAAKL - Dashboard API
// GET /api/dashboard
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  TODAY, bakiBulanan, statusSel, kategoriAgeing, kiraRingkasanTunggakan,
  kiraSkorRisiko, PEMBERAT_DEFAULT, type InvoisRingkas, type KategoriAgeing
} from '@/lib/tunggakan'

export async function GET() {
  try {
    const pemberat = PEMBERAT_DEFAULT

    // Get all kelas
    const kelasList = await db.kelas.findMany({ include: { murid: true } })
    const kelasMap = new Map(kelasList.map(k => [k.id, k]))

    // Get all murid with their invoices + peruntukan
    const semuaMurid = await db.murid.findMany({
      include: {
        invois: { include: { peruntukan: true } },
        pelanAnsuran: { include: { ansuran: true } },
      },
    })

    // Compute per-murid summary
    const muridSummaries = []
    for (const m of semuaMurid) {
      const invoisRingkas: InvoisRingkas[] = m.invois.map(i => ({
        id: i.id,
        tahun: i.tahun,
        bulan: i.bulan,
        jumlah: i.jumlah,
        diskaun: i.diskaun,
        tarikhAkhir: i.tarikhAkhir,
        peruntukan: i.peruntukan.map(p => ({ jumlahDiperuntukkan: p.jumlahDiperuntukkan })),
      }))
      const ringkasan = kiraRingkasanTunggakan(invoisRingkas, TODAY)
      const bilMungkir = m.pelanAnsuran.reduce((s, p) =>
        s + p.ansuran.filter(a => a.status === 'MUNGKIR').length, 0)
      const skor = kiraSkorRisiko(ringkasan, bilMungkir, pemberat)
      muridSummaries.push({
        id: m.id,
        noMurid: m.noMurid,
        nama: m.nama,
        kelasId: m.kelasId,
        kelas: kelasMap.get(m.kelasId)?.namaKelas ?? '-',
        tahunDarjah: kelasMap.get(m.kelasId)?.tahunDarjah ?? 0,
        status: m.status,
        ringkasan,
        skor,
      })
    }

    // ===== Kad ringkasan =====
    const tunggakan2025 = muridSummaries.reduce((s, m) => s + m.ringkasan.baki2025, 0)
    const tunggakan2026 = muridSummaries.reduce((s, m) => s + m.ringkasan.baki2026, 0)
    const jumlahTunggakan = tunggakan2025 + tunggakan2026
    const bilMenunggak = muridSummaries.filter(m => m.ringkasan.jumlahKeseluruhan > 0.01).length

    // Kadar kutipan bulan ini (Nov 2026)
    // = bayaran diterima untuk invois Nov 2026 / jumlah invois Nov 2026
    const invoisNov = await db.invois.findMany({
      where: { tahun: 2026, bulan: 11 },
      include: { peruntukan: true },
    })
    const jumlahInvoisNov = invoisNov.reduce((s, i) => s + i.jumlah, 0)
    const jumlahDiterimaNov = invoisNov.reduce((s, i) =>
      s + i.peruntukan.reduce((ss, p) => ss + p.jumlahDiperuntukkan, 0), 0)
    const kadarKutipanBulanIni = jumlahInvoisNov > 0 ? (jumlahDiterimaNov / jumlahInvoisNov) * 100 : 0

    // ===== Carta bar bulanan (Jan-Dis 2026) =====
    const bulanan2026 = []
    for (let b = 1; b <= 12; b++) {
      const inv = await db.invois.findMany({
        where: { tahun: 2026, bulan: b },
        include: { peruntukan: true },
      })
      const jumlahInvois = inv.reduce((s, i) => s + i.jumlah, 0)
      const jumlahBayar = inv.reduce((s, i) =>
        s + i.peruntukan.reduce((ss, p) => ss + p.jumlahDiperuntukkan, 0), 0)
      const baki = inv.reduce((s, i) => s + bakiBulanan({
        id: i.id, tahun: i.tahun, bulan: i.bulan, jumlah: i.jumlah,
        diskaun: i.diskaun, tarikhAkhir: i.tarikhAkhir,
        peruntukan: i.peruntukan.map(p => ({ jumlahDiperuntukkan: p.jumlahDiperuntukkan })),
      }), 0)
      bulanan2026.push({
        bulan: b,
        namaBulan: ['Jan','Feb','Mac','Apr','Mei','Jun','Jul','Ogo','Sep','Okt','Nov','Dis'][b-1],
        invois: Math.round(jumlahInvois * 100) / 100,
        bayaran: Math.round(jumlahBayar * 100) / 100,
        tunggakan: Math.round(baki * 100) / 100,
      })
    }

    // ===== Carta ageing =====
    const ageing: Record<KategoriAgeing, number> = {
      '0_30': 0, '31_60': 0, '61_90': 0, 'LEBIH_90': 0, 'BELUM_JATUH_TEMPO': 0,
    }
    for (const m of muridSummaries) {
      const m2 = await db.murid.findUnique({
        where: { id: m.id },
        include: { invois: { include: { peruntukan: true } } },
      })
      if (!m2) continue
      for (const inv of m2.invois) {
        const ir: InvoisRingkas = {
          id: inv.id, tahun: inv.tahun, bulan: inv.bulan,
          jumlah: inv.jumlah, diskaun: inv.diskaun, tarikhAkhir: inv.tarikhAkhir,
          peruntukan: inv.peruntukan.map(p => ({ jumlahDiperuntukkan: p.jumlahDiperuntukkan })),
        }
        const st = statusSel(ir, TODAY)
        if (st === 'TERTUNGGAK' || st === 'SEPARA') {
          const kat = kategoriAgeing(ir, TODAY)
          ageing[kat] += bakiBulanan(ir)
        }
      }
    }

    // ===== Top 10 penunggak tertinggi =====
    const top10 = [...muridSummaries]
      .filter(m => m.ringkasan.jumlahKeseluruhan > 0.01)
      .sort((a, b) => b.ringkasan.jumlahKeseluruhan - a.ringkasan.jumlahKeseluruhan)
      .slice(0, 10)
      .map(m => ({
        id: m.id,
        noMurid: m.noMurid,
        nama: m.nama,
        kelas: m.kelas,
        jumlahTunggakan: Math.round(m.ringkasan.jumlahKeseluruhan * 100) / 100,
        tunggakan2025: Math.round(m.ringkasan.baki2025 * 100) / 100,
        tunggakan2026: Math.round(m.ringkasan.baki2026 * 100) / 100,
        skor: m.skor,
        bilBulanTertunggak: m.ringkasan.bilBulanTertunggak,
      }))

    // ===== Tunggakan mengikut kelas =====
    const tunggakanKelas = kelasList.map(k => {
      const muridKelas = muridSummaries.filter(m => m.kelasId === k.id)
      const jumlah = muridKelas.reduce((s, m) => s + m.ringkasan.jumlahKeseluruhan, 0)
      return {
        kelas: k.namaKelas,
        tahunDarjah: k.tahunDarjah,
        bilMurid: muridKelas.length,
        tunggakan: Math.round(jumlah * 100) / 100,
        bilMenunggak: muridKelas.filter(m => m.ringkasan.jumlahKeseluruhan > 0.01).length,
      }
    }).sort((a, b) => b.tunggakan - a.tunggakan)

    return NextResponse.json({
      kad: {
        tunggakanKeseluruhan: Math.round(jumlahTunggakan * 100) / 100,
        tunggakan2026: Math.round(tunggakan2026 * 100) / 100,
        tunggakan2025: Math.round(tunggakan2025 * 100) / 100,
        kadarKutipanBulanIni: Math.round(kadarKutipanBulanIni * 100) / 100,
        bilMenunggak,
        bilMurid: semuaMurid.length,
      },
      bulanan2026,
      ageing: Object.entries(ageing).map(([k, v]) => ({ kategori: k, jumlah: Math.round(v * 100) / 100 })),
      top10,
      tunggakanKelas,
      jumlahInvoisNov: Math.round(jumlahInvoisNov * 100) / 100,
      jumlahDiterimaNov: Math.round(jumlahDiterimaNov * 100) / 100,
      tarikhSemasa: TODAY.toISOString(),
    })
  } catch (e: any) {
    console.error('Dashboard error:', e)
    return NextResponse.json({ ralat: e.message, stack: e.stack }, { status: 500 })
  }
}
