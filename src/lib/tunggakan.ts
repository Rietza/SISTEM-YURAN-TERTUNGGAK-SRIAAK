// SRIAAKL - Core tunggakan calculation library
// All logic for baki, ageing, skor risiko, FIFO allocation
// Reference date: 16 November 2026 (per PRD)

export const TODAY = new Date('2026-11-16T00:00:00Z')

export const BULAN_NAMA = [
  'Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun',
  'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'
]

export const BULAN_NAMA_PENUH = [
  'Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun',
  'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'
]

export type StatusSel = 'LUNAS' | 'SEPARA' | 'TERTUNGGAK' | 'BELUM_JATUH_TEMPO' | 'TIADA_INVOIS'

export interface InvoisRingkas {
  id: string
  tahun: number
  bulan: number
  jumlah: number
  diskaun: number
  tarikhAkhir: Date | string
  peruntukan: { jumlahDiperuntukkan: number }[]
}

export interface BayaranRingkas {
  id: string
  tarikhBayar: Date | string
  jumlah: number
  kaedah: string
  noRujukan: string | null
  peruntukan: { invoisId: string; jumlahDiperuntukkan: number }[]
}

// ===== Baki bulanan =====
// Baki bulanan = Jumlah invois - Bayaran dipadankan - Diskaun
export function bakiBulanan(invois: InvoisRingkas): number {
  const dibayar = invois.peruntukan.reduce((s, p) => s + p.jumlahDiperuntukkan, 0)
  return Math.max(0, invois.jumlah - invois.diskaun - dibayar)
}

// ===== Status sel =====
export function statusSel(invois: InvoisRingkas | null, today: Date = TODAY): StatusSel {
  if (!invois) return 'TIADA_INVOIS'
  const baki = bakiBulanan(invois)
  if (baki <= 0.001) return 'LUNAS'
  const tarikhAkhir = new Date(invois.tarikhAkhir)
  if (tarikhAkhir > today) return 'BELUM_JATUH_TEMPO'
  // Has any partial payment?
  const dibayar = invois.peruntukan.reduce((s, p) => s + p.jumlahDiperuntukkan, 0)
  if (dibayar > 0) return 'SEPARA'
  return 'TERTUNGGAK'
}

// ===== Umur tunggakan (ageing) =====
// Days past tarikhAkhir
export function umurTunggakanHari(invois: InvoisRingkas, today: Date = TODAY): number {
  const tarikhAkhir = new Date(invois.tarikhAkhir)
  if (tarikhAkhir >= today) return 0
  const diff = today.getTime() - tarikhAkhir.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export type KategoriAgeing = '0_30' | '31_60' | '61_90' | 'LEBIH_90' | 'BELUM_JATUH_TEMPO'

export function kategoriAgeing(invois: InvoisRingkas, today: Date = TODAY): KategoriAgeing {
  const st = statusSel(invois, today)
  if (st === 'LUNAS' || st === 'BELUM_JATUH_TEMPO' || st === 'TIADA_INVOIS') {
    if (st === 'BELUM_JATUH_TEMPO') return 'BELUM_JATUH_TEMPO'
    return '0_30' // lunas = no ageing
  }
  const hari = umurTunggakanHari(invois, today)
  if (hari <= 30) return '0_30'
  if (hari <= 60) return '31_60'
  if (hari <= 90) return '61_90'
  return 'LEBIH_90'
}

export const AGEING_LABEL: Record<KategoriAgeing, string> = {
  '0_30': '0-30 hari',
  '31_60': '31-60 hari',
  '61_90': '61-90 hari',
  'LEBIH_90': 'Lebih 90 hari',
  'BELUM_JATUH_TEMPO': 'Belum jatuh tempo',
}

// ===== Pengiraan tunggakan =====
export interface RingkasanTunggakan {
  tunggakanSebelum: number  // 2025
  tunggakanSemasa: number   // 2026
  jumlahKeseluruhan: number
  bilBulanTertunggak: number
  umurTertinggi: KategoriAgeing
  baki2025: number
  baki2026: number
}

export function kiraRingkasanTunggakan(invoisList: InvoisRingkas[], today: Date = TODAY): RingkasanTunggakan {
  let baki2025 = 0
  let baki2026 = 0
  let bilBulanTertunggak = 0
  let umurTertinggi: KategoriAgeing = '0_30'
  const umurOrder: KategoriAgeing[] = ['0_30', '31_60', '61_90', 'LEBIH_90']

  for (const inv of invoisList) {
    const st = statusSel(inv, today)
    if (st === 'TERTUNGGAK' || st === 'SEPARA') {
      const baki = bakiBulanan(inv)
      if (inv.tahun === 2025) baki2025 += baki
      else if (inv.tahun === 2026) baki2026 += baki
      bilBulanTertunggak++
      const kat = kategoriAgeing(inv, today)
      if (umurOrder.indexOf(kat) > umurOrder.indexOf(umurTertinggi)) {
        umurTertinggi = kat
      }
    }
  }

  return {
    tunggakanSebelum: baki2025,
    tunggakanSemasa: baki2026,
    jumlahKeseluruhan: baki2025 + baki2026,
    bilBulanTertunggak,
    umurTertinggi,
    baki2025,
    baki2026,
  }
}

// ===== Skor risiko =====
// Skor = (Bilangan bulan tertunggak x 10) + (Jumlah tunggakan / RM100 x 2) + (Mata umur) + (Mungkir janji x 15)
export interface PemberatSkor {
  bulanTunggakan: number
  jumlahPerRm100: number
  umur_0_30: number
  umur_31_60: number
  umur_61_90: number
  umur_lebih_90: number
  mungkir: number
}

export const PEMBERAT_DEFAULT: PemberatSkor = {
  bulanTunggakan: 10,
  jumlahPerRm100: 2,
  umur_0_30: 0,
  umur_31_60: 10,
  umur_61_90: 20,
  umur_lebih_90: 30,
  mungkir: 15,
}

export function mataUmur(kat: KategoriAgeing, p: PemberatSkor): number {
  switch (kat) {
    case '0_30': return p.umur_0_30
    case '31_60': return p.umur_31_60
    case '61_90': return p.umur_61_90
    case 'LEBIH_90': return p.umur_lebih_90
    default: return 0
  }
}

export function kiraSkorRisiko(
  ringkasan: RingkasanTunggakan,
  bilMungkir: number,
  p: PemberatSkor = PEMBERAT_DEFAULT
): number {
  const skorBulan = ringkasan.bilBulanTertunggak * p.bulanTunggakan
  const skorJumlah = (ringkasan.jumlahKeseluruhan / 100) * p.jumlahPerRm100
  const skorUmur = mataUmur(ringkasan.umurTertinggi, p)
  const skorMungkir = bilMungkir * p.mungkir
  return Math.round(skorBulan + skorJumlah + skorUmur + skorMungkir)
}

export function kategoriRisiko(skor: number): 'RENDAH' | 'SEDERHANA' | 'TINGGI' | 'KRITIKAL' {
  if (skor < 30) return 'RENDAH'
  if (skor < 80) return 'SEDERHANA'
  if (skor < 150) return 'TINGGI'
  return 'KRITIKAL'
}

// ===== FIFO allocation =====
// Bayaran diutamakan kepada tunggakan paling lama
export interface PeruntukanFifo {
  invoisId: string
  jumlahDiperuntukkan: number
}

export function peruntukanFifo(
  jumlahBayaran: number,
  invoisList: InvoisRingkas[]
): PeruntukanFifo[] {
  // Sort by tahun asc, bulan asc
  const sorted = [...invoisList].sort((a, b) => {
    if (a.tahun !== b.tahun) return a.tahun - b.tahun
    return a.bulan - b.bulan
  })

  const result: PeruntukanFifo[] = []
  let bakiBayaran = jumlahBayaran

  for (const inv of sorted) {
    if (bakiBayaran <= 0.001) break
    const bakiInv = bakiBulanan(inv)
    if (bakiInv <= 0.001) continue
    const peruntukan = Math.min(bakiBayaran, bakiInv)
    result.push({ invoisId: inv.id, jumlahDiperuntukkan: Math.round(peruntukan * 100) / 100 })
    bakiBayaran -= peruntukan
  }

  // Jika lebihan bayaran (credit), tidak dialokasikan
  return result
}

// ===== Format RM =====
export function formatRM(jumlah: number): string {
  return new Intl.NumberFormat('ms-MY', {
    style: 'currency',
    currency: 'MYR',
    minimumFractionDigits: 2,
  }).format(jumlah)
}

export function formatRMPlain(jumlah: number): string {
  return new Intl.NumberFormat('ms-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(jumlah)
}

// ===== Status sel colors (Tailwind classes) =====
export const STATUS_SEL_STYLE: Record<StatusSel, { label: string; cellClass: string; badgeClass: string; icon: string }> = {
  LUNAS: {
    label: 'Lunas',
    cellClass: 'cell-lunas',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    icon: 'check',
  },
  SEPARA: {
    label: 'Separa',
    cellClass: 'cell-separa',
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    icon: 'circle-half',
  },
  TERTUNGGAK: {
    label: 'Tertunggak',
    cellClass: 'cell-tertunggak',
    badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    icon: 'alert',
  },
  BELUM_JATUH_TEMPO: {
    label: 'Belum jatuh tempo',
    cellClass: 'cell-belum',
    badgeClass: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    icon: 'clock',
  },
  TIADA_INVOIS: {
    label: 'Tiada invois',
    cellClass: 'cell-belum',
    badgeClass: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    icon: 'minus',
  },
}

// ===== Mask no KP (PDPA) =====
export function maskNoKp(noKp: string | null): string {
  if (!noKp) return '-'
  // Format YYMMDD-PB-NNNN -> YYMM**-**-NNNN
  if (noKp.length === 14) {
    return `${noKp.slice(0, 4)}**-**-${noKp.slice(10)}`
  }
  return noKp.slice(0, 4) + '****' + noKp.slice(-4)
}
