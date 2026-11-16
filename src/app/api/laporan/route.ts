// SRIAAKL - Laporan API
// GET /api/laporan?jenis=&tahun=&kelas=&bulan=
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  TODAY, bakiBulanan, statusSel, kategoriAgeing, kiraRingkasanTunggakan,
  type InvoisRingkas, AGEING_LABEL
} from '@/lib/tunggakan'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const jenis = searchParams.get('jenis') || 'tunggakan' // tunggakan | kutipan | ageing | kelas
    const tahun = parseInt(searchParams.get('tahun') || '2026')
    const kelasId = searchParams.get('kelas') || ''
    const format = searchParams.get('format') || 'json' // json | csv

    const whereMurid: any = {}
    if (kelasId) whereMurid.kelasId = kelasId

    const muridList = await db.murid.findMany({
      where: whereMurid,
      include: {
        kelas: true,
        invois: {
          include: { peruntukan: true },
          where: jenis === 'kutipan' ? { tahun } : undefined,
        },
        bayaran: { where: jenis === 'kutipan' ? { tarikhBayar: { gte: new Date(`${tahun}-01-01`), lte: new Date(`${tahun}-12-31`) } } : undefined },
      },
      orderBy: { nama: 'asc' },
    })

    let rows: any[] = []
    let summary: any = {}

    if (jenis === 'tunggakan') {
      for (const m of muridList) {
        const invoisRingkas: InvoisRingkas[] = m.invois.map(i => ({
          id: i.id, tahun: i.tahun, bulan: i.bulan,
          jumlah: i.jumlah, diskaun: i.diskaun, tarikhAkhir: i.tarikhAkhir,
          peruntukan: i.peruntukan.map(p => ({ jumlahDiperuntukkan: p.jumlahDiperuntukkan })),
        }))
        const r = kiraRingkasanTunggakan(invoisRingkas, TODAY)
        if (r.jumlahKeseluruhan > 0.01) {
          rows.push({
            noMurid: m.noMurid,
            nama: m.nama,
            kelas: m.kelas.namaKelas,
            tunggakan2025: Math.round(r.baki2025 * 100) / 100,
            tunggakan2026: Math.round(r.baki2026 * 100) / 100,
            jumlahTunggakan: Math.round(r.jumlahKeseluruhan * 100) / 100,
            bilBulanTertunggak: r.bilBulanTertunggak,
            status: m.status,
          })
        }
      }
      summary = {
        jumlahMurid: muridList.length,
        jumlahMenunggak: rows.length,
        jumlahTunggakan: rows.reduce((s, r) => s + r.jumlahTunggakan, 0),
      }
    } else if (jenis === 'kutipan') {
      for (const m of muridList) {
        const jumlahInvois = m.invois.reduce((s, i) => s + i.jumlah, 0)
        const jumlahBayaran = m.bayaran.reduce((s, b) => s + b.jumlah, 0)
        const bilInvois = m.invois.length
        const bilBayaran = m.bayaran.length
        rows.push({
          noMurid: m.noMurid,
          nama: m.nama,
          kelas: m.kelas.namaKelas,
          bilInvois,
          jumlahInvois: Math.round(jumlahInvois * 100) / 100,
          bilBayaran,
          jumlahBayaran: Math.round(jumlahBayaran * 100) / 100,
          baki: Math.round((jumlahInvois - jumlahBayaran) * 100) / 100,
          kadarKutipan: jumlahInvois > 0 ? Math.round((jumlahBayaran / jumlahInvois) * 10000) / 100 : 0,
        })
      }
      summary = {
        tahun,
        jumlahInvois: rows.reduce((s, r) => s + r.jumlahInvois, 0),
        jumlahBayaran: rows.reduce((s, r) => s + r.jumlahBayaran, 0),
        kadarKutipan: rows.reduce((s, r) => s + r.jumlahInvois, 0) > 0
          ? Math.round((rows.reduce((s, r) => s + r.jumlahBayaran, 0) / rows.reduce((s, r) => s + r.jumlahInvois, 0)) * 10000) / 100
          : 0,
      }
    } else if (jenis === 'ageing') {
      const ageing: Record<string, { jumlah: number; bil: number }> = {
        '0_30': { jumlah: 0, bil: 0 },
        '31_60': { jumlah: 0, bil: 0 },
        '61_90': { jumlah: 0, bil: 0 },
        'LEBIH_90': { jumlah: 0, bil: 0 },
      }
      for (const m of muridList) {
        const seenKategori = new Set<string>()
        for (const inv of m.invois) {
          const ir: InvoisRingkas = {
            id: inv.id, tahun: inv.tahun, bulan: inv.bulan,
            jumlah: inv.jumlah, diskaun: inv.diskaun, tarikhAkhir: inv.tarikhAkhir,
            peruntukan: inv.peruntukan.map(p => ({ jumlahDiperuntukkan: p.jumlahDiperuntukkan })),
          }
          const st = statusSel(ir, TODAY)
          if (st === 'TERTUNGGAK' || st === 'SEPARA') {
            const kat = kategoriAgeing(ir, TODAY)
            if (kat !== 'BELUM_JATUH_TEMPO') {
              ageing[kat].jumlah += bakiBulanan(ir)
              if (!seenKategori.has(kat)) {
                ageing[kat].bil += 1
                seenKategori.add(kat)
              }
            }
          }
        }
      }
      rows = Object.entries(ageing).map(([k, v]) => ({
        kategori: AGEING_LABEL[k as keyof typeof AGEING_LABEL],
        bilMurid: v.bil,
        jumlah: Math.round(v.jumlah * 100) / 100,
      }))
      summary = {
        jumlahTunggakan: rows.reduce((s, r) => s + r.jumlah, 0),
        bilMuridBertunggakan: rows.reduce((s, r) => s + r.bilMurid, 0),
      }
    } else if (jenis === 'kelas') {
      const kelasList = await db.kelas.findMany()
      for (const k of kelasList) {
        const muridK = muridList.filter(m => m.kelasId === k.id)
        let jumTunggakan = 0
        let bilMenunggak = 0
        for (const m of muridK) {
          const ir: InvoisRingkas[] = m.invois.map(i => ({
            id: i.id, tahun: i.tahun, bulan: i.bulan,
            jumlah: i.jumlah, diskaun: i.diskaun, tarikhAkhir: i.tarikhAkhir,
            peruntukan: i.peruntukan.map(p => ({ jumlahDiperuntukkan: p.jumlahDiperuntukkan })),
          }))
          const r = kiraRingkasanTunggakan(ir, TODAY)
          jumTunggakan += r.jumlahKeseluruhan
          if (r.jumlahKeseluruhan > 0.01) bilMenunggak++
        }
        rows.push({
          kelas: k.namaKelas,
          tahunDarjah: k.tahunDarjah,
          bilMurid: muridK.length,
          bilMenunggak,
          tunggakan: Math.round(jumTunggakan * 100) / 100,
        })
      }
      summary = {
        jumlahKelas: rows.length,
        jumlahTunggakan: rows.reduce((s, r) => s + r.tunggakan, 0),
      }
    }

    // CSV export
    if (format === 'csv') {
      if (rows.length === 0) return NextResponse.json({ csv: '' })
      const headers = Object.keys(rows[0])
      const csv = [
        headers.join(','),
        ...rows.map(r => headers.map(h => {
          const v = (r as any)[h]
          if (v === null || v === undefined) return ''
          if (typeof v === 'string' && v.includes(',')) return `"${v.replace(/"/g, '""')}"`
          return String(v)
        }).join(',')),
      ].join('\n')
      return NextResponse.json({ csv, filename: `laporan_${jenis}_${tahun}.csv` })
    }

    return NextResponse.json({ jenis, tahun, rows, summary })
  } catch (e: any) {
    console.error('Laporan error:', e)
    return NextResponse.json({ ralat: e.message }, { status: 500 })
  }
}
