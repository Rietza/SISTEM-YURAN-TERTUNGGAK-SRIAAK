# SRIAAKL — Sistem Pemantauan Tunggakan Yuran Murid

**Sekolah Rendah Islam Al-Amin Keramat (SRIAAKL)**

Sistem kewangan berasaskan web untuk memantau tunggakan yuran murid — prototaip Fasa 1 dengan pangkalan data dummy. Dibangunkan mengikut Dokumen Keperluan Produk (PRD) v1.0.

---

## Ciri Utama

| ID | Ciri | Status |
|----|------|--------|
| FR-01 | Log masuk & kawalan akses mengikut peranan (RBAC) | ✅ |
| FR-02 | Papan pemuka tunggakan (jumlah, kadar kutipan, ageing, 10 penunggak tertinggi) | ✅ |
| FR-03 | Jadual tunggakan setiap murid Jan-Dis dengan sel diwarnakan mengikut status | ✅ |
| FR-04 | Pilihan tahun semasa (2026) / sebelum (2025) / bandingan | ✅ |
| FR-05 | Profil kewangan murid (invois, bayaran, baki, garis masa tindakan) | ✅ |
| FR-06 | Carian dan penapis (kelas, tahun, bulan, status, julat jumlah, umur tunggakan) | ✅ |
| FR-07 | Pengelasan umur tunggakan (ageing): 0-30, 31-60, 61-90, lebih 90 hari | ✅ |
| FR-08 | Senarai keutamaan tindakan (skor risiko) | ✅ |
| FR-09 | Rekod bayaran dengan peruntukan FIFO automatik | ✅ |
| FR-10 | Peringatan (templat BM 3 peringkat: mesra, tegas, notis akhir) — simulasi | ✅ |
| FR-11 | Pelan ansuran dengan pantauan mungkir | ✅ |
| FR-12 | Nota dan tindakan susulan (garis masa) | ✅ |
| FR-13 | Pengecualian / bantuan (diskaun adik-beradik, bantuan asnaf) | ✅ |
| FR-14 | Laporan dan eksport Excel/CSV/PDF | ✅ |
| FR-15 | Log audit | ✅ |
| FR-16 | Tetapan struktur yuran (boleh diubah) | ✅ |

## Peranan Pengguna (RBAC)

| Peranan | Akses |
|---------|-------|
| Pentadbir Sistem | Akses penuh (semua modul + tetapan) |
| Bendahari | Rekod bayaran, jana invois, hantar peringatan, urus pelan ansuran |
| Guru Kelas | Lihat status yuran murid kelas sendiri, tambah nota susulan |
| Pengetua / Guru Besar | Pantau keseluruhan, muat turun laporan, lulus pengecualian/ansuran |

## Akaun Demo

| Peranan | Emel | Kata Laluan |
|---------|------|-------------|
| Pentadbir | `pentadbir@sriaakl.edu.my` | `pentadbir123` |
| Bendahari | `bendahari@sriaakl.edu.my` | `bendahari123` |
| Pengetua | `pengetua@sriaakl.edu.my` | `pengetua123` |
| Guru Kelas | `guru1@sriaakl.edu.my` | `guru123` |

## Timbunan Teknologi

- **Framework**: Next.js 16 (App Router) + TypeScript 5
- **UI**: Tailwind CSS 4 + shadcn/ui (New York) + Lucide icons
- **Carta**: Recharts
- **Jadual data**: TanStack Table
- **Pangkalan Data**: Prisma ORM + SQLite (dummy data)
- **Penjanaan data benih**: Skrip TypeScript seed.ts
- **Tema**: Dark Mode (emerald/teal pada deep slate)

## Struktur Projek

```
prisma/
  schema.prisma       # 13 jadual: Pengguna, Kelas, Murid, Invois, Bayaran, ...
  seed.ts             # Skrip penjanaan data dummy (300 murid, 7200 invois)
src/
  app/
    api/              # 13 route handlers (auth, dashboard, murid, bayaran, ...)
    layout.tsx        # Root layout dengan ThemeProvider
    page.tsx          # Halaman utama (log masuk + app shell)
    globals.css       # Tema gelap + warna sel status
  components/
    modules/          # 11 modul (dashboard, tunggakan, profil-murid, bayaran, ...)
    shared/           # API client, StatCard, helpers
    ui/               # shadcn/ui components
    auth-context.tsx  # RBAC context + localStorage session
    app-shell.tsx     # Sidebar navigation + module dispatcher
    login-screen.tsx  # Halaman log masuk
    theme-provider.tsx
  lib/
    db.ts             # Prisma client singleton
    tunggakan.ts      # Logik pengiraan: baki, ageing, skor, FIFO, format RM
```

## Pemasangan & Menjalankan

```bash
# 1. Pasang dependencies
bun install

# 2. Cipta fail .env dengan:
echo 'DATABASE_URL="file:/home/z/my-project/db/custom.db"' > .env

# 3. Push skema Prisma ke SQLite
bun run db:push

# 4. Jana data dummy (300 murid, 12 kelas, 7200 invois, 5688 bayaran)
bun run prisma/seed.ts

# 5. Jalankan dev server
bun run dev
```

Buka `http://localhost:3000` dan log masuk dengan akaun demo di atas.

## Logik Pengiraan Tunggakan

Semua logik terletak di `src/lib/tunggakan.ts`:

- **Baki bulanan** = Jumlah invois − Bayaran dipadankan − Diskaun
- **Tertunggak** = baki > 0 DAN tarikh hari ini melepasi tarikh akhir
- **Tunggakan sebelum** = jumlah baki tertunggak bagi 2025
- **Tunggakan semasa** = jumlah baki tertunggak bagi 2026 (Jan-Nov)
- **Umur tunggakan**: hari dari tarikh akhir → kategori (0-30 / 31-60 / 61-90 / >90)
- **Peruntukan FIFO**: bayaran diutamakan kepada tunggakan paling lama
- **Skor risiko** = (bil bulan tertunggak × 10) + (jumlah ÷ RM100 × 2) + mata umur + (mungkir × 15)

## Pematuhan PDPA 2010

- No. kad pengenalan penjaga disamarkan (`0101**-**-1234`) kecuali untuk peranan tertentu
- RBAC: setiap peranan hanya lihat data yang berkaitan
- Log audit: siapa mengubah apa dan bila
- Tiada data sebenar murid digunakan dalam prototaip ini

## Eksport Laporan

- **CSV** — muat turun terus (Excel-compatible dengan BOM UTF-8)
- **PDF** — cetak melalui dialog browser (lengkap dengan header SRIAAKL)
- **Excel** — fail .xls (CSV fallback dengan tab-separated untuk Excel)

## Nota

- Tarikh rujukan sistem: **16 November 2026** (Januari-November 2026 telah jatuh tempo, Disember belum)
- Yuran bulanan: **RM150** (Tahun 1-3), **RM180** (Tahun 4-6)
- Tarikh akhir bayaran: **10hb** setiap bulan
- Taburan data: 60% bayar tepat masa, 25% kadang-kadang lewat, 10% tunggakan sederhana, 5% tunggakan tinggi

## Peralihan ke API Sebenar (Fasa 3)

Lapisan akses data diasingkan dalam `src/app/api/`. Untuk sambung ke pangkalan data sebenar:
1. Tukar `prisma/schema.prisma` `datasource` ke MySQL/PostgreSQL
2. Kemas kini `DATABASE_URL` dalam `.env`
3. Jalankan `bun run db:push` semula
4. Import data murid sebenar melalui skrip import (Fasa 3)

## Lesen

Prototaip untuk kegunaan dalaman SRIAAKL. Hak cipta © 2026 Sekolah Rendah Islam Al-Amin Keramat.
