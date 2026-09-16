# BioMax Marketplace

BioMax do'koni uchun onlayn savdo maydonchasi. Mavjud ERP/POS tizimidan
**alohida** ishlab chiqiladi, lekin u bilan bitta zaxira va bitta hisobotda
ishlaydi.

## Hozirgi holat

**Ishlaydi:**
- Landing, katalog (qidiruv, kategoriya), mahsulot sahifasi — ERP'dan jonli narx va mavjudlik
- Ro'yxatdan o'tish / kirish — kod mijozning **Telegram profiliga** keladi (ERP'dagi do'kon akkaunti orqali)
- Savat, rasmiylashtirish (kuryer yoki olib ketish, vaqt oralig'i, naqd/karta — qabul qilganda)
- Buyurtma sahifasi: holat chizig'i, mijoz o'zi bekor qilishi (kuryerga topshirilguncha)
- ERP'da **Onlayn buyurtmalar** paneli: tasdiqlash → yig'ish → yo'lda → topshirildi; har bosqichda mijozga Telegram xabari
- Qorong'i rejim, har qanday ekran o'lchami

- ERP bilan to'liq bog'lanish: tasdiqlangan buyurtma mahsulotni **band qiladi**, topshirilgani ERP'da
  **sotuv** (chek, ombor chiqimi, mijoz kartasi, ballar) bo'lib yoziladi
- Mahsulot sahifasi: galereya, aksiya (eski narx, −%), birlik narxi, xususiyatlar, aniq yetkazish vaqti,
  savatdagi miqdor, "Hozir sotib olish", ulashish, yaqinda ko'rilganlar, schema.org ma'lumoti
- ERP'da **Onlayn vitrina**: rasm (10 tagacha), tavsif, xususiyatlar, hajm, aksiya, saytga chiqarish

**Mahsulot ma'lumoti qayerda kiritiladi:** faqat ERP → "Onlayn vitrina". Sayt uni o'zi oladi (1 daqiqa kesh).
Aksiya narxi kassada ham amal qiladi va muddati tugaganda asl narx o'zi qaytadi.

**Hali yo'q:** sharhlar va baholar, sevimlilar, "kelganda xabar berish" (2-bosqich); aqlli qidiruv
va filtrlar (3-bosqich); onlayn to'lov.

## Ishga tushirish

```bash
npm run ishga
```

ERP (`:3001`) va vitrinani (`:3002`) **birga** ko'taradi. Undan oldin
tekshiradi: sozlamalar to'liqligi, HMAC kalitlari ikkala tomonda mosligi,
migratsiya pooler orqali o'tmasligi, portlar bo'shligi. So'ng migratsiyalarni
qo'llaydi va salomatlik tekshiruvi o'tguncha kutadi.

| Manzil | Nima |
|---|---|
| http://localhost:3002 | Vitrina (xaridor) |
| http://localhost:3001 | ERP (do'kon) |
| http://localhost:3002/api/salomatlik | Baza va ERP shartnomasi holati |

ERP boshqa papkada bo'lsa: `ERP_PAPKA=<yo'l> npm run ishga`.

**Birinchi marta:**

```bash
npm install
cp .env.example .env                  # kalitlarni to'ldiring
npx tsx prisma/vitrina-toldirish.ts   # ERP tovarlarini vitrinaga chiqarish
```

ERP ning `.env` faylidagi `MP_HMAC_SECRET` bu yerdagi `ERP_HMAC_SECRET`
bilan **aynan bir xil** bo'lishi shart — `npm run ishga` buni tekshiradi.

> ⚠️ `DIRECT_DATABASE_URL` pooler manzili bo'lmasligi kerak. Migratsiya
> Neon pooler orqali o'tsa, sessiya sozlamasi ERP ga tarqalib, uning
> so'rovlarini buzadi (2026-09-13 da sodir bo'lgan).

## Dizayn

[Dizayn kanvasi](https://claude.ai/code/artifact/8056154b-8158-4efd-a6e7-d54cecd628bd) —
to'qqizta ekran. Tokenlar `src/app/globals.css` da.

## Hujjatlar

- [Texnik topshiriq (TZ)](hujjatlar/TZ.md) — to'liq talablar, arxitektura,
  ma'lumotlar modeli, bosqichlar va tavakkalchiliklar

## Bog'liq tizim

Mavjud ERP: `C:\Users\Ozodbek\Desktop\konstovar\konstovar`
(Next.js 16 + Prisma 7 + Neon PostgreSQL)

Marketplace ERP bilan `/api/marketplace/*` shartnomaviy marshrutlari orqali
gaplashadi — batafsil TZ'ning 7-bo'limida.

Teskari yo'nalish (ERP → marketplace, xuddi shu HMAC kalit, imzoga yo'l ham kiradi):

| Marshrut | ERP'dagi joyi |
|---|---|
| `GET /api/erp/buyurtmalar`, `…/[raqam]`, `POST …/[raqam]/holat` | Onlayn buyurtmalar paneli |
| `GET /api/erp/mijozlar?q=&filtr=&tartib=&sahifa=` | Mijozlar › Onlayn mijozlar (ro'yxat va statistika) |
| `GET /api/erp/mijozlar/[id]` | Mijoz oynasi: manzillar, barcha buyurtmalar tarkibi va holat tarixi bilan |

Kirish kodlari va savat bu shartnomalardan chiqmaydi.

## Serverga chiqarish

**Marketplace `.env`:**
- `KOD_KANALI="telegram"` — kod ERP orqali Telegram'ga. `konsol` faqat lokal rivojlanish uchun.
- `PROKSI_ORQALI="true"` — nginx ortida. nginx'da: `proxy_set_header X-Real-IP $remote_addr;`
- `SAYT_URL` — saytning tashqi manzili.

**ERP `.env`:**
- `MARKETPLACE_URL` — marketplace'ning ichki manzili (buyurtmalarni boshqarish uchun).
- `MARKETPLACE_OMMAVIY_URL` — mijozga Telegram xabaridagi buyurtma havolasi uchun.
- `MP_KOD_YANGI_RAQAM_SOATIGA` (ixtiyoriy, standart 20) — Telegram'da hali topilmagan raqamlarga
  soatiga nechta kod yuborilishi. Do'kon akkaunti spam deb cheklanmasligi uchun.

**Muhim:** lokal ERP jonli Telegram sessiyasiga ulanmaydi (`ONLAYN_TELEGRAM_DEV` qo'yilmagan bo'lsa) —
bitta sessiya ikki joydan ishlatilsa Telegram serverdagisini bekor qilishi mumkin.

## Vercel'ga deploy

Loyiha Vercel uchun tayyor: `postinstall` da `prisma generate`, mintaqa
`vercel.json` da `sin1` (ERP bilan bir joyda), Node 22.

### 1. Muhit o'zgaruvchilari — deploydan OLDIN

Vercel → Project → Settings → Environment Variables. Bularsiz **build yiqiladi**
(`src/lib/sozlama.ts` ataylab shunday: noto'g'ri sozlama bilan sayt ko'tarilmaydi):

| O'zgaruvchi | Qiymat | Majburiymi |
|---|---|---|
| `DATABASE_URL` | Neon **pooler** manzili (`-pooler.` bor) | ha |
| `ERP_BASE_URL` | ERP ning tashqi manzili, masalan `https://erp.biomax.uz` | ha |
| `ERP_HMAC_SECRET` | ERP dagi bilan **bir xil**, kamida 32 belgi | ha |
| `SESSION_SECRET` | kamida 32 belgi, faqat shu sayt uchun | ha |
| `KOD_KANALI` | `telegram` | ha |
| `PROKSI_ORQALI` | `true` (Vercel teskari proksi ortida ishlaydi) | ha |
| `SAYT_URL` | doimiy domen, masalan `https://biomax.uz` | yo'q¹ |
| `DIRECT_DATABASE_URL` | migratsiya uchun, `-pooler.` **siz** | yo'q² |

¹ Yozilmasa Vercel'ning o'z domeni olinadi. Doimiy domen ulangach yozib
qo'ygan ma'qul — SEO havolalari shunga qarab yaratiladi.

² Vercel'da kerak emas: `prisma generate` bazaga ulanmaydi. Migratsiya
lokal kompyuterdan qo'llanadi (pastga qarang).

### 2. Migratsiya

Vercel build paytida migratsiya **qilinmaydi** — ERP bilan bitta bazada
ishlagani uchun bu xavfli. Sxema o'zgarsa, lokal kompyuterdan:

```bash
npx prisma migrate deploy      # DIRECT_DATABASE_URL (pooler EMAS) ishlatiladi
```

### 3. ERP tomonini ulash

ERP `.env` ida `MARKETPLACE_URL` va `MARKETPLACE_OMMAVIY_URL` yangi Vercel
domeniga qaratiladi, `ERP_HMAC_SECRET` esa ikkalasida bir xil bo'ladi.

### Deployda nima xato bo'lishi mumkin

| Belgi | Sabab |
|---|---|
| Build "Muhit sozlamalari noto'g'ri" bilan to'xtaydi | yuqoridagi majburiy o'zgaruvchilardan biri yo'q yoki 32 belgidan qisqa |
| Sayt ochiladi, lekin kirish/savat "Ruxsat yo'q" (403) | `SAYT_URL` boshqa domenni ko'rsatyapti — bo'sh qoldiring yoki aniq domenni yozing |
| Kod kelmaydi | `ERP_BASE_URL` noto'g'ri yoki ERP da Telegram sessiyasi yo'q |
| "relation does not exist" | migratsiya qo'llanmagan yoki pooler orqali qo'llangan |

**Eslatma:** IP bo'yicha tezlik chegarasi server xotirasida (`src/lib/api.ts`).
Vercel bir nechta nusxada ishlaganda har nusxa o'z hisobini yuritadi. Asosiy
himoya baribir telefon raqami bo'yicha, bazada (`src/lib/domen/kirish-kodi.ts`).

## Boshlashdan oldin

TZ'ning **13-bo'limidagi ochiq savollarga** javob kerak, ayniqsa:

1. Bitta do'kon do'konimi yoki ko'p sotuvchili maydonchami?
2. Sayt, Telegram Mini App yoki ikkalasi?
3. To'lov onlaynmi yoki yetkazishdami?
