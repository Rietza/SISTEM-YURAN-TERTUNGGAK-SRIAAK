-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Pengguna" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "emel" TEXT NOT NULL,
    "peranan" TEXT NOT NULL,
    "kataLaluanHash" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "tarikhCipta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tarikhKemaskini" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pengguna_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kelas" (
    "id" TEXT NOT NULL,
    "namaKelas" TEXT NOT NULL,
    "tahunDarjah" INTEGER NOT NULL,
    "guruKelasId" TEXT,
    "tarikhCipta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Kelas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Murid" (
    "id" TEXT NOT NULL,
    "noMurid" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kelasId" TEXT NOT NULL,
    "namaPenjaga" TEXT NOT NULL,
    "noTelefonPenjaga" TEXT NOT NULL,
    "noKpPenjaga" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AKTIF',
    "tarikhDaftar" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Murid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrukturYuran" (
    "id" TEXT NOT NULL,
    "tahun" INTEGER NOT NULL,
    "tahunDarjah" INTEGER NOT NULL,
    "jenisYuran" TEXT NOT NULL DEFAULT 'YURAN_BULANAN',
    "jumlahBulanan" DOUBLE PRECISION NOT NULL,
    "hariAkhirBayar" INTEGER NOT NULL DEFAULT 10,
    "tarikhCipta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StrukturYuran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invois" (
    "id" TEXT NOT NULL,
    "muridId" TEXT NOT NULL,
    "tahun" INTEGER NOT NULL,
    "bulan" INTEGER NOT NULL,
    "jumlah" DOUBLE PRECISION NOT NULL,
    "diskaun" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tarikhAkhir" TIMESTAMP(3) NOT NULL,
    "tarikhCipta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invois_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bayaran" (
    "id" TEXT NOT NULL,
    "muridId" TEXT NOT NULL,
    "tarikhBayar" TIMESTAMP(3) NOT NULL,
    "jumlah" DOUBLE PRECISION NOT NULL,
    "kaedah" TEXT NOT NULL,
    "noRujukan" TEXT,
    "direkodOlehId" TEXT,
    "tarikhCipta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bayaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeruntukanBayaran" (
    "id" TEXT NOT NULL,
    "bayaranId" TEXT NOT NULL,
    "invoisId" TEXT NOT NULL,
    "jumlahDiperuntukkan" DOUBLE PRECISION NOT NULL,
    "tarikhCipta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PeruntukanBayaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PelanAnsuran" (
    "id" TEXT NOT NULL,
    "muridId" TEXT NOT NULL,
    "jumlahKeseluruhan" DOUBLE PRECISION NOT NULL,
    "bilAnsuran" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AKTIF',
    "sebab" TEXT,
    "diluluskanOlehId" TEXT,
    "tarikhCipta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PelanAnsuran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ansuran" (
    "id" TEXT NOT NULL,
    "pelanId" TEXT NOT NULL,
    "bil" INTEGER NOT NULL,
    "tarikhAkhir" TIMESTAMP(3) NOT NULL,
    "jumlah" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'BELUM',
    "tarikhBayar" TIMESTAMP(3),

    CONSTRAINT "Ansuran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pengecualian" (
    "id" TEXT NOT NULL,
    "muridId" TEXT NOT NULL,
    "jenis" TEXT NOT NULL,
    "jumlah" DOUBLE PRECISION NOT NULL,
    "sebab" TEXT NOT NULL,
    "diluluskanOlehId" TEXT,
    "tarikhCipta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pengecualian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Peringatan" (
    "id" TEXT NOT NULL,
    "muridId" TEXT NOT NULL,
    "saluran" TEXT NOT NULL,
    "peringkat" TEXT NOT NULL,
    "mesej" TEXT NOT NULL,
    "tarikhHantar" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'DIHANTAR',
    "dihantarOlehId" TEXT,

    CONSTRAINT "Peringatan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotaSusulan" (
    "id" TEXT NOT NULL,
    "muridId" TEXT NOT NULL,
    "jenis" TEXT NOT NULL,
    "catatan" TEXT NOT NULL,
    "janjiBayarTarikh" TIMESTAMP(3),
    "diciptaOlehId" TEXT,
    "tarikhCipta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotaSusulan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogAudit" (
    "id" TEXT NOT NULL,
    "penggunaId" TEXT,
    "tindakan" TEXT NOT NULL,
    "entiti" TEXT NOT NULL,
    "masa" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "butiran" TEXT,

    CONSTRAINT "LogAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tetapan" (
    "id" TEXT NOT NULL,
    "kunci" TEXT NOT NULL,
    "nilai" TEXT NOT NULL,
    "tarikhCipta" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tarikhKemaskini" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tetapan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pengguna_emel_key" ON "Pengguna"("emel");

-- CreateIndex
CREATE UNIQUE INDEX "Murid_noMurid_key" ON "Murid"("noMurid");

-- CreateIndex
CREATE UNIQUE INDEX "Invois_muridId_tahun_bulan_key" ON "Invois"("muridId", "tahun", "bulan");

-- CreateIndex
CREATE UNIQUE INDEX "Tetapan_kunci_key" ON "Tetapan"("kunci");

-- AddForeignKey
ALTER TABLE "Kelas" ADD CONSTRAINT "Kelas_guruKelasId_fkey" FOREIGN KEY ("guruKelasId") REFERENCES "Pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Murid" ADD CONSTRAINT "Murid_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "Kelas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invois" ADD CONSTRAINT "Invois_muridId_fkey" FOREIGN KEY ("muridId") REFERENCES "Murid"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bayaran" ADD CONSTRAINT "Bayaran_muridId_fkey" FOREIGN KEY ("muridId") REFERENCES "Murid"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bayaran" ADD CONSTRAINT "Bayaran_direkodOlehId_fkey" FOREIGN KEY ("direkodOlehId") REFERENCES "Pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeruntukanBayaran" ADD CONSTRAINT "PeruntukanBayaran_bayaranId_fkey" FOREIGN KEY ("bayaranId") REFERENCES "Bayaran"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeruntukanBayaran" ADD CONSTRAINT "PeruntukanBayaran_invoisId_fkey" FOREIGN KEY ("invoisId") REFERENCES "Invois"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PelanAnsuran" ADD CONSTRAINT "PelanAnsuran_muridId_fkey" FOREIGN KEY ("muridId") REFERENCES "Murid"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PelanAnsuran" ADD CONSTRAINT "PelanAnsuran_diluluskanOlehId_fkey" FOREIGN KEY ("diluluskanOlehId") REFERENCES "Pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ansuran" ADD CONSTRAINT "Ansuran_pelanId_fkey" FOREIGN KEY ("pelanId") REFERENCES "PelanAnsuran"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pengecualian" ADD CONSTRAINT "Pengecualian_muridId_fkey" FOREIGN KEY ("muridId") REFERENCES "Murid"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pengecualian" ADD CONSTRAINT "Pengecualian_diluluskanOlehId_fkey" FOREIGN KEY ("diluluskanOlehId") REFERENCES "Pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Peringatan" ADD CONSTRAINT "Peringatan_muridId_fkey" FOREIGN KEY ("muridId") REFERENCES "Murid"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Peringatan" ADD CONSTRAINT "Peringatan_dihantarOlehId_fkey" FOREIGN KEY ("dihantarOlehId") REFERENCES "Pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotaSusulan" ADD CONSTRAINT "NotaSusulan_muridId_fkey" FOREIGN KEY ("muridId") REFERENCES "Murid"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotaSusulan" ADD CONSTRAINT "NotaSusulan_diciptaOlehId_fkey" FOREIGN KEY ("diciptaOlehId") REFERENCES "Pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogAudit" ADD CONSTRAINT "LogAudit_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "Pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

