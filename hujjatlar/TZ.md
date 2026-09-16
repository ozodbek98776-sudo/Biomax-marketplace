# BioMax Marketplace — Texnik topshiriq (TZ)

**Versiya:** 1.0 · **Sana:** 2026-09-12
**Loyiha papkasi:** `C:\Users\Ozodbek\Desktop\biomax-marketplace`
**Mavjud tizim:** `C:\Users\Ozodbek\Desktop\konstovar\konstovar` (BioMax ERP/POS)

---

## 0. Bu hujjat haqida

Bu — BioMax do'koni uchun **onlayn savdo maydonchasi (marketplace)** qurish bo'yicha
texnik topshiriq. Hujjat mavjud ERP tizimini **kod darajasida o'rganib chiqilgandan
keyin** yozildi: quyidagi barcha da'volar haqiqiy fayllarga tayanadi, taxminga emas.

Kimga: loyihani bajaradigan dasturchiga, va qaror qabul qiladigan egaga.

**Atamalar**

| Atama | Ma'nosi |
|---|---|
| ERP | Mavjud ichki tizim (POS, ombor, hisobot) — `konstovar` |
| Marketplace / MP | Yangi ommaviy sayt — mijozlar buyurtma beradigan joy |
| Ega | ERP'dagi `Foydalanuvchi` — o'z katalogi bo'lgan do'kon egasi |
| Mijoz | ERP'dagi `Mijoz` yozuvi (hozir hisob emas, faqat yozuv) |
| SKU | Sotuvdagi mahsulot birligi — ERP'da `Tovar` |

---

## 0.1 Qabul qilingan qarorlar

Bular egaga savol berilib, javob olingan. Ular endi **taxmin emas** —
qolgan hamma narsa shularga tayanadi.

| # | Qaror | Sana |
|---|---|---|
| **Q1** | **Bitta do'kon.** Lekin: (a) sotuv **omborlardan ham** bo'lishi kerak, (b) keyinchalik **filiallar ochilishi mumkin** | 2026-09-12 |
| **Q2** | **Sayt.** Telegram Mini App emas — Telegram faqat xabarnoma uchun qoladi | 2026-09-12 |
| **Q3** | To'lov — *javob kutilmoqda* | — |

### Q1 ning oqibati — bu eng katta o'zgarish

Kod tekshirildi va **haqiqiy bo'shliq** topildi:

- POS faqat **do'kon qoldig'ini** ko'radi:
  `src/app/api/tovarlar/route.ts` → `qoldiq: stock?.dokonQoldiq ?? 0`
- Sotuv har doim do'kondan yoziladi:
  `src/app/api/sotuvlar/route.ts` → `joy: 'DOKON'` (qattiq yozilgan)
- Ombordagi tovarni sotish uchun avval **o'tkazma** (`OTKAZMA`) qilinadi

Ya'ni **hozir ombordagi tovar sotuvda umuman ko'rinmaydi.** Marketplace uchun
bu tuzatilishi shart — batafsil 5.1-bo'limda.

### Q2 ning oqibati

- SEO endi **birinchi darajali** talab (Mini App'da kerak emas edi)
- Kirish: telefon + SMS kod (Telegram `initData` emas)
- Telegram baribir ishlatiladi — buyurtma xabarnomalari uchun; ERP'da
  GramJS va grammy allaqachon ulangan

---

## 1. Mavjud tizim tahlili

### 1.1 Texnologiya

| Qatlam | Nima ishlatilgan |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Til | TypeScript |
| Baza | PostgreSQL 18 — Neon, `ap-southeast-1` |
| ORM | Prisma 7 + `@prisma/adapter-pg` (driver adapters) |
| Auth | NextAuth v5, JWT strategiya, Credentials provayder |
| UI | Tailwind + Radix UI + lucide-react + sonner |
| Telegram | GramJS (`telegram`) userbot + `grammy` bot |
| Boshqa | recharts, xlsx, jspdf, qrcode, leaflet, sharp, node-cron |

Hajmi: **42 model**, **17 enum**, **109 API marshrut**, **18 sahifa**, **34 lib moduli**.

### 1.2 Ko'p ijaralik (multi-tenancy) — eng muhim qism

Tizimda alohida "tenant" jadvali **yo'q**. Uning o'rniga har bir doiralanadigan
modelda ikkita ustun bor: `filialId` va `egaId`. Qoida
[`src/lib/filial-scope.ts`](../../konstovar/konstovar/src/lib/filial-scope.ts) da:

```ts
egaFilialWhere(session) →
  filialId bor    ? { filialId }
                  : { filialId: null, egaId: sessionEgaId(session) }
```

Ya'ni **har bir Ega — amalda alohida do'kon**. Marketplace uchun bu juda qulay:
ko'p sotuvchili maydonchaning poydevori allaqachon mavjud, faqat ustiga
"vitrina" qurish kerak.

> ⚠️ **Ma'lum nuqson:** `@@unique([nomi, filialId, egaId])` filialsiz qatorlarda
> ishlamaydi — PostgreSQL'da `NULL ≠ NULL`. Shuning uchun takroriylik API
> darajasida tekshiriladi. Marketplace ham shu qoidaga amal qilishi shart.

### 1.3 Zaxira (qoldiq) — hodisaga asoslangan

Qoldiq hech qayerda ustun sifatida saqlanmaydi. U `OmborHarakati` jurnalidan
SQL agregatsiya bilan hisoblanadi
([`src/lib/stock.ts`](../../konstovar/konstovar/src/lib/stock.ts) → `getStockMap`).

Harakat turlari: `KIRIM`, `CHIQIM`, `QAYTARISH`, `YOQOTISH`, `OTKAZMA`,
`OTKAZMA_KIRIM`, `OTKAZMA_CHIQIM`. Joyi: `OMBOR` yoki `DOKON`.

**Marketplace uchun oqibati:** onlayn buyurtma zaxirani shu jurnal orqali
o'zgartirishi SHART. Aks holda POS va marketplace boshqa-boshqa raqam
ko'rsatadi va bir mahsulot ikki marta sotiladi.

### 1.4 Pul va hisobot

- `Sotuv` — yakuniy savdo hujjati (chek raqami, to'lov usullari, chegirma).
- Foyda [`src/lib/foyda.ts`](../../konstovar/konstovar/src/lib/foyda.ts) da sotish
  narxi va `kelishNarxi` farqidan hisoblanadi.
- Mahsulot `UZS` yoki `USD` da narxlanadi; POS savatga qo'shishda joriy kurs
  bo'yicha so'mga o'giradi ([`src/lib/kurs.ts`](../../konstovar/konstovar/src/lib/kurs.ts)).
- Sodiqlik: `Mijoz.ballBalans` / `keshbekBalans` + `SodiqlikHarakati` jurnali.

**Oqibati:** marketplace buyurtmasi bajarilganda `Sotuv` yozuvi yaratilishi kerak —
aks holda kunlik hisobot, foyda va sodiqlik onlayn savdoni ko'rmaydi.

### 1.5 Xavfsizlik naqshlari

To'rt qatlamli ruxsat: rol → `ruxsat-katalogi.ts` kalitlari (`proxy.ts` tekshiradi)
→ `tovar-ruxsat.ts` (jonli baza o'qishi) → `maydon-yashirish.ts` (maydonni yashirish).

Ochiq (sessiyasiz) yuzalar allaqachon bor va ularda **aniq printsip** yozilgan —
[`src/app/api/public/tovar/[kod]/route.ts`](../../konstovar/konstovar/src/app/api/public/tovar/[kod]/route.ts):

> «Faqat MIJOZGA ko'rsatish mumkin bo'lgan maydonlar qaytariladi: nomi,
> kategoriya, sotish narxi, birlik va "bormi/yo'q". Kelish narxi, aniq qoldiq,
> ta'minotchi va foyda — HECH QACHON.»

**Marketplace shu printsipni to'liq meros qilib olishi shart.**

### 1.6 Marketplace uchun to'siq bo'ladigan joylar

| # | Topilgan holat | Nega muammo | Yechim |
|---|---|---|---|
| 1 | **Rasmlar bazada base64** (`Tovar.rasmlar String[]`, 1080px JPEG, maks 3 ta) | 50 mahsulotli katalog sahifasi bazadan megabaytlab base64 tortadi; CDN, kesh va moslashuvchan o'lchamlar yo'q | Obyekt saqlash (S3/R2) + CDN; ERP'ga migratsiya |
| 2 | **Mijozda hisob yo'q** — `Mijoz` faqat yozuv, `parolHash` yo'q | Xaridor tizimga kira olmaydi | Marketplace'da alohida hisob (Telegram yoki SMS OTP) |
| 3 | Qoldiq **rezervatsiyasiz** | Buyurtma berilgan, lekin hali bajarilmagan tovar kassada sotilib ketishi mumkin | Rezerv jadvali + muddat (TTL) |
| 4 | `Buyurtma` modeli — bu **kassirning saqlangan savati**, mijoz buyurtmasi emas | Nomi chalkashtiradi | MP o'z `MpBuyurtma` modelini yaratadi, buni tegmaydi |
| 5 | Mahsulotda **tavsif, brend, o'lcham, xususiyat maydonlari yo'q** | Vitrinada ko'rsatadigan narsa kam | MP tomonida boyituvchi jadval |
| 6 | Neon `ap-southeast-1` (Singapur) | O'zbekistondan ~200ms kechikish; ommaviy sayt uchun sezilarli | Kesh qatlami + mintaqani ko'chirishni ko'rib chiqish |
| 7 | `filialId=null` bo'lgan `@@unique` teshigi | Takroriy yozuv | API darajasida tekshirish |
| 8 | **Sotuv faqat do'kondan** — POS `dokonQoldiq` ni ko'radi, chiqim `joy='DOKON'` qattiq yozilgan | Ombordagi tovar sotuvda ko'rinmaydi; ega buni talab qildi | Avto-o'tkazma (5.1-bo'lim) |

---

## 2. Maqsad va muvaffaqiyat mezonlari

### 2.1 Maqsad

Mijoz do'konga bormasdan mahsulotni ko'rib, buyurtma bera olsin; do'kon esa
buyurtmani bir joyda ko'rib, mavjud POS/ombor jarayoni bilan bajarsin —
**ikki xil zaxira va ikki xil hisobot paydo bo'lmasin.**

### 2.2 O'lchanadigan mezonlar

| Mezon | Maqsad |
|---|---|
| Katalog sahifasi ochilishi (4G, mobil) | LCP < 2.5s |
| Mahsulot qidiruvi javobi | < 300ms (p95) |
| Ortiqcha sotilgan (oversell) buyurtma | **0 ta** |
| MP buyurtmasi ERP hisobotida ko'rinishi | 100% |
| Kelish narxi / aniq qoldiq / ta'minotchi sizib chiqishi | **0 ta** |
| Mobil trafik ulushi (kutilma) | > 80% — mobile-first majburiy |

---

## 3. Qamrov

### 3.1 v1 (birinchi ishga tushirish)

- Ommaviy katalog: kategoriya/ombor bo'yicha ko'rish, qidiruv, mahsulot sahifasi
- Savat (mehmon uchun ham)
- Telefon raqami + SMS/Telegram tasdiqlash bilan ro'yxatdan o'tish
- Buyurtma berish — **to'lov: yetkazib berishda naqd yoki karta**
- Buyurtma holatini kuzatish + Telegram xabarnoma
- Do'kon paneli: buyurtmalar ro'yxati, qabul qilish/rad etish, bajarish
- Bajarilgan buyurtma → ERP'da `Sotuv` + `OmborHarakati` yaratilishi

### 3.2 v2

- Onlayn to'lov (Payme, Click, Uzum)
- Sodiqlik ballari va keshbekni onlayn ishlatish
- Sharh va reyting
- Yetkazib berish integratsiyasi (Yandex Delivery yoki o'z kuryeri)
- Ko'p sotuvchi (bir nechta Ega bitta maydonchada)

### 3.3 Qamrovdan tashqarida

- ERP'ni qayta yozish
- Buxgalteriya / soliq integratsiyasi
- Ombor avtomatlashtirish (robot, konveyer)
- Xalqaro yetkazib berish, valyuta konvertatsiyasi (UZS'dan boshqa)

---

## 4. Aktyorlar

| Aktyor | Nima qiladi | Qayerda ishlaydi |
|---|---|---|
| **Xaridor** | Ko'radi, buyurtma beradi, kuzatadi | Marketplace (ommaviy) |
| **Do'kon operatori** | Buyurtmani qabul qiladi, yig'adi, beradi | MP admin paneli |
| **Kassir** | POS'da sotadi (o'zgarmaydi) | Mavjud ERP |
| **Ega** | Katalogni boshqaradi, hisobot ko'radi | Mavjud ERP |
| **Kuryer** | Yetkazadi (v2) | Mobil ko'rinish |

---

## 5. Arxitektura qarori — eng muhim tanlov

Uchta variant bor. Bu qaror keyingi hammasini belgilaydi.

### Variant A — Umumiy baza, alohida ilova

Marketplace o'z Next.js ilovasi, lekin **o'sha Neon bazasiga** ulanadi.

- ✅ Zaxira real vaqtda, sinxronizatsiya kerak emas
- ✅ Eng tez ishlab chiqiladi
- ❌ Sxema bog'liqligi: ERP'dagi o'zgarish MP'ni sindiradi
- ❌ Ommaviy ilovada ERP bazasining to'liq kaliti

### Variant B — Alohida baza + sinxronizatsiya

- ✅ To'liq izolyatsiya
- ❌ Zaxira kechikadi → **ortiqcha sotish xavfi**
- ❌ Ikki tomonlama sinxronizatsiya — eng ko'p xato chiqadigan yo'l

### Variant C — Umumiy baza + cheklangan huquq + shartnomaviy API ⭐

- Marketplace **o'z jadvallariga** ega (hisob, savat, buyurtma, sharh) — prefiks `mp_`
- ERP jadvallariga **faqat o'qish** uchun alohida PostgreSQL roli
- Zaxirani o'zgartirish va `Sotuv` yaratish — faqat ERP'dagi
  `/api/marketplace/*` shartnomaviy marshrutlari orqali (imzolangan token bilan)

**TAVSIYA: Variant C.**

Sabab: zaxira bitta manbada qoladi (ortiqcha sotish tuzilish jihatidan qiyin),
lekin ommaviy ilova ERP jadvallarini buza olmaydi. Sinxronizatsiya muammosi
umuman paydo bo'lmaydi. Bitta do'kon uchun ham, keyinchalik ko'p sotuvchiga
o'sganda ham ishlaydi.

```
┌────────────────────┐        ┌──────────────────────┐
│  Marketplace       │        │   BioMax ERP         │
│  (yangi Next.js)   │        │   (mavjud)           │
│                    │        │                      │
│  mp_* jadvallar    │───────▶│  /api/marketplace/*  │
│  (yozish)          │  HMAC  │  · zaxira band qilish│
│                    │        │  · buyurtma → Sotuv  │
│  ERP jadvallari    │        │                      │
│  (faqat o'qish)    │◀───────│  Tovar, Kategoriya   │
└────────────────────┘        └──────────────────────┘
          │                              │
          └──────── bitta PostgreSQL ────┘
```

### 5.1 Ombordan sotuv — qanday ishlaydi

Q1 bo'yicha marketplace **ombor + do'kon** yig'indisidan sotadi. Ikki xil
yechim bor:

| Yechim | Qanday | Baho |
|---|---|---|
| **Bevosita** | Chiqim to'g'ridan-to'g'ri `joy=OMBOR` bilan yoziladi | Kamroq yozuv, lekin "sotuv do'kondan ketadi" degan mavjud qoida buziladi va hisobotlar tekshirilishi kerak |
| **Avto-o'tkazma** ⭐ | Yetmagan qism avval `OTKAZMA` bilan do'konga ko'chiriladi, so'ng `CHIQIM joy=DOKON` | Mavjud qoida saqlanadi, hisobotlarga tegilmaydi, ombor balansi ham rost qoladi |

**Tavsiya: avto-o'tkazma.** Sabab: u jismoniy voqelikka mos (tovar sotishdan
oldin haqiqatan omborlan olinadi) va mavjud hisobot mantiqini o'zgartirmaydi.

```
Buyurtma: 30 dona.  Do'konda 12, omborda 50.
   1) OTKAZMA  ombor → do'kon,  18 dona   (yetmagan qism)
   2) CHIQIM   joy=DOKON,       30 dona   (sotuv)
Natija: ombor 32, do'kon 0 — ikkalasi ham rost.
```

**ERP tomonida kerak bo'ladigan o'zgarishlar:**

1. `/api/marketplace/katalog` mavjudlikni **ombor + do'kon** yig'indisidan hisoblaydi
2. `/api/marketplace/bajarish` yuqoridagi ikki qadamni bitta tranzaksiyada bajaradi
3. **Ixtiyoriy, lekin tavsiya etiladi:** POS'ga ham "omborda yana N bor" ko'rsatkichi
   qo'shilsa, kassir ham ombordan sota oladi — hozir bu imkonsiz

### 5.2 Filialga tayyorlik

Filiallar hali yo'q, lekin ochilishi mumkin. Shuning uchun **boshidan**:

- `MpBuyurtma.bajaruvchiFilialId` — qaysi filial bajaradi (hozir `null` = markaziy)
- Katalogdagi mavjudlik — mijozga xizmat qila oladigan filiallar bo'yicha yig'iladi
- Rezerv **filial darajasida** qo'yiladi, umumiy emas

Bu uchta maydonni keyin qo'shish — buyurtma tarixini ko'chirishni talab qiladi;
hozir qo'yish esa deyarli tekin.

---

## 6. Ma'lumotlar modeli (yangi jadvallar)

Barchasi `mp_` prefiksi bilan — ERP jadvallaridan aniq ajralib tursin.

```prisma
/// Xaridor hisobi. ERP'dagi `Mijoz` bilan bog'lanadi (bir xaridor = bir Mijoz),
/// shunda sodiqlik balansi va nasiya tarixi bitta joyda qoladi.
model MpHisob {
  id            String   @id @default(cuid())
  telefon       String   @unique          // +998XXXXXXXXX
  ism           String?
  /// ERP `Mijoz.id`. Birinchi buyurtmada yaratiladi yoki telefon bo'yicha topiladi.
  mijozId       String?  @unique
  telegramId    String?  @unique
  tasdiqlangan  Boolean  @default(false)
  yaratilgan    DateTime @default(now())
  manzillar     MpManzil[]
  buyurtmalar   MpBuyurtma[]
}

/// Yetkazib berish manzili — bittadan ko'p bo'lishi mumkin (uy, ish).
model MpManzil {
  id         String  @id @default(cuid())
  hisobId    String
  nomi       String                        // "Uy", "Ish"
  viloyat    String?
  tuman      String?
  manzil     String
  lat        Float?
  lng        Float?
  asosiy     Boolean @default(false)
  hisob      MpHisob @relation(fields: [hisobId], references: [id], onDelete: Cascade)
}

/// Vitrinaga chiqarilgan mahsulot. ERP `Tovar` ni O'ZGARTIRMAYDI —
/// faqat ustiga marketplace uchun kerak bo'lgan ma'lumot qo'shadi.
model MpElon {
  id           String   @id @default(cuid())
  tovarId      String   @unique            // ERP Tovar.id
  faol         Boolean  @default(false)    // vitrinada ko'rinadimi
  sarlavha     String?                     // bo'sh bo'lsa Tovar.nomi
  tavsif       String?  @db.Text
  brend        String?
  /// CDN havolalari. ERP'dagi base64 rasmlar bu yerga KO'CHIRILADI.
  rasmlar      String[] @default([])
  slug         String   @unique            // SEO manzil
  tartib       Int      @default(0)
  korishlar    Int      @default(0)
  yaratilgan   DateTime @default(now())
  @@index([faol, tartib])
}

/// Onlayn buyurtma. ERP'dagi `Buyurtma` (kassirning saqlangan savati) BILAN
/// ARALASHTIRMASLIK kerak — bu butunlay boshqa narsa.
model MpBuyurtma {
  id            String          @id @default(cuid())
  raqam         String          @unique   // MP-2026-00001
  hisobId       String
  holati        MpHolat         @default(YANGI)
  manzilMatni   String                     // buyurtma paytidagi NUSXA
  lat           Float?
  lng           Float?
  tolovUsuli    MpTolov         @default(NAQD_YETKAZISHDA)
  mahsulotSumma Decimal         @db.Decimal(12, 2)
  yetkazishNarx Decimal         @default(0) @db.Decimal(12, 2)
  jamiSumma     Decimal         @db.Decimal(12, 2)
  /// Buyurtma paytidagi USD kursi — keyin kurs o'zgarsa ham summa o'zgarmaydi.
  usdKursi      Decimal?        @db.Decimal(12, 2)
  izoh          String?
  /// Qaysi filial bajaradi. Hozir har doim `null` (markaziy), lekin
  /// maydon boshidan bor — filial ochilganda tarixni ko'chirish kerak bo'lmasin.
  bajaruvchiFilialId String?
  /// Bajarilganda yaratilgan ERP `Sotuv.id` — ikki tomonni bog'laydi.
  sotuvId       String?         @unique
  bekorSababi   String?
  yaratilgan    DateTime        @default(now())
  yangilangan   DateTime        @updatedAt
  hisob         MpHisob         @relation(fields: [hisobId], references: [id])
  tarkiblar     MpBuyurtmaQator[]
  tarix         MpHolatTarix[]
  @@index([holati, yaratilgan])
}

model MpBuyurtmaQator {
  id          String     @id @default(cuid())
  buyurtmaId  String
  tovarId     String                        // ERP Tovar.id
  /// Nom va narx NUSXA qilib saqlanadi: keyin katalogda o'zgarsa ham
  /// mijoz nimaga rozi bo'lganini ko'rsatib turadi.
  nomi        String
  birlikNarxi Decimal    @db.Decimal(12, 2)
  miqdor      Decimal    @db.Decimal(12, 3)
  jami        Decimal    @db.Decimal(12, 2)
  buyurtma    MpBuyurtma @relation(fields: [buyurtmaId], references: [id], onDelete: Cascade)
}

/// Zaxira rezervi. Buyurtma berilganda qo'yiladi, TTL tugasa yoki bekor
/// qilinsa o'chadi. Kassa qoldig'ini hisoblashda shu ayiriladi.
model MpRezerv {
  id          String   @id @default(cuid())
  tovarId     String
  buyurtmaId  String
  miqdor      Decimal  @db.Decimal(12, 3)
  amalQiladi  DateTime                      // shu vaqtdan keyin bekor
  yaratilgan  DateTime @default(now())
  @@index([tovarId])
  @@index([amalQiladi])
}

model MpHolatTarix {
  id         String     @id @default(cuid())
  buyurtmaId String
  holati     MpHolat
  izoh       String?
  kim        String?                        // operator id yoki "tizim"
  sana       DateTime   @default(now())
  buyurtma   MpBuyurtma @relation(fields: [buyurtmaId], references: [id], onDelete: Cascade)
}

enum MpHolat {
  YANGI            // mijoz yubordi
  TASDIQLANGAN     // do'kon qabul qildi, rezerv qo'yildi
  YIGILMOQDA       // omborda yig'ilyapti
  YOLDA            // kuryerda
  BAJARILGAN       // topshirildi → ERP Sotuv yaratildi
  BEKOR            // bekor qilindi, rezerv bo'shatildi
  QAYTARILGAN      // mijoz qaytardi
}

enum MpTolov {
  NAQD_YETKAZISHDA
  KARTA_YETKAZISHDA
  ONLAYN           // v2
}
```

---

## 7. ERP ↔ Marketplace shartnomasi

ERP tomonida yangi marshrutlar. Autentifikatsiya: **HMAC-SHA256 imzo**
(`X-MP-Signature`) + vaqt tamg'asi (5 daqiqadan eski so'rov rad etiladi).
Bu marshrutlar `proxy.ts` da `/api/cron/` kabi sessiyasiz o'tkaziladi.

| Marshrut | Metod | Vazifasi |
|---|---|---|
| `/api/marketplace/katalog` | GET | Vitrina mahsulotlari. Mavjudlik **ombor + do'kon** yig'indisidan (5.1-bo'lim) |
| `/api/marketplace/qoldiq` | POST | Bir nechta `tovarId` uchun mavjudlik holati (aniq son EMAS) |
| `/api/marketplace/rezerv` | POST | Zaxira band qilish; yetmasa `409` va mavjud holat |
| `/api/marketplace/rezerv` | DELETE | Rezervni bo'shatish |
| `/api/marketplace/bajarish` | POST | Yakunlash: kerak bo'lsa `OTKAZMA` (ombor→do'kon), so'ng `Sotuv` + `SotuvTarkibi` + `OmborHarakati(CHIQIM)` — bitta tranzaksiyada |
| `/api/marketplace/mijoz` | POST | Telefon bo'yicha `Mijoz` topish yoki yaratish |

**Qat'iy qoidalar:**

1. Bu marshrutlar **hech qachon** `kelishNarxi`, `taminotchi`, foyda yoki
   aniq qoldiq sonini qaytarmaydi.
2. `bajarish` — **idempotent**: bir xil `buyurtmaId` bilan ikkinchi marta
   chaqirilsa yangi `Sotuv` yaratmaydi, mavjudini qaytaradi.
3. Zaxira yetmasa `bajarish` xato qaytaradi va **hech narsa yozmaydi**.
4. Qulflangan (`qulflangan=true`) va arxivlangan mahsulot katalogga chiqmaydi —
   POS'dagi bilan bir xil qoida.

---

## 8. Asosiy oqimlar

### 8.1 Buyurtma berish

```
Mijoz katalogni ochadi
   └─ qidiradi / kategoriya bo'yicha filtrlaydi
        └─ mahsulot sahifasi (tavsif, rasm, narx, "bor/kam/yo'q")
             └─ savatga qo'shadi          [rezerv YO'Q — savat vaqtinchalik]
                  └─ rasmiylashtirish
                       ├─ telefon raqami → SMS/Telegram kod
                       ├─ manzil (xaritadan yoki saqlangandan)
                       ├─ to'lov usuli
                       └─ TASDIQLASH
                            ├─ narx va mavjudlik QAYTA tekshiriladi
                            ├─ MpBuyurtma (YANGI) yaratiladi
                            └─ do'konga Telegram xabar
```

**Nega savatda rezerv yo'q:** savat kunlab ochiq turishi mumkin; har savatga
rezerv qo'yilsa zaxira soxta ravishda tugab qoladi. Rezerv faqat do'kon
buyurtmani **tasdiqlaganda** qo'yiladi.

### 8.2 Do'kon tomoni

```
YANGI → operator ko'radi
   ├─ Rad etish  → BEKOR (sabab yoziladi, mijozga xabar)
   └─ Tasdiqlash → rezerv qo'yiladi (TTL 24 soat)
        └─ YIGILMOQDA → YOLDA → BAJARILGAN
                                   ├─ ERP: Sotuv + OmborHarakati(CHIQIM)
                                   ├─ rezerv o'chadi
                                   ├─ sodiqlik ballari yoziladi
                                   └─ mijozga chek havolasi (mavjud /chek/[raqam])
```

### 8.3 Ortiqcha sotishning oldini olish

Uch nuqtada tekshiriladi:

1. **Katalogda** — "yo'q" bo'lsa savatga qo'shib bo'lmaydi
2. **Rasmiylashtirishda** — buyurtma yaratishdan oldin qayta tekshirish
3. **Tasdiqlashda** — rezerv qo'yish paytida atomik tekshiruv (`SELECT … FOR UPDATE`)

Kassa qoldig'i hisoblanganda **faol rezervlar ayiriladi** — shunda kassir
band qilingan tovarni sotib yubormaydi. Bu ERP'dagi `getStockMap` ga
qo'shimcha talab.

---

## 9. Funksional bo'lmagan talablar

| Soha | Talab |
|---|---|
| **Mobil** | Mobile-first. Barcha tugmalar ≥ 44×44px (WCAG 2.5.8) |
| **Til** | O'zbek lotin (asosiy), o'zbek kirill, rus. ERP'da transliteratsiya jadvali allaqachon bor — qayta ishlatiladi |
| **SEO** | Mahsulot sahifalari server-render, `sitemap.xml`, JSON-LD `Product` sxemasi |
| **Rasm** | WebP/AVIF, moslashuvchan o'lchamlar, CDN, lazy-load |
| **Kesh** | Katalog — 60s ISR; mavjudlik holati — kechiksiz |
| **Kirish imkoniyati** | Klaviatura bilan to'liq boshqarish, kontrast ≥ 4.5:1 |
| **PWA** | Offline katalog ko'rish (ERP'da `next-pwa` allaqachon bor) |
| **Jurnal** | Har bir holat o'zgarishi `MpHolatTarix` da — kim, qachon, nega |
| **Zaxira nusxa** | Kunlik; `mp_*` jadvallar ERP bilan birga |

---

## 10. Bosqichlar va reja

| Bosqich | Mazmuni | Natija |
|---|---|---|
| **0. Tayyorgarlik** | Rasmlarni CDN'ga ko'chirish · **ombordan sotuv (5.1)** · `/api/marketplace/*` shartnomasi · HMAC kalit | ERP marketplace'ga tayyor |
| **1. Katalog** | Ommaviy sayt: bosh sahifa, kategoriya, mahsulot sahifasi, qidiruv | Ko'rish mumkin, buyurtma yo'q |
| **2. Savat va hisob** | Savat, telefon tasdiqlash, manzil | Mijoz hisob ocha oladi |
| **3. Buyurtma** | Rasmiylashtirish, rezerv, do'kon paneli, holatlar | **To'liq ishlaydigan v1** |
| **4. Integratsiya** | `Sotuv` yaratish, sodiqlik, Telegram xabarnomalar | ERP bilan bir butun |
| **5. Sinov** | Yuk sinovi, ortiqcha sotish sinovi, xavfsizlik tekshiruvi | Ishga tushirishga tayyor |
| **6. v2** | Onlayn to'lov, sharh, yetkazib berish, ko'p sotuvchi | Kengaytirish |

Har bosqich oxirida: avtomatik testlar + brauzer QA + `npm run build` toza.

---

## 11. Tavakkalchiliklar

| Xavf | Ehtimol | Ta'sir | Chora |
|---|---|---|---|
| **Ortiqcha sotish** | Yuqori | Yuqori | Uch nuqtali tekshiruv + rezerv + atomik tranzaksiya |
| Neon Singapurda — sekinlik | Yuqori | O'rta | Kesh, ISR; mintaqani ko'chirish |
| Rasmlar base64 — sekin katalog | Aniq | Yuqori | Bosqich 0'da CDN'ga ko'chirish (majburiy) |
| Kelish narxi sizib chiqishi | O'rta | **Juda yuqori** | Ochiq API'da oq ro'yxat; avtomatik test |
| USD kurs o'zgarishi | O'rta | O'rta | Buyurtmada kursni qotirish (`usdKursi`) |
| ERP sxemasi o'zgarishi MP'ni sindiradi | O'rta | O'rta | Shartnomaviy API + versiyalash |
| Neon uzilishi (bu sessiyada bir necha marta bo'ldi) | O'rta | Yuqori | Qayta urinish, "vaqtincha ishlamayapti" holati |
| Soxta buyurtma / spam | O'rta | O'rta | SMS tasdiqlash, tezlik cheklovi |

---

## 12. Takliflar

Bular so'ralmagan, lekin tizimni o'rganib chiqqach foydali deb topilgan fikrlar.

### 12.1 ⭐ Telegram Mini App — saytdan oldin

O'zbekistonda Telegram hukmron, va tizimda **allaqachon** bor:
`Mijoz.telegram_id`, GramJS userbot, grammy bot, xabarnoma jurnali.

Telegram Mini App bersa:
- Parol kerak emas — Telegram o'zi tasdiqlaydi (`initData` imzosi)
- Xabarnoma kanali tayyor
- O'rnatish shart emas, havola yetarli

**Taklif:** v1'ni Mini App sifatida chiqarish, sayt esa SEO uchun keyin.
Yoki ikkalasi bitta kod bazasidan — Next.js ikkalasini ham beradi.

### 12.2 Onlayn to'lovni v1'ga qo'shmaslik

Payme/Click integratsiyasi shartnoma, sinov muhiti va qaytarish (refund)
mantiqini talab qiladi. "Yetkazishda naqd" bilan boshlash bir necha hafta
tejaydi va bozorni tekshirish imkonini beradi. Talab bo'lsa v2'da qo'shiladi.

### 12.3 Aniq qoldiqni ko'rsatmaslik

"12 dona qoldi" deyish raqobatchiga ombor hajmini ochib beradi va
"kam qoldi" psixologik bosimini yo'qotadi. Uch holat yetarli:
**bor · kam qoldi · yo'q**. Bu mavjud ochiq API printsipiga ham mos.

### 12.4 Rasmlarni CDN'ga ko'chirish — ERP uchun ham foydali

Hozir har mahsulot 3 tagacha 1080px JPEG'ni base64 sifatida bazada saqlaydi.
Bu **ERP'ning o'zini ham** sekinlashtiradi (mahsulot ro'yxati so'rovi og'ir).
CDN'ga ko'chirish ikkala tizimga foyda beradi. Cloudflare R2 — bepul chiqish
trafigi, O'zbekiston uchun qulay.

### 12.5 Ko'p sotuvchini boshidan modellashtirish

`egaId` allaqachon "kim sotadi" degan savolga javob beradi. Buyurtmani
sotuvchi bo'yicha bo'lish (bitta savat → bir nechta sotuvchi buyurtmasi)
mantiqini **boshidan** qo'yish keyin qayta yozishdan ancha arzon —
hatto hozir bitta do'kon bo'lsa ham.

### 12.6 Yagona dizayn tizimi

ERP'da Tailwind palitrasi, `TovarNarxPaneli`, `LokatsiyaTanlash`, `Combobox`
kabi komponentlar bor. Marketplace ularni takrorlamasin — umumiy paketga
(`@biomax/ui`) chiqarish yoki hech bo'lmasa nusxalashda bir xil nomlash
saqlash. Ikki tizim bitta brend bo'lib ko'rinishi kerak.

### 12.7 ERP'da avval tuzatilsa yaxshi bo'ladigan narsalar

1. **Deploy hali qilinmagan** — marketplace'dan oldin ERP ishlab turishi kerak
2. `AUTH_SECRET` git tarixida — almashtirilishi shart
3. `CRON_SECRET` serverda o'rnatilmagan
4. `filialId=null` uchun `@@unique` teshigi — boshqa jadvallarda ham bor
5. Neon mintaqasi — O'zbekistonga yaqinroq variant

---

## 13. Ochiq savollar

Bularsiz reja to'liq bo'lmaydi. Har biriga qabul qilingan **taxmin** ham yozilgan —
javob kelmaguncha shu bo'yicha ishlanadi.

| # | Savol | Vaqtinchalik taxmin |
|---|---|---|
| ~~1~~ | ~~Bitta do'kon yoki ko'p sotuvchi?~~ | ✅ **Javob berildi:** bitta do'kon, ombordan ham sotuv, filialga tayyor |
| ~~2~~ | ~~Sayt yoki Mini App?~~ | ✅ **Javob berildi:** sayt |
| **3** | **To'lov: onlayn (Payme/Click) yoki yetkazishda?** | v1 — yetkazishda; onlayn v2 |
| 4 | Yetkazib berish: o'z kuryeri, Yandex, yoki olib ketish? | O'z kuryeri + olib ketish |
| 5 | Qaysi hududlarga yetkaziladi va narxi qanday? | Bitta shahar, belgilangan narx |
| 6 | Domen bormi? | Yo'q — kerak bo'ladi |
| 7 | Katalogga hamma mahsulot chiqadimi yoki tanlanganlarimi? | Tanlangan (`MpElon.faol`) |
| 8 | Minimal buyurtma summasi bormi? | Yo'q |

---

## 14. Keyingi qadam

1. **3-savolga javob** (to'lov) — 1 va 2 hal bo'ldi
2. Arxitektura variantini tasdiqlash (tavsiya: **C**)
3. Bosqich 0 ni boshlash: rasmlarni CDN'ga ko'chirish + `/api/marketplace/*` shartnomasi
   + **ombordan sotuv** (5.1) — bu ERP tomonidagi eng katta ish

---

*Hujjat mavjud kod tahlili asosida yozildi: 42 model, 109 API marshrut,
18 sahifa, 34 lib moduli o'rganildi.*
