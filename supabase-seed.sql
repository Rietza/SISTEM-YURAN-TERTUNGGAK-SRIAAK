-- SRIAAKL - Seed data loader for Supabase
-- Run AFTER supabase-schema.sql
-- This file contains a SQL function that generates 300 murid, 12 kelas,
-- 7200 invois (Jan-Dis 2025+2026), and ~5688 bayaran with realistic distribution

-- ============================================================
-- STEP 1: Clear existing data (run only on fresh database)
-- ============================================================
TRUNCATE TABLE "PeruntukanBayaran" CASCADE;
TRUNCATE TABLE "Bayaran" CASCADE;
TRUNCATE TABLE "Invois" CASCADE;
TRUNCATE TABLE "Ansuran" CASCADE;
TRUNCATE TABLE "PelanAnsuran" CASCADE;
TRUNCATE TABLE "Pengecualian" CASCADE;
TRUNCATE TABLE "Peringatan" CASCADE;
TRUNCATE TABLE "NotaSusulan" CASCADE;
TRUNCATE TABLE "LogAudit" CASCADE;
TRUNCATE TABLE "Murid" CASCADE;
TRUNCATE TABLE "Kelas" CASCADE;
TRUNCATE TABLE "StrukturYuran" CASCADE;
TRUNCATE TABLE "Tetapan" CASCADE;
TRUNCATE TABLE "Pengguna" CASCADE;

-- ============================================================
-- STEP 2: Insert Tetapan (settings)
-- ============================================================
INSERT INTO "Tetapan" ("kunci", "nilai") VALUES
  ('PEMBERAT_BULAN_TUNGGAKAN', '10'),
  ('PEMBERAT_JUMLAH_PER_RM100', '2'),
  ('PEMBERAT_UMUR_0_30', '0'),
  ('PEMBERAT_UMUR_31_60', '10'),
  ('PEMBERAT_UMUR_61_90', '20'),
  ('PEMBERAT_UMUR_LEBIH_90', '30'),
  ('PEMBERAT_MUNGKIR', '15'),
  ('NAMA_SEKOLAH', 'Sekolah Rendah Islam Al-Amin Keramat'),
  ('KOD_SEKOLAH', 'SRIAAKL'),
  ('HARI_AKHIR_BAYAR', '10');

-- ============================================================
-- STEP 3: Insert Pengguna (users with hashed passwords)
-- Passwords hashed using SHA-256 (same algorithm as Node.js app)
-- Format: hex string, 64 chars lowercase
-- ============================================================
-- Hash values (sha256, hex):
--   pentadbir123 → 9170e11c2fa491486bb79cdb64349549b3b8d05ffd6b2254a991e8b795108cad
--   bendahari123 → 0bafbbee741b98f99c3196fef9665e36162513fa2a33be1e143d71f214d0886a
--   pengetua123  → b59d2629241cc10523b7851b868654da2e30b6b3883a6688069cd745d9e7a724
--   guru123      → ae81343369944399b70de862dbe75536faa8e44c50ad0a312e380303173f4756

INSERT INTO "Pengguna" ("id", "nama", "emel", "peranan", "kataLaluanHash", "aktif") VALUES
  ('pentadbir-001', 'Pentadbir Sistem', 'pentadbir@sriaakl.edu.my', 'PENTADBIR', '9170e11c2fa491486bb79cdb64349549b3b8d05ffd6b2254a991e8b795108cad', true),
  ('bendahari-001', 'Bendahari Yuran', 'bendahari@sriaakl.edu.my', 'BENDAHARI', '0bafbbee741b98f99c3196fef9665e36162513fa2a33be1e143d71f214d0886a', true),
  ('pengetua-001', 'Pengetua SRIAAKL', 'pengetua@sriaakl.edu.my', 'PENGETUA', 'b59d2629241cc10523b7851b868654da2e30b6b3883a6688069cd745d9e7a724', true);

-- 12 Guru Kelas (semua guna password: guru123)
INSERT INTO "Pengguna" ("id", "nama", "emel", "peranan", "kataLaluanHash", "aktif")
SELECT
  'guru-' || lpad(g::text, 2, '0'),
  'Guru Kelas ' || g::text,
  'guru' || g::text || '@sriaakl.edu.my',
  'GURU_KELAS',
  'ae81343369944399b70de862dbe75536faa8e44c50ad0a312e380303173f4756',
  true
FROM generate_series(1, 12) AS g;

-- ============================================================
-- STEP 4: Insert Struktur Yuran
-- RM150 (Tahun 1-3), RM180 (Tahun 4-6)
-- ============================================================
INSERT INTO "StrukturYuran" ("tahun", "tahunDarjah", "jenisYuran", "jumlahBulanan", "hariAkhirBayar")
SELECT t.tahun, td.tahunDarjah, 'YURAN_BULANAN',
  CASE WHEN td.tahunDarjah <= 3 THEN 150 ELSE 180 END,
  10
FROM (VALUES (2025), (2026)) AS t(tahun)
CROSS JOIN generate_series(1, 6) AS td(tahunDarjah);

-- ============================================================
-- STEP 5: Insert Kelas (12 kelas: Tahun 1-6 x 2)
-- ============================================================
INSERT INTO "Kelas" ("id", "namaKelas", "tahunDarjah", "guruKelasId")
SELECT
  'kelas-' || lpad((td * 2 - 1 + s)::text, 2, '0'),
  td::text || ' ' || CASE WHEN s = 0 THEN 'Amanah' ELSE 'Sidiq' END,
  td,
  'guru-' || lpad((td * 2 - 1 + s)::text, 2, '0')
FROM generate_series(1, 6) AS td
CROSS JOIN generate_series(0, 1) AS s;

-- ============================================================
-- STEP 6: Insert Murid (300 murid, 25 per kelas)
-- Uses random data generation - reproducible via setseed()
-- ============================================================
SELECT setseed(0.20261116); -- reproducible random data

-- Malaysian name parts
CREATE TEMP TABLE nama_depan_l AS TABLE
  (SELECT * FROM (VALUES
    ('Ahmad'), ('Muhammad'), ('Amir'), ('Aiman'), ('Farid'), ('Hafiz'),
    ('Iqbal'), ('Khairul'), ('Luqman'), ('Nasir'), ('Omar'), ('Ridhwan'),
    ('Saiful'), ('Tarmizi'), ('Umar'), ('Yusuf'), ('Zulkifli'), ('Badrul')
  ) AS t(n));
CREATE TEMP TABLE nama_depan_p AS TABLE
  (SELECT * FROM (VALUES
    ('Aisyah'), ('Balqis'), ('Diana'), ('Fatimah'), ('Husna'), ('Intan'),
    ('Juita'), ('Khalisah'), ('Lubna'), ('Maryam'), ('Nabila'), ('Norain'),
    ('Putri'), ('Qaisara'), ('Raudhah'), ('Sakinah'), ('Umi'), ('Zahrah')
  ) AS t(n));
CREATE TEMP TABLE nama_akhir AS TABLE
  (SELECT * FROM (VALUES
    ('Abdullah'), ('Rahman'), ('Hassan'), ('Ismail'), ('Yusof'), ('Karim'),
    ('Aziz'), ('Razak'), ('Salleh'), ('Othman'), ('Ibrahim'), ('Yusoff'),
    ('Latif'), ('Nordin'), ('Shafie'), ('Bakar'), ('Sani'), ('Hamzah')
  ) AS t(n));

-- Generate 300 murid (25 per kelas)
INSERT INTO "Murid" ("id", "noMurid", "nama", "kelasId", "namaPenjaga", "noTelefonPenjaga", "noKpPenjaga", "status", "tarikhDaftar")
SELECT
  'murid-' || lpad(m::text, 4, '0'),
  '2024' || lpad(m::text, 4, '0'),
  CASE WHEN random() > 0.5 THEN
    (SELECT n FROM nama_depan_l ORDER BY random() LIMIT 1) || ' ' ||
    (SELECT n FROM nama_akhir ORDER BY random() LIMIT 1) || ' ' ||
    (SELECT n FROM nama_akhir ORDER BY random() LIMIT 1)
  ELSE
    (SELECT n FROM nama_depan_p ORDER BY random() LIMIT 1) || ' ' ||
    (SELECT n FROM nama_akhir ORDER BY random() LIMIT 1) || ' ' ||
    (SELECT n FROM nama_akhir ORDER BY random() LIMIT 1)
  END,
  'kelas-' || lpad(((m - 1) / 25 + 1)::text, 2, '0'),
  (SELECT n FROM nama_depan_l ORDER BY random() LIMIT 1) || ' bin ' ||
    (SELECT n FROM nama_akhir ORDER BY random() LIMIT 1),
  '01' || lpad(floor(random() * 8 + 1)::int::text, 1, '0') || '-' ||
    lpad(floor(random() * 9000000 + 1000000)::int::text, 7, '0'),
  lpad(floor(random() * 25 + 60)::int::text, 2, '0') ||
    lpad(floor(random() * 12 + 1)::int::text, 2, '0') ||
    lpad(floor(random() * 28 + 1)::int::text, 2, '0') || '-' ||
    lpad(floor(random() * 16 + 1)::int::text, 2, '0') || '-' ||
    lpad(floor(random() * 9000 + 1000)::int::text, 4, '0'),
  CASE WHEN m = 250 THEN 'TIDAK_AKTIF' ELSE 'AKTIF' END,
  '2024-12-15'::timestamp
FROM generate_series(1, 300) AS m;

-- ============================================================
-- STEP 7: Insert Invois (Jan-Dis 2025 + 2026, ~7200 total)
-- ============================================================
INSERT INTO "Invois" ("id", "muridId", "tahun", "bulan", "jumlah", "diskaun", "tarikhAkhir")
SELECT
  'invois-' || lpad(m::text, 4, '0') || '-' || t.tahun::text || '-' || lpad(b.bulan::text, 2, '0'),
  'murid-' || lpad(m::text, 4, '0'),
  t.tahun,
  b.bulan,
  CASE WHEN k.tahunDarjah <= 3 THEN 150 ELSE 180 END,
  0,
  (make_date(t.tahun, b.bulan, 10) + interval '23 hours 59 minutes 59 seconds')::timestamp
FROM generate_series(1, 300) AS m
JOIN "Kelas" k ON k.id = 'kelas-' || lpad(((m - 1) / 25 + 1)::text, 2, '0')
CROSS JOIN (VALUES (2025), (2026)) AS t(tahun)
CROSS JOIN generate_series(1, 12) AS b(bulan);

-- ============================================================
-- STEP 8: Insert Bayaran (realistic distribution)
-- 60% bayar tepat masa, 25% kadang lewat, 10% sederhana, 5% tinggi
-- Simplified: pay full amount for ~80% of invoices that have passed tarikh akhir
-- ============================================================
-- Pay 80% of 2025 invoices
INSERT INTO "Bayaran" ("id", "muridId", "tarikhBayar", "jumlah", "kaedah", "noRujukan", "direkodOlehId")
SELECT
  'bayar-' || lpad(m::text, 4, '0') || '-2025-' || lpad(b.bulan::text, 2, '0'),
  'murid-' || lpad(m::text, 4, '0'),
  make_date(2025, b.bulan, 5 + floor(random() * 5)::int)::timestamp,
  CASE WHEN k.tahunDarjah <= 3 THEN 150 ELSE 180 END,
  CASE WHEN random() > 0.5 THEN 'TUNAI' ELSE 'DUITNOW' END,
  NULL,
  'bendahari-001'
FROM generate_series(1, 300) AS m
JOIN "Kelas" k ON k.id = 'kelas-' || lpad(((m - 1) / 25 + 1)::text, 2, '0')
CROSS JOIN generate_series(1, 12) AS b(bulan)
WHERE random() < CASE
  WHEN (m % 20) = 0 THEN 0.30  -- 5% tunggakan tinggi - only 30% paid
  WHEN (m % 10) = 0 THEN 0.60  -- 10% sederhana - 60% paid
  WHEN (m % 4) = 0 THEN 0.75   -- 25% kadang lewat - 75% paid
  ELSE 0.95                    -- 60% tepat masa - 95% paid
END;

-- Pay Nov 2026 (most paid)
INSERT INTO "Bayaran" ("id", "muridId", "tarikhBayar", "jumlah", "kaedah", "noRujukan", "direkodOlehId")
SELECT
  'bayar-' || lpad(m::text, 4, '0') || '-2026-' || lpad(b.bulan::text, 2, '0'),
  'murid-' || lpad(m::text, 4, '0'),
  make_date(2026, b.bulan, 5 + floor(random() * 5)::int)::timestamp,
  CASE WHEN k.tahunDarjah <= 3 THEN 150 ELSE 180 END,
  CASE WHEN random() > 0.5 THEN 'TUNAI' ELSE 'DUITNOW' END,
  NULL,
  'bendahari-001'
FROM generate_series(1, 300) AS m
JOIN "Kelas" k ON k.id = 'kelas-' || lpad(((m - 1) / 25 + 1)::text, 2, '0')
CROSS JOIN generate_series(1, 11) AS b(bulan)  -- Jan-Nov 2026 (Dec not yet due)
WHERE random() < CASE
  WHEN (m % 20) = 0 THEN 0.20
  WHEN (m % 10) = 0 THEN 0.40
  WHEN (m % 4) = 0 THEN 0.65
  ELSE 0.90
END;

-- ============================================================
-- STEP 9: Allocate payments to invoices (FIFO - same month)
-- ============================================================
INSERT INTO "PeruntukanBayaran" ("id", "bayaranId", "invoisId", "jumlahDiperuntukkan")
SELECT
  'peruntukan-' || b.id,
  b.id,
  'invois-' || lpad(split_part(b.id, '-', 2)::int::text, 4, '0') || '-' ||
    split_part(b.id, '-', 3) || '-' || split_part(b.id, '-', 4),
  b.jumlah
FROM "Bayaran" b
WHERE EXISTS (
  SELECT 1 FROM "Invois" i
  WHERE i.id = 'invois-' || lpad(split_part(b.id, '-', 2)::int::text, 4, '0') || '-' ||
    split_part(b.id, '-', 3) || '-' || split_part(b.id, '-', 4)
);

-- ============================================================
-- STEP 10: Insert Pengecualian (5 diskaun adik-beradik + 3 bantuan)
-- ============================================================
INSERT INTO "Pengecualian" ("id", "muridId", "jenis", "jumlah", "sebab", "diluluskanOlehId")
SELECT 'pengecualian-' || lpad(m::text, 2, '0'),
  'murid-' || lpad(m::text, 4, '0'),
  CASE WHEN m <= 5 THEN 'DISKAUN_ADIK_BERADIK' ELSE 'BANTUAN' END,
  CASE WHEN m <= 5 THEN 30 ELSE 100 END,
  CASE WHEN m <= 5 THEN 'Diskaun adik-beradik (2+ anak di sekolah)' ELSE 'Bantuan yuran asnaf' END,
  'pengetua-001'
FROM generate_series(1, 8) AS m
WHERE m <= 5 OR (m BETWEEN 51 AND 53);

-- Adjust the IDs above (use murid 1-5 and 51-53)
DELETE FROM "Pengecualian";
INSERT INTO "Pengecualian" ("id", "muridId", "jenis", "jumlah", "sebab", "diluluskanOlehId")
SELECT
  'pengecualian-' || lpad(m.rn::text, 2, '0'),
  'murid-' || lpad(m.murid::text, 4, '0'),
  m.jenis,
  m.jumlah,
  m.sebab,
  'pengetua-001'
FROM (VALUES
  (1, 1, 'DISKAUN_ADIK_BERADIK', 30, 'Diskaun adik-beradik (2+ anak di sekolah)'),
  (2, 2, 'DISKAUN_ADIK_BERADIK', 30, 'Diskaun adik-beradik (2+ anak di sekolah)'),
  (3, 3, 'DISKAUN_ADIK_BERADIK', 30, 'Diskaun adik-beradik (2+ anak di sekolah)'),
  (4, 4, 'DISKAUN_ADIK_BERADIK', 30, 'Diskaun adik-beradik (2+ anak di sekolah)'),
  (5, 5, 'DISKAUN_ADIK_BERADIK', 30, 'Diskaun adik-beradik (2+ anak di sekolah)'),
  (6, 51, 'BANTUAN', 100, 'Bantuan yuran asnaf'),
  (7, 52, 'BANTUAN', 100, 'Bantuan yuran asnaf'),
  (8, 53, 'BANTUAN', 100, 'Bantuan yuran asnaf')
) AS m(rn, murid, jenis, jumlah, sebab);

-- ============================================================
-- STEP 11: Insert Nota Susulan (30 sample)
-- ============================================================
INSERT INTO "NotaSusulan" ("id", "muridId", "jenis", "catatan", "janjiBayarTarikh", "diciptaOlehId")
SELECT
  'nota-' || lpad(n::text, 3, '0'),
  'murid-' || lpad((floor(random() * 300)::int + 1)::text, 4, '0'),
  CASE floor(random() * 4)
    WHEN 0 THEN 'PANGGILAN'
    WHEN 1 THEN 'TEMU_JANJI'
    WHEN 2 THEN 'JANJI_BAYAR'
    ELSE 'LAWATAN'
  END,
  CASE floor(random() * 4)
    WHEN 0 THEN 'Telefon penjaga, ada jawab, janji bayar minggu hadapan'
    WHEN 1 THEN 'Temu janji dengan penjaga di pejabat sekolah'
    WHEN 2 THEN 'Penjaga berjanji jelaskan tunggakan selepas gaji'
    ELSE 'Lawatan ke rumah - tiada orang'
  END,
  CASE WHEN floor(random() * 4) = 2 THEN (CURRENT_DATE + interval '7 days')::timestamp ELSE NULL END,
  'bendahari-001'
FROM generate_series(1, 30) AS n;

-- ============================================================
-- STEP 12: Insert Peringatan (40 sample)
-- ============================================================
INSERT INTO "Peringatan" ("id", "muridId", "saluran", "peringkat", "mesej", "tarikhHantar", "status", "dihantarOlehId")
SELECT
  'peringatan-' || lpad(p::text, 3, '0'),
  'murid-' || lpad((floor(random() * 300)::int + 1)::text, 4, '0'),
  CASE floor(random() * 3) WHEN 0 THEN 'WHATSAPP' WHEN 1 THEN 'SMS' ELSE 'EMEL' END,
  CASE floor(random() * 3) WHEN 0 THEN 'MESRA' WHEN 1 THEN 'TEGAS' ELSE 'NOTIS_AKHIR' END,
  CASE floor(random() * 3)
    WHEN 0 THEN 'Assalamualaikum, peringatan mesra: yuran belum diterima. Sila jelaskan sebelum tarikh akhir.'
    WHEN 1 THEN 'Dimaklumkan, yuran telah melebihi tarikh akhir bayaran. Sila hubungi pejabat sekolah segera.'
    ELSE 'NOTIS AKHIR: Tunggakan yuran telah lama tertunggak. Tindakan susulan akan diambil jika bayaran tidak diterima dalam 7 hari.'
  END,
  (CURRENT_DATE - interval '15 days' + (p || ' days')::interval)::timestamp,
  'DIHANTAR',
  'bendahari-001'
FROM generate_series(1, 40) AS p;

-- ============================================================
-- STEP 13: Insert Log Audit (5 sample)
-- ============================================================
INSERT INTO "LogAudit" ("id", "penggunaId", "tindakan", "entiti", "masa", "butiran")
VALUES
  ('audit-001', 'pentadbir-001', 'LOG_MASUK', 'PENGGUNA', NOW() - interval '5 days', 'Pentadbir log masuk'),
  ('audit-002', 'bendahari-001', 'REKOD_BAYARAN', 'BAYARAN', NOW() - interval '4 days', 'Rekod bayaran tunai'),
  ('audit-003', 'bendahari-001', 'HANTAR_PERINGATAN', 'PERINGATAN', NOW() - interval '3 days', 'Hantar peringatan WhatsApp pukal'),
  ('audit-004', 'pengetua-001', 'LULUS_PELAN_ANSURAN', 'PELAN_ANSURAN', NOW() - interval '2 days', 'Lulus pelan ansuran 4 bulan'),
  ('audit-005', 'pentadbir-001', 'KEMASKINI_STRUKTUR_YURAN', 'STRUKTUR_YURAN', NOW() - interval '1 days', 'Kemaskini yuran Tahun 4-6');

-- ============================================================
-- VERIFICATION
-- ============================================================
SELECT 'Pengguna' as jadual, COUNT(*) as bil FROM "Pengguna"
UNION ALL SELECT 'Kelas', COUNT(*) FROM "Kelas"
UNION ALL SELECT 'Murid', COUNT(*) FROM "Murid"
UNION ALL SELECT 'StrukturYuran', COUNT(*) FROM "StrukturYuran"
UNION ALL SELECT 'Invois', COUNT(*) FROM "Invois"
UNION ALL SELECT 'Bayaran', COUNT(*) FROM "Bayaran"
UNION ALL SELECT 'PeruntukanBayaran', COUNT(*) FROM "PeruntukanBayaran"
UNION ALL SELECT 'Pengecualian', COUNT(*) FROM "Pengecualian"
UNION ALL SELECT 'NotaSusulan', COUNT(*) FROM "NotaSusulan"
UNION ALL SELECT 'Peringatan', COUNT(*) FROM "Peringatan"
UNION ALL SELECT 'LogAudit', COUNT(*) FROM "LogAudit"
UNION ALL SELECT 'Tetapan', COUNT(*) FROM "Tetapan";

-- Expected counts:
-- Pengguna: 15 | Kelas: 12 | Murid: 300 | StrukturYuran: 12
-- Invois: 7200 | Bayaran: ~5000-6000 | PeruntukanBayaran: ~5000-6000
-- Pengecualian: 8 | NotaSusulan: 30 | Peringatan: 40 | LogAudit: 5 | Tetapan: 10
