-- ERP paneli uchun buyurtmalar ko'rinishi.
--
-- Nega: ERP onlayn buyurtmalarni HTTP shartnomasi orqali o'qirdi va u har
-- necha soniyada so'ralardi (panel yangilanishi). HMAC kaliti yoki
-- MARKETPLACE_URL noto'g'ri bo'lsa panel butunlay bo'sh qolardi. Ikkala
-- tizim bitta bazada, shuning uchun O'QISH shu ko'rinishdan boradi.
--
-- YOZISH bu yerdan bormaydi: holatni o'zgartirish qoidalari (qaysi holatdan
-- qaysisiga o'tish mumkin, bekor sababi majburiyligi, tarix yozuvi)
-- marketplace domenida yashaydi va imzolangan API orqali bajariladi.
-- Shu ko'rinish esa qoidaning O'QISH tomonini beradi: `keyingiHolatlar`
-- shu yerda hisoblanadi, ERP uni o'zida takrorlamaydi.

CREATE OR REPLACE VIEW marketplace.erp_buyurtmalar AS
SELECT
  b.id,
  b.raqam,
  b.holati::text AS holati,
  b.yetkazish::text AS yetkazish,
  b.hudud,
  b."manzilMatni",
  b.moljal,
  b.lat,
  b.lng,
  b."aloqaTel",
  b."aloqaIsm",
  b."vaqtOraligi",
  b."yetkazishBoshi",
  b."tolovUsuli"::text AS "tolovUsuli",
  b."mahsulotSumma"::float8 AS "mahsulotSumma",
  b."yetkazishNarx"::float8 AS "yetkazishNarx",
  b."jamiSumma"::float8   AS "jamiSumma",
  b.izoh,
  b."bekorSababi",
  b.yaratilgan,
  b.yangilangan,
  -- Holat grafigi — `src/lib/domen/buyurtma.ts` dagi OTISHLAR bilan bir xil
  (CASE b.holati
    WHEN 'YANGI'        THEN ARRAY['TASDIQLANGAN', 'BEKOR']
    WHEN 'TASDIQLANGAN' THEN ARRAY['YIGILMOQDA', 'BEKOR']
    WHEN 'YIGILMOQDA'   THEN ARRAY['YOLDA', 'BEKOR']
    WHEN 'YOLDA'        THEN ARRAY['BAJARILGAN', 'BEKOR']
    WHEN 'BAJARILGAN'   THEN ARRAY['QAYTARILGAN']
    ELSE ARRAY[]::text[]
  END) AS "keyingiHolatlar",
  COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', q.id,
      'erpTovarId', q."erpTovarId",
      'slug', q.slug,
      'nomi', q.nomi,
      'birlik', q.birlik,
      'birlikNarxi', q."birlikNarxi"::float8,
      'miqdor', q.miqdor::float8,
      'jami', q.jami::float8
    ) ORDER BY q.nomi)
    FROM marketplace.mp_buyurtma_qatorlari q
    WHERE q."buyurtmaId" = b.id
  ), '[]'::jsonb) AS qatorlar,
  COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'holati', t.holati::text,
      'izoh', t.izoh,
      'kim', t.kim,
      'sana', to_char(t.sana AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    ) ORDER BY t.sana)
    FROM marketplace.mp_holat_tarixi t
    WHERE t."buyurtmaId" = b.id
  ), '[]'::jsonb) AS tarix
FROM marketplace.mp_buyurtmalar b;

COMMENT ON VIEW marketplace.erp_buyurtmalar IS
  'ERP paneli SHU ko''rinishdan o''qiydi (jadvallarni emas). Holatni o''zgartirish faqat imzolangan API orqali.';
