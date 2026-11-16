# Task 9-10: 7 Module Files Implementation

## Files created (all 7)

1. `/home/z/my-project/src/components/modules/peringatan.tsx` — Peringatan (Reminder) module
2. `/home/z/my-project/src/components/modules/ansuran.tsx` — Pelan Ansuran (Installment Plan) module
3. `/home/z/my-project/src/components/modules/nota.tsx` — Nota Susulan (Follow-up Note) module
4. `/home/z/my-project/src/components/modules/pengecualian.tsx` — Pengecualian/Bantuan (Exemption/Aid) module
5. `/home/z/my-project/src/components/modules/laporan.tsx` — Laporan & Eksport (Report & Export) module
6. `/home/z/my-project/src/components/modules/tetapan.tsx` — Tetapan (Settings) module
7. `/home/z/my-project/src/components/modules/audit-log.tsx` — Log Audit module

## Lint status
All 7 module files pass `bunx eslint` with no errors or warnings.
(One pre-existing lint error in `auth-context.tsx` is outside scope — not modified.)

## Design decisions

### Common patterns across all modules
- All start with `'use client'`
- Dark-mode-friendly Tailwind: `bg-card/40`, `border-border/40`, `text-muted-foreground`
- Status badges use emerald/amber/rose/slate/sky (NOT indigo/blue)
- Responsive grids: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Loading skeletons via `animate-pulse`
- Error states with `AlertCircle` icon + retry button
- Empty states with icon + message
- Forms inside `Dialog` use `DialogFooter` with Batal + Simpan buttons
- Toast notifications on all mutations via `sonner`
- `pengguna.id` from `useAuth()` used as `dihantarOlehId` / `diciptaOlehId` / `diluluskanOlehId`
- Murid search reuses `/api/murid?cari=&pageSize=` with 250ms debounce (same pattern as `bayaran.tsx`)

### peringatan.tsx
- 3-column composer + 2-column log layout (lg:grid-cols-5)
- Three message templates: MESRA (greeting), TEGAS (warning), NOTIS_AKHIR (final notice)
- Multi-select via Checkbox with "Pilih Semua" toggle
- Live preview using first selected student's data (or placeholder defaults)
- After send: clears selection, refreshes log, toast with bilDihantar
- Right log panel: scrollable, badges for saluran + peringkat, clickable to open murid profile
- Status icon: CheckCircle2 (BERJAYA) / AlertCircle (other)

### ansuran.tsx
- 3 stat cards at top: active plans, outstanding balance, mungkir count
- Plan cards in `grid-cols-1 md:grid-cols-2` with Collapsible expand
- Each ansuran row has inline Select dropdown for status (BELUM/DIBAYAR/MUNGKIR)
- When marking DIBAYAR, automatically sets tarikhBayar = TODAY
- Dialog includes live per-ansuran estimate (jumlah/bilAnsuran)
- Plan-level status badge: AKTIF/SELESAI/MUNGKIR/DIBATAL
- Murid name clickable to open profile

### nota.tsx
- 5 stat cards for current month (PANGGILAN/TEMU_JANJI/JANJI_BAYAR/LAWATAN/LAIN)
- Timeline view grouped by date (sticky date headers)
- Each entry has jenis badge with icon, clickable murid name, calendar badge if janjiBayarTarikh exists
- Filter by jenis + free-text search
- Uses `Collapsible`? No - uses simple grouping

### pengecualian.tsx
- 4 stat cards: total diskaun, total bantuan, total pengecualian, count
- Card grid layout (`md:grid-cols-2 lg:grid-cols-3`)
- Each card has jenis badge with icon, jumlah (primary color), sebab (line-clamp-3), approver info
- Filter by jenis + search

### laporan.tsx
- Three filter controls: jenis / tahun / kelas (kelas loaded from /api/kelas)
- Auto-loads preview on filter change (200ms debounce)
- Summary stats card grid (up to 8 summary fields)
- Preview table: max 200 rows, auto-detects jumlah/baki/total columns and formats as RM
- Three export buttons:
  - CSV: calls API with `format=csv`, falls back to `jsonKeCsv(rows)` if no csv field
  - Excel: downloads same CSV content as `.xls` extension
  - PDF: uses `cetakPdf()` with HTML table

### tetapan.tsx
- 4 tabs via shadcn Tabs component
- Struktur Yuran: editable Table with inline Select for tahun/tahunDarjah/jenisYuran, Input for jumlahBulanan/hariAkhirBayar, add/delete buttons, save button
- Pemberat Skor: shows formula explanation card + 7 pemberat inputs with descriptions
- Maklumat Sekolah: 3 simple inputs (NAMA_SEKOLAH, KOD_SEKOLAH, HARI_AKHIR_BAYAR)
- Pengguna: read-only table with peranan badge (PERANAN_LABEL from auth-context) and disabled Switch for aktif status
- All saves use PUT /api/tetapan with appropriate body shape

### audit-log.tsx
- 3 stat cards: logs today, unique pengguna, total logs
- Free-text search across tindakan/namaPengguna/entiti/butiran
- Scrollable Table with color-coded tindakan badges (emerald=create, amber=update, rose=delete, sky=login, slate=other)
- Peranan badges color-coded by role
- BilHariIni computed against TODAY constant from lib/tunggakan

## APIs used (per spec)
- /api/peringatan (GET, POST)
- /api/ansuran (GET, POST, PATCH)
- /api/nota (GET, POST)
- /api/pengecualian (GET, POST)
- /api/laporan (GET with format=json|csv)
- /api/tetapan (GET, PUT)
- /api/audit (GET with limit)
- /api/kelas (GET) — for Laporan kelas filter
- /api/murid (GET) — for student search in all create dialogs
