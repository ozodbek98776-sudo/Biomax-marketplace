-- CreateEnum
CREATE TYPE "MpHolat" AS ENUM ('YANGI', 'TASDIQLANGAN', 'YIGILMOQDA', 'YOLDA', 'BAJARILGAN', 'BEKOR', 'QAYTARILGAN');

-- CreateEnum
CREATE TYPE "MpTolov" AS ENUM ('NAQD_YETKAZISHDA', 'KARTA_YETKAZISHDA', 'ONLAYN');

-- CreateEnum
CREATE TYPE "MpYetkazish" AS ENUM ('KURYER', 'OLIB_KETISH');

-- CreateTable
CREATE TABLE "mp_hisoblar" (
    "id" TEXT NOT NULL,
    "telefon" TEXT NOT NULL,
    "ism" TEXT,
    "erpMijozId" TEXT,
    "tasdiqlangan" BOOLEAN NOT NULL DEFAULT false,
    "faol" BOOLEAN NOT NULL DEFAULT true,
    "yaratilgan" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "yangilangan" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mp_hisoblar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mp_kirish_kodlari" (
    "id" TEXT NOT NULL,
    "telefon" TEXT NOT NULL,
    "kodXesh" TEXT NOT NULL,
    "urinishlar" INTEGER NOT NULL DEFAULT 0,
    "amalQiladi" TIMESTAMP(3) NOT NULL,
    "ishlatilgan" BOOLEAN NOT NULL DEFAULT false,
    "yaratilgan" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mp_kirish_kodlari_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mp_manzillar" (
    "id" TEXT NOT NULL,
    "hisobId" TEXT NOT NULL,
    "nomi" TEXT NOT NULL,
    "viloyat" TEXT,
    "tuman" TEXT,
    "manzil" TEXT NOT NULL,
    "moljal" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "asosiy" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "mp_manzillar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mp_elonlar" (
    "id" TEXT NOT NULL,
    "erpTovarId" TEXT NOT NULL,
    "faol" BOOLEAN NOT NULL DEFAULT false,
    "slug" TEXT NOT NULL,
    "sarlavha" TEXT,
    "tavsif" TEXT,
    "brend" TEXT,
    "rasmlar" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tartib" INTEGER NOT NULL DEFAULT 0,
    "korishlar" INTEGER NOT NULL DEFAULT 0,
    "yaratilgan" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "yangilangan" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mp_elonlar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mp_savatlar" (
    "id" TEXT NOT NULL,
    "belgi" TEXT NOT NULL,
    "hisobId" TEXT,
    "yaratilgan" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "yangilangan" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mp_savatlar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mp_savat_qatorlari" (
    "id" TEXT NOT NULL,
    "savatId" TEXT NOT NULL,
    "elonId" TEXT NOT NULL,
    "miqdor" DECIMAL(12,3) NOT NULL,

    CONSTRAINT "mp_savat_qatorlari_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mp_buyurtmalar" (
    "id" TEXT NOT NULL,
    "raqam" TEXT NOT NULL,
    "hisobId" TEXT NOT NULL,
    "holati" "MpHolat" NOT NULL DEFAULT 'YANGI',
    "yetkazish" "MpYetkazish" NOT NULL DEFAULT 'KURYER',
    "manzilMatni" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "aloqaTel" TEXT NOT NULL,
    "tolovUsuli" "MpTolov" NOT NULL DEFAULT 'NAQD_YETKAZISHDA',
    "mahsulotSumma" DECIMAL(12,2) NOT NULL,
    "yetkazishNarx" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "jamiSumma" DECIMAL(12,2) NOT NULL,
    "usdKursi" DECIMAL(12,2),
    "izoh" TEXT,
    "bekorSababi" TEXT,
    "bajaruvchiFilialId" TEXT,
    "erpSotuvId" TEXT,
    "yaratilgan" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "yangilangan" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mp_buyurtmalar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mp_buyurtma_qatorlari" (
    "id" TEXT NOT NULL,
    "buyurtmaId" TEXT NOT NULL,
    "erpTovarId" TEXT NOT NULL,
    "nomi" TEXT NOT NULL,
    "birlik" TEXT NOT NULL,
    "birlikNarxi" DECIMAL(12,2) NOT NULL,
    "miqdor" DECIMAL(12,3) NOT NULL,
    "jami" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "mp_buyurtma_qatorlari_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mp_rezervlar" (
    "id" TEXT NOT NULL,
    "buyurtmaId" TEXT NOT NULL,
    "erpTovarId" TEXT NOT NULL,
    "miqdor" DECIMAL(12,3) NOT NULL,
    "amalQiladi" TIMESTAMP(3) NOT NULL,
    "bosh" BOOLEAN NOT NULL DEFAULT false,
    "yaratilgan" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mp_rezervlar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mp_holat_tarixi" (
    "id" TEXT NOT NULL,
    "buyurtmaId" TEXT NOT NULL,
    "holati" "MpHolat" NOT NULL,
    "izoh" TEXT,
    "kim" TEXT,
    "sana" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mp_holat_tarixi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mp_sozlamalar" (
    "kalit" TEXT NOT NULL,
    "qiymat" TEXT NOT NULL,
    "yangilangan" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mp_sozlamalar_pkey" PRIMARY KEY ("kalit")
);

-- CreateIndex
CREATE UNIQUE INDEX "mp_hisoblar_telefon_key" ON "mp_hisoblar"("telefon");

-- CreateIndex
CREATE UNIQUE INDEX "mp_hisoblar_erpMijozId_key" ON "mp_hisoblar"("erpMijozId");

-- CreateIndex
CREATE INDEX "mp_kirish_kodlari_telefon_yaratilgan_idx" ON "mp_kirish_kodlari"("telefon", "yaratilgan");

-- CreateIndex
CREATE INDEX "mp_kirish_kodlari_amalQiladi_idx" ON "mp_kirish_kodlari"("amalQiladi");

-- CreateIndex
CREATE INDEX "mp_manzillar_hisobId_idx" ON "mp_manzillar"("hisobId");

-- CreateIndex
CREATE UNIQUE INDEX "mp_elonlar_erpTovarId_key" ON "mp_elonlar"("erpTovarId");

-- CreateIndex
CREATE UNIQUE INDEX "mp_elonlar_slug_key" ON "mp_elonlar"("slug");

-- CreateIndex
CREATE INDEX "mp_elonlar_faol_tartib_idx" ON "mp_elonlar"("faol", "tartib");

-- CreateIndex
CREATE UNIQUE INDEX "mp_savatlar_belgi_key" ON "mp_savatlar"("belgi");

-- CreateIndex
CREATE UNIQUE INDEX "mp_savatlar_hisobId_key" ON "mp_savatlar"("hisobId");

-- CreateIndex
CREATE UNIQUE INDEX "mp_savat_qatorlari_savatId_elonId_key" ON "mp_savat_qatorlari"("savatId", "elonId");

-- CreateIndex
CREATE UNIQUE INDEX "mp_buyurtmalar_raqam_key" ON "mp_buyurtmalar"("raqam");

-- CreateIndex
CREATE UNIQUE INDEX "mp_buyurtmalar_erpSotuvId_key" ON "mp_buyurtmalar"("erpSotuvId");

-- CreateIndex
CREATE INDEX "mp_buyurtmalar_holati_yaratilgan_idx" ON "mp_buyurtmalar"("holati", "yaratilgan");

-- CreateIndex
CREATE INDEX "mp_buyurtmalar_hisobId_yaratilgan_idx" ON "mp_buyurtmalar"("hisobId", "yaratilgan");

-- CreateIndex
CREATE INDEX "mp_buyurtma_qatorlari_buyurtmaId_idx" ON "mp_buyurtma_qatorlari"("buyurtmaId");

-- CreateIndex
CREATE INDEX "mp_rezervlar_erpTovarId_bosh_idx" ON "mp_rezervlar"("erpTovarId", "bosh");

-- CreateIndex
CREATE INDEX "mp_rezervlar_amalQiladi_bosh_idx" ON "mp_rezervlar"("amalQiladi", "bosh");

-- CreateIndex
CREATE INDEX "mp_holat_tarixi_buyurtmaId_sana_idx" ON "mp_holat_tarixi"("buyurtmaId", "sana");

-- AddForeignKey
ALTER TABLE "mp_manzillar" ADD CONSTRAINT "mp_manzillar_hisobId_fkey" FOREIGN KEY ("hisobId") REFERENCES "mp_hisoblar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mp_savatlar" ADD CONSTRAINT "mp_savatlar_hisobId_fkey" FOREIGN KEY ("hisobId") REFERENCES "mp_hisoblar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mp_savat_qatorlari" ADD CONSTRAINT "mp_savat_qatorlari_savatId_fkey" FOREIGN KEY ("savatId") REFERENCES "mp_savatlar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mp_savat_qatorlari" ADD CONSTRAINT "mp_savat_qatorlari_elonId_fkey" FOREIGN KEY ("elonId") REFERENCES "mp_elonlar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mp_buyurtmalar" ADD CONSTRAINT "mp_buyurtmalar_hisobId_fkey" FOREIGN KEY ("hisobId") REFERENCES "mp_hisoblar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mp_buyurtma_qatorlari" ADD CONSTRAINT "mp_buyurtma_qatorlari_buyurtmaId_fkey" FOREIGN KEY ("buyurtmaId") REFERENCES "mp_buyurtmalar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mp_rezervlar" ADD CONSTRAINT "mp_rezervlar_buyurtmaId_fkey" FOREIGN KEY ("buyurtmaId") REFERENCES "mp_buyurtmalar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mp_holat_tarixi" ADD CONSTRAINT "mp_holat_tarixi_buyurtmaId_fkey" FOREIGN KEY ("buyurtmaId") REFERENCES "mp_buyurtmalar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
