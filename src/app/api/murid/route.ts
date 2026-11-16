// SRIAAKL - Murid API (list with Jan-Dis matrix + filters)
// GET /api/murid?tahun=2026&kelas=&cari=&status=&umur=
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  TODAY, bakiBulanan, statusSel, kategoriAgeing, kiraRingkasanTunggakan,
  kiraSkorRisiko, PEMBERAT_DEFAULT, STATUS_SEL_STYLE,
  type InvoisRingkas
} from '@/lib/tunggakan'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tahunQuery = searchParams.get('tahun') || '2026' // 2026 | 2025 | bandingan
    const kelasId = searchParams.get('kelas') || ''
    const cari = searchParams.get('cari') || ''
    const statusFilter = searchParams.get('status') || ''
    const umurFilter = searchParams.get('umur') || ''
    const statusSelFilter = searchParams.get('statusSel') || ''
    const minJumlah = parseFloat(searchParams.get('minJumlah') || '0')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '300')

    const kelasList = await db.kelas.findMany()
    const kelasMap = new Map(kelasList.map(k => [k.id, k]))

    const where: any = {}
    if (kelasId) where.kelasId = kelasId
    if (statusFilter) where.status = statusFilter
    if (cari) {
      where.OR = [
        { nama: { contains: cari } },
        { noMurid: { contains: cari } },
        { namaPenjaga: { contains: cari } },
        { noTelefonPenjaga: { contains: cari } },
      ]
    }

    const semuaMurid = await db.murid.findMany({
      where,
      include: {
        kelas: true,
        invois: { include: { peruntukan: true } },
        pelanAnsuran: { include: { ansuran: true } },
      },
      orderBy: { nama: 'asc' },
    })

    // Build per-murid matrix
    let result = []
    for (const m of semuaMurid) {
      const invoisRingkas: InvoisRingkas[] = m.invois.map(i => ({
        id: i.id, tahun: i.tahun, bulan: i.bulan,
        jumlah: i.jumlah, diskaun: i.diskaun, tarikhAkhir: i.tarikhAkhir,
        peruntukan: i.peruntukan.map(p => ({ jumlahDiperuntukkan: p.jumlahDiperuntukkan })),
      }))

      const ringkasan = kiraRingkasanTunggakan(invoisRingkas, TODAY)
      const bilMungkir = m.pelanAnsuran.reduce((s, p) =>
        s + p.ansuran.filter(a => a.status === 'MUNGKIR').length, 0)
      const skor = kiraSkorRisiko(ringkasan, bilMungkir, PEMBERAT_DEFAULT)

      // Build matrix for the requested year(s)
      const tahunSet = tahunQuery === 'bandingan' ? [2025, 2026] : [parseInt(tahunQuery)]
      const matrix: Record<number, any[]> = {}
      for (const t of tahunSet) {
        matrix[t] = []
        for (let b = 1; b <= 12; b++) {
          const inv = invoisRingkas.find(i => i.tahun === t && i.bulan === b)
          if (!inv) {
            matrix[t].push({ bulan: b, status: 'TIADA_INVOIS', baki: 0, jumlah: 0, dibayar: 0 })
            continue
          }
          const st = statusSel(inv, TODAY)
          const baki = bakiBulanan(inv)
          const dibayar = inv.peruntukan.reduce((s, p) => s + p.jumlahDiperuntukkan, 0)
          matrix[t].push({
            bulan: b,
            status: st,
            baki: Math.round(baki * 100) / 100,
            jumlah: inv.jumlah,
            dibayar: Math.round(dibayar * 100) / 100,
            invoisId: inv.id,
          })
        }
      }

      // Status sel filter
      if (statusSelFilter) {
        const allSels = Object.values(matrix).flat().map((c: any) => c.status)
        if (!allSels.includes(statusSelFilter)) continue
      }

      // Umur filter
      if (umurFilter) {
        const invTertunggak = invoisRingkas.filter(i => {
          const st = statusSel(i, TODAY)
          return st === 'TERTUNGGAK' || st === 'SEPARA'
        })
        const hasUmur = invTertunggak.some(i => kategoriAgeing(i, TODAY) === umurFilter)
        if (!hasUmur) continue
      }

      // Min jumlah filter
      if (ringkasan.jumlahKeseluruhan < minJumlah) continue

      result.push({
        id: m.id,
        noMurid: m.noMurid,
        nama: m.nama,
        kelasId: m.kelasId,
        kelas: m.kelas.namaKelas,
        tahunDarjah: m.kelas.tahunDarjah,
        namaPenjaga: m.namaPenjaga,
        noTelefonPenjaga: m.noTelefonPenjaga,
        status: m.status,
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
      })
    }

    // Sort by skor desc for priority
    result.sort((a, b) => b.skor - a.skor)

    const total = result.length
    const start = (page - 1) * pageSize
    const paged = result.slice(start, start + pageSize)

    return NextResponse.json({
      murid: paged,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      kelasList: kelasList.map(k => ({ id: k.id, namaKelas: k.namaKelas, tahunDarjah: k.tahunDarjah })),
    })
  } catch (e: any) {
    console.error('Murid list error:', e)
    return NextResponse.json({ ralat: e.message }, { status: 500 })
  }
}
