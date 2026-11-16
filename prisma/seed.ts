// SRIAAKL - Seed script for dummy data
// Generates 300 murid, 12 kelas, invoices Jan-Dis 2025 & 2026, realistic payments
// Run with: bun run db:seed

import { PrismaClient } from '@prisma/client'
import { createHash } from 'crypto'

const db = new PrismaClient()

// Reference date: 16 November 2026 (per PRD)
const TODAY = new Date('2026-11-16T00:00:00Z')
const Y2025 = 2025
const Y2026 = 2026

// Malaysian-style names (rekaan)
const NAMA_DEPAN_M = ['Ahmad', 'Muhammad', 'Ahmad Faiz', 'Amir', 'Aiman', 'Farid', 'Hafiz', 'Iqbal', 'Khairul', 'Luqman', 'Muhd', 'Nasir', 'Omar', 'Ridhwan', 'Saiful', 'Tarmizi', 'Umar', 'Yusuf', 'Zulkifli', 'Badrul']
const NAMA_DEPAN_F = ['Aisyah', 'Balqis', 'Cik Nor', 'Diana', 'Fatimah', 'Husna', 'Intan', 'Juita', 'Khalisah', 'Lubna', 'Maryam', 'Nabila', 'Norain', 'Putri', 'Qaisara', 'Raudhah', 'Sakinah', 'Tengku', 'Umi', 'Zahrah']
const NAMA_TENGAH = ['Nur', 'Siti', 'Binti', 'Bin', 'Al-', 'Nurul', 'Mastura', 'Ainaa', 'Hanani', 'Afidah']
const NAMA_AKHIR = ['Abdullah', 'Rahman', 'Hassan', 'Ismail', 'Yusof', 'Karim', 'Aziz', 'Razak', 'Salleh', 'Othman', 'Ibrahim', 'Yusoff', 'Latif', 'Nordin', 'Shafie', 'Bakar', 'Sani', 'Wan', 'Tahir', 'Hamzah']
const NAMA_PENJAGA = ['bin Ali', 'bin Hassan', 'bin Rahman', 'bin Ismail', 'bin Yusof', 'bin Karim', 'binti Omar', 'binti Salleh', 'binti Othman', 'binti Ibrahim']
const NAMA_KELAS_ISLAM = ['Amanah', 'Sidiq', 'Fathonah', 'Tabligh']

// Password hash helper (dummy sha256)
function hash(p: string) {
  return createHash('sha256').update(p).digest('hex')
}

function pick<T>(arr: T[], rng: number): T {
  return arr[Math.floor(rng * arr.length) % arr.length]
}

// Seeded PRNG (mulberry32) for reproducibility
function mulberry32(seed: number) {
  let a = seed
  return function () {
    a |= 0
    a = (a + 0x6D2B79F5) | 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeName(rng: () => number, jantina: 'L' | 'P') {
  const depans = jantina === 'L' ? NAMA_DEPAN_M : NAMA_DEPAN_F
  const nama = `${pick(depans, rng())} ${pick(NAMA_AKHIR, rng())} ${pick(NAMA_AKHIR, rng())}`
  return nama
}

function makePhone(rng: () => number) {
  const prefix = pick(['011', '012', '013', '014', '017', '018', '019'], rng())
  const rest = Math.floor(1000000 + rng() * 8999999).toString().slice(0, 7)
  return `${prefix}${rest.slice(0,3)}${rest.slice(3)}`
}

function makeKp(rng: () => number) {
  const yy = Math.floor(60 + rng() * 25).toString().padStart(2, '0')
  const mm = Math.floor(1 + rng() * 12).toString().padStart(2, '0')
  const dd = Math.floor(1 + rng() * 28).toString().padStart(2, '0')
  const pb = Math.floor(1 + rng() * 16).toString().padStart(2, '0')
  const last = Math.floor(1000 + rng() * 8999).toString()
  return `${yy}${mm}${dd}-${pb}-${last}`
}

async function main() {
  console.log('Memadam data lama...')
  await db.peruntukanBayaran.deleteMany()
  await db.bayaran.deleteMany()
  await db.invois.deleteMany()
  await db.ansuran.deleteMany()
  await db.pelanAnsuran.deleteMany()
  await db.pengecualian.deleteMany()
  await db.peringatan.deleteMany()
  await db.notaSusulan.deleteMany()
  await db.logAudit.deleteMany()
  await db.murid.deleteMany()
  await db.kelas.deleteMany()
  await db.strukturYuran.deleteMany()
  await db.tetapan.deleteMany()
  await db.pengguna.deleteMany()

  // ===== Tetapan: pemberat skor risiko =====
  await db.tetapan.createMany({
    data: [
      { kunci: 'PEMBERAT_BULAN_TUNGGAKAN', nilai: '10' },
      { kunci: 'PEMBERAT_JUMLAH_PER_RM100', nilai: '2' },
      { kunci: 'PEMBERAT_UMUR_0_30', nilai: '0' },
      { kunci: 'PEMBERAT_UMUR_31_60', nilai: '10' },
      { kunci: 'PEMBERAT_UMUR_61_90', nilai: '20' },
      { kunci: 'PEMBERAT_UMUR_LEBIH_90', nilai: '30' },
      { kunci: 'PEMBERAT_MUNGKIR', nilai: '15' },
      { kunci: 'NAMA_SEKOLAH', nilai: 'Sekolah Rendah Islam Al-Amin Keramat' },
      { kunci: 'KOD_SEKOLAH', nilai: 'SRIAAKL' },
      { kunci: 'HARI_AKHIR_BAYAR', nilai: '10' },
    ],
  })

  // ===== Pengguna =====
  const pentadbir = await db.pengguna.create({ data: { nama: 'Pentadbir Sistem', emel: 'pentadbir@sriaakl.edu.my', peranan: 'PENTADBIR', kataLaluanHash: hash('pentadbir123') } })
  const bendahari = await db.pengguna.create({ data: { nama: 'Bendahari Yuran', emel: 'bendahari@sriaakl.edu.my', peranan: 'BENDAHARI', kataLaluanHash: hash('bendahari123') } })
  const pengetua = await db.pengguna.create({ data: { nama: 'Pengetua SRIAAKL', emel: 'pengetua@sriaakl.edu.my', peranan: 'PENGETUA', kataLaluanHash: hash('pengetua123') } })
  const guruList: { id: string }[] = []
  for (let i = 1; i <= 12; i++) {
    const g = await db.pengguna.create({ data: { nama: `Guru Kelas ${i}`, emel: `guru${i}@sriaakl.edu.my`, peranan: 'GURU_KELAS', kataLaluanHash: hash('guru123') } })
    guruList.push(g)
  }
  console.log('Pengguna: 15 dicipta')

  // ===== Struktur Yuran =====
  // RM150 (Tahun 1-3), RM180 (Tahun 4-6)
  for (const tahun of [Y2025, Y2026]) {
    for (let td = 1; td <= 6; td++) {
      await db.strukturYuran.create({
        data: {
          tahun,
          tahunDarjah: td,
          jenisYuran: 'YURAN_BULANAN',
          jumlahBulanan: td <= 3 ? 150 : 180,
          hariAkhirBayar: 10,
        },
      })
    }
  }
  console.log('Struktur yuran: 12 dicipta')

  // ===== Kelas (12 kelas: Tahun 1-6 x 2) =====
  const kelasList: { id: string; tahunDarjah: number; namaKelas: string }[] = []
  for (let td = 1; td <= 6; td++) {
    for (let s = 0; s < 2; s++) {
      const namaKelas = `${td} ${NAMA_KELAS_ISLAM[s]}`
      const guruIdx = (td - 1) * 2 + s
      const k = await db.kelas.create({
        data: {
          namaKelas,
          tahunDarjah: td,
          guruKelasId: guruList[guruIdx].id,
        },
      })
      kelasList.push(k)
    }
  }
  console.log('Kelas: 12 dicipta')

  // ===== Murid (300 murid, 25 per kelas) =====
  const rng = mulberry32(20261116)
  const muridList: { id: string; kelasId: string; nama: string; noMurid: string; tahunDarjah: number; namaPenjaga: string; noTelefonPenjaga: string; status: string; profilBayaran: 'TEPAT_MASA' | 'KADANG_LEWAT' | 'TUNGGAKAN_SEDERHANA' | 'TUNGGAKAN_TINGGI' }[] = []
  // Distribute profiles: 60% tepat, 25% kadang lewat, 10% sederhana, 5% tinggi (300 murid)
  const profiles: ('TEPAT_MASA' | 'KADANG_LEWAT' | 'TUNGGAKAN_SEDERHANA' | 'TUNGGAKAN_TINGGI')[] = []
  for (let i = 0; i < 300; i++) {
    const r = rng()
    if (r < 0.60) profiles.push('TEPAT_MASA')
    else if (r < 0.85) profiles.push('KADANG_LEWAT')
    else if (r < 0.95) profiles.push('TUNGGAKAN_SEDERHANA')
    else profiles.push('TUNGGAKAN_TINGGI')
  }
  // shuffle
  for (let i = profiles.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[profiles[i], profiles[j]] = [profiles[j], profiles[i]]
  }

  let muridCounter = 1
  for (const kelas of kelasList) {
    for (let n = 0; n < 25; n++) {
      const jantina = rng() > 0.5 ? 'L' : 'P'
      const nama = makeName(rng, jantina)
      const noMurid = `2024${String(muridCounter).padStart(4, '0')}`
      const namaPenjaga = `${pick(NAMA_DEPAN_M, rng())} ${pick(NAMA_PENJAGA, rng())}`
      const noTelefon = makePhone(rng)
      const noKp = makeKp(rng)
      const status = (muridCounter === 250) ? 'TIDAK_AKTIF' : 'AKTIF' // 1 murid tidak aktif
      const m = await db.murid.create({
        data: {
          noMurid,
          nama,
          kelasId: kelas.id,
          namaPenjaga,
          noTelefonPenjaga: noTelefon,
          noKpPenjaga: noKp,
          status,
          tarikhDaftar: new Date('2024-12-15'),
        },
      })
      muridList.push({
        id: m.id,
        kelasId: kelas.id,
        nama,
        noMurid,
        tahunDarjah: kelas.tahunDarjah,
        namaPenjaga,
        noTelefonPenjaga: noTelefon,
        status,
        profilBayaran: profiles[muridCounter - 1],
      })
      muridCounter++
    }
  }
  console.log(`Murid: ${muridList.length} dicipta`)

  // ===== Invois + Bayaran =====
  const BULAN = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  let invoisCount = 0
  let bayaranCount = 0

  for (const m of muridList) {
    const yuranBulanan = m.tahunDarjah <= 3 ? 150 : 180

    for (const tahun of [Y2025, Y2026]) {
      for (const bulan of BULAN) {
        // Disember 2026 belum jatuh tempo (hari ini 16 Nov 2026)
        const tarikhAkhir = new Date(Date.UTC(tahun, bulan - 1, 10, 23, 59, 59))
        const inv = await db.invois.create({
          data: {
            muridId: m.id,
            tahun,
            bulan,
            jumlah: yuranBulanan,
            diskaun: 0,
            tarikhAkhir,
          },
        })
        invoisCount++

        // Determine if & when to pay based on profile and year/month
        const is2026Future = (tahun === Y2026 && bulan >= 11) // Nov 2026 lepas tarikh akhir (10hb), Dis belum
        const isNov2026 = (tahun === Y2026 && bulan === 11)
        // 16 Nov 2026: Jan-Oct 2026 sudah jatuh tempo, Nov lepas 10hb (jadi tertunggak), Dis belum jatuh
        const sudahJatuhTempo = tarikhAkhir.getTime() < TODAY.getTime()

        const prof = m.profilBayaran
        let akanBayar = false
        let bayarTanggal: number | null = null // day of month paid
        let bayarJumlah: number | null = null
        let bayarBulanOffset = 0 // 0 = same month, 1 = next month, etc.
        let kaedah: 'TUNAI' | 'FPX' | 'DUITNOW' | 'CEK' = 'TUNAI'

        // Disember 2026: tiada bayaran (masa hadapan)
        if (tahun === Y2026 && bulan === 12) {
          // skip
        } else if (tahun === Y2025) {
          // 2025 lengkap
          if (prof === 'TEPAT_MASA') {
            akanBayar = true
            bayarTanggal = 5 + Math.floor(rng() * 5) // 5-9hb
            bayarBulanOffset = 0
            bayarJumlah = yuranBulanan
            kaedah = rng() > 0.5 ? 'TUNAI' : 'DUITNOW'
          } else if (prof === 'KADANG_LEWAT') {
            akanBayar = rng() > 0.25 // 75% paid
            if (akanBayar) {
              bayarBulanOffset = rng() > 0.5 ? 0 : 1
              bayarTanggal = bayarBulanOffset === 0 ? 12 + Math.floor(rng() * 8) : 3 + Math.floor(rng() * 7)
              bayarJumlah = yuranBulanan
              kaedah = 'TUNAI'
            }
          } else if (prof === 'TUNGGAKAN_SEDERHANA') {
            // bayar 60% bulan, lewat 1-3 bulan
            akanBayar = rng() > 0.4
            if (akanBayar) {
              bayarBulanOffset = Math.floor(rng() * 3) + 1
              bayarTanggal = 5 + Math.floor(rng() * 20)
              bayarJumlah = yuranBulanan
              kaedah = 'CEK'
            }
          } else {
            // TUNGGAKAN_TINGGI: bayar 30% bulan sahaja, lewat banyak
            akanBayar = rng() > 0.7
            if (akanBayar) {
              bayarBulanOffset = Math.floor(rng() * 4) + 2
              bayarTanggal = 5 + Math.floor(rng() * 20)
              bayarJumlah = yuranBulanan
              kaedah = 'CEK'
            }
          }
        } else {
          // 2026
          if (prof === 'TEPAT_MASA') {
            if (sudahJatuhTempo || isNov2026) {
              akanBayar = true
              bayarTanggal = 5 + Math.floor(rng() * 4) // 5-8hb
              bayarJumlah = yuranBulanan
              bayarBulanOffset = 0
              kaedah = rng() > 0.5 ? 'DUITNOW' : 'TUNAI'
            }
          } else if (prof === 'KADANG_LEWAT') {
            if (sudahJatuhTempo) {
              akanBayar = rng() > 0.3
              if (akanBayar) {
                bayarBulanOffset = rng() > 0.5 ? 0 : 1
                bayarTanggal = bayarBulanOffset === 0 ? 15 + Math.floor(rng() * 10) : 3 + Math.floor(rng() * 7)
                bayarJumlah = yuranBulanan
                kaedah = 'TUNAI'
              }
            }
          } else if (prof === 'TUNGGAKAN_SEDERHANA') {
            if (sudahJatuhTempo && bulan <= 9) {
              akanBayar = rng() > 0.5
              if (akanBayar) {
                bayarBulanOffset = Math.floor(rng() * 2) + 1
                bayarTanggal = 5 + Math.floor(rng() * 20)
                bayarJumlah = yuranBulanan
                kaedah = 'CEK'
              }
            } else if (bulan <= 6) {
              // bayar separa untuk bulan awal
              akanBayar = rng() > 0.6
              if (akanBayar) {
                bayarBulanOffset = 1
                bayarTanggal = 5 + Math.floor(rng() * 15)
                bayarJumlah = Math.floor(yuranBulanan * 0.5) // separa
                kaedah = 'TUNAI'
              }
            }
          } else {
            // TUNGGAKAN_TINGGI - sebahagian bayar Jan/Feb sahaja
            if (bulan <= 2) {
              akanBayar = rng() > 0.6
              if (akanBayar) {
                bayarBulanOffset = 2
                bayarTanggal = 10 + Math.floor(rng() * 15)
                bayarJumlah = yuranBulanan
                kaedah = 'CEK'
              }
            }
          }
        }

        if (akanBayar && bayarTanggal !== null && bayarJumlah !== null) {
          // Compute payment date
          let payYear = tahun
          let payMonth = bulan + bayarBulanOffset
          while (payMonth > 12) {
            payMonth -= 12
            payYear++
          }
          // For 2026 future months, clamp to TODAY
          let payDate = new Date(Date.UTC(payYear, payMonth - 1, bayarTanggal, 10, 0, 0))
          if (payDate > TODAY) payDate = TODAY

          const bayaran = await db.bayaran.create({
            data: {
              muridId: m.id,
              tarikhBayar: payDate,
              jumlah: bayarJumlah,
              kaedah,
              noRujukan: kaedah === 'TUNAI' ? null : `REF-${payYear}${String(payMonth).padStart(2,'0')}${String(m.noMurid).slice(-4)}`,
              direkodOlehId: bendahari.id,
            },
          })
          bayaranCount++

          // Allocate to this invoice (and possibly prior invoices FIFO if partial)
          // Simplified: allocate full or partial to this invoice
          await db.peruntukanBayaran.create({
            data: {
              bayaranId: bayaran.id,
              invoisId: inv.id,
              jumlahDiperuntukkan: Math.min(bayarJumlah, yuranBulanan),
            },
          })
        }
      }
    }
  }
  console.log(`Invois: ${invoisCount}, Bayaran: ${bayaranCount}`)

  // ===== Pengecualian untuk beberapa murid (diskaun adik-beradik) =====
  // First 5 students get sibling discount
  for (let i = 0; i < 5; i++) {
    await db.pengecualian.create({
      data: {
        muridId: muridList[i].id,
        jenis: 'DISKAUN_ADIK_BERADIK',
        jumlah: 30,
        sebab: 'Diskaun adik-beradik (2+ anak di sekolah)',
        diluluskanOlehId: pengetua.id,
      },
    })
  }
  // Bantuan for 3 students
  for (let i = 50; i < 53; i++) {
    await db.pengecualian.create({
      data: {
        muridId: muridList[i].id,
        jenis: 'BANTUAN',
        jumlah: 100,
        sebab: 'Bantuan yuran asnaf',
        diluluskanOlehId: pengetua.id,
      },
    })
  }
  console.log('Pengecualian: 8 dicipta')

  // ===== Pelan Ansuran untuk 3 murid tunggakan tinggi =====
  const tinggiMurid = muridList.filter(m => m.profilBayaran === 'TUNGGAKAN_TINGGI').slice(0, 3)
  for (const m of tinggiMurid) {
    const pelan = await db.pelanAnsuran.create({
      data: {
        muridId: m.id,
        jumlahKeseluruhan: 600,
        bilAnsuran: 4,
        status: 'AKTIF',
        sebab: 'Pelan ansuran 4 bulan untuk tunggakan 2025',
        diluluskanOlehId: pengetua.id,
      },
    })
    for (let i = 1; i <= 4; i++) {
      const tarikhAkhir = new Date(Date.UTC(2026, 9 + i - 1, 10)) // Oct 2026, Nov, Dec, Jan 2027
      const status = i === 1 ? 'MUNGKIR' : i === 2 ? 'DIBAYAR' : 'BELUM'
      await db.ansuran.create({
        data: {
          pelanId: pelan.id,
          bil: i,
          tarikhAkhir,
          jumlah: 150,
          status,
          tarikhBayar: status === 'DIBAYAR' ? new Date(Date.UTC(2026, 10, 8)) : null,
        },
      })
    }
  }
  console.log('Pelan ansuran: 3 dengan 12 ansuran')

  // ===== Nota Susulan untuk 10 murid tertunggak =====
  const notaJenis = ['PANGGILAN', 'TEMU_JANJI', 'JANJI_BAYAR', 'LAWATAN']
  for (let i = 0; i < 30; i++) {
    const m = muridList[Math.floor(rng() * muridList.length)]
    const jenis = pick(notaJenis, rng())
    const janjiBayar = jenis === 'JANJI_BAYAR' ? new Date(Date.UTC(2026, 10, 20 + Math.floor(rng() * 10))) : null
    await db.notaSusulan.create({
      data: {
        muridId: m.id,
        jenis,
        catatan: jenis === 'PANGGILAN' ? `Telefon penjaga ${m.namaPenjaga}, ada jawab, janji bayar minggu hadapan` :
                 jenis === 'TEMU_JANJI' ? `Temu janji dengan penjaga di pejabat sekolah` :
                 jenis === 'JANJI_BAYAR' ? `Penjaga berjanji jelaskan tunggakan selepas gaji` :
                 `Lawatan ke rumah - tiada orang`,
        janjiBayarTarikh: janjiBayar,
        diciptaOlehId: bendahari.id,
      },
    })
  }
  console.log('Nota susulan: 30 dicipta')

  // ===== Peringatan (log simulasi) =====
  const saluran = ['WHATSAPP', 'SMS', 'EMEL']
  const peringkat = ['MESRA', 'TEGAS', 'NOTIS_AKHIR']
  for (let i = 0; i < 40; i++) {
    const m = muridList[Math.floor(rng() * muridList.length)]
    const sl = pick(saluran, rng())
    const pg = pick(peringkat, rng())
    const tarikh = new Date(Date.UTC(2026, 10, 1 + Math.floor(rng() * 15)))
    const mesej = pg === 'MESRA' ? `Assalamualaikum ${m.namaPenjaga}, peringatan mesra: yuran ${m.nama} untuk bulan ini belum diterima. Sila jelaskan sebelum tarikh akhir. Terima kasih.` :
                 pg === 'TEGAS' ? `Dimaklumkan ${m.namaPenjaga}, yuran ${m.nama} telah melebihi tarikh akhir bayaran. Sila hubungi pejabat sekolah segera.` :
                 `NOTIS AKHIR: Tunggakan yuran ${m.nama} telah lama tertunggak. Tindakan susulan akan diambil jika bayaran tidak diterima dalam 7 hari.`
    await db.peringatan.create({
      data: {
        muridId: m.id,
        saluran: sl,
        peringkat: pg,
        mesej,
        tarikhHantar: tarikh,
        status: 'DIHANTAR',
        dihantarOlehId: bendahari.id,
      },
    })
  }
  console.log('Peringatan: 40 dicipta')

  // ===== Log Audit =====
  const auditTindakan = [
    { penggunaId: pentadbir.id, tindakan: 'LOG_MASUK', entiti: 'PENGGUNA', butiran: 'Pentadbir log masuk' },
    { penggunaId: bendahari.id, tindakan: 'REKOD_BAYARAN', entiti: 'BAYARAN', butiran: 'Rekod bayaran tunai' },
    { penggunaId: bendahari.id, tindakan: 'HANTAR_PERINGATAN', entiti: 'PERINGATAN', butiran: 'Hantar peringatan WhatsApp pukal' },
    { penggunaId: pengetua.id, tindakan: 'LULUS_PELAN_ANSURAN', entiti: 'PELAN_ANSURAN', butiran: 'Lulus pelan ansuran 4 bulan' },
    { penggunaId: pentadbir.id, tindakan: 'KEMASKINI_STRUKTUR_YURAN', entiti: 'STRUKTUR_YURAN', butiran: 'Kemaskini yuran Tahun 4-6' },
  ]
  for (let i = 0; i < auditTindakan.length; i++) {
    const a = auditTindakan[i]
    await db.logAudit.create({
      data: {
        ...a,
        masa: new Date(Date.UTC(2026, 10, 10 + i, 9 + i, 30)),
      },
    })
  }
  console.log('Log audit: 5 dicipta')

  console.log('\n=== SEED SELESAI ===')
  console.log(`- ${15} pengguna`)
  console.log(`- 12 kelas`)
  console.log(`- ${muridList.length} murid`)
  console.log(`- ${invoisCount} invois (2025 + 2026)`)
  console.log(`- ${bayaranCount} bayaran`)
  console.log(`- 3 pelan ansuran (12 ansuran)`)
  console.log(`- 8 pengecualian`)
  console.log(`- 40 peringatan`)
  console.log(`- 30 nota susulan`)
  console.log(`- 5 log audit`)
  console.log('\nLog masuk demo:')
  console.log('  Pentadbir: pentadbir@sriaakl.edu.my / pentadbir123')
  console.log('  Bendahari: bendahari@sriaakl.edu.my / bendahari123')
  console.log('  Pengetua:  pengetua@sriaakl.edu.my / pengetua123')
  console.log('  Guru:      guru1@sriaakl.edu.my / guru123')
}

main()
  .catch((e) => {
    console.error('Ralat seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
