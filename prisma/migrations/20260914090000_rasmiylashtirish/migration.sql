-- Buyurtmani rasmiylashtirish: yetkazish vaqti, hudud, aloqa nusxasi
-- va ko'rinadigan raqam uchun ketma-ketlik.

-- Raqam ketma-ketligi: MP-2026-00001. `count(*) + 1` parallel ikki
-- buyurtmada bir xil raqam berardi — ketma-ketlik atomik.
CREATE SEQUENCE "mp_buyurtma_raqam_seq" START 1;

ALTER TABLE "mp_buyurtmalar"
    ADD COLUMN "hudud" TEXT,
    ADD COLUMN "moljal" TEXT,
    ADD COLUMN "aloqaIsm" TEXT,
    ADD COLUMN "vaqtOraligi" TEXT,
    ADD COLUMN "yetkazishBoshi" TIMESTAMP(3);

ALTER TABLE "mp_buyurtma_qatorlari"
    ADD COLUMN "slug" TEXT;
