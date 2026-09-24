import 'server-only'
import { db } from '@/lib/db'
import { xato, type Natija } from '@/lib/natija'
import type { DokonMalumoti, KatalogJavobi, KatalogTovari } from './turlar'

// ERP ma'lumotlari — BITTA bazadan, to'g'ridan-to'g'ri.
//
// ERP (`public` sxema) va vitrina (`marketplace` sxema) bitta PostgreSQL
// bazasida turadi. Ilgari katalog ERP'ning HTTP shartnomasi orqali olinardi:
// u tarmoqqa, HMAC kalitiga va 60 soniyalik keshga bog'liq edi — kalit
// yo'qolsa yoki ERP javob bermasa sayt bo'shab qolardi. Endi ma'lumot shu
// yerdan o'qiladi: narx va mavjudlik REAL VAQTDA, kalitsiz.
//
// Sayt ERP JADVALLARINI o'zi o'qimaydi — faqat `public.vitrina_katalog`
// ko'rinishini. Aniq qoldiq, kelish narxi va ta'minotchi o'sha ko'rinishda
// umuman yo'q (ERP migratsiyasi: `20260924120000_vitrina_korinishi`).

/** Ko'rinish qaytaradigan qator — ustunlar ko'rinish ta'rifidagidek. */
interface KatalogQatori {
  id: string
  nomi: string
  birlik: string
  shtrixKod: string | null
  sotishNarxi: number
  valyuta: string
  mavjudlik: string
  kategoriyaId: string | null
  kategoriyaNomi: string | null
  omborId: string | null
  omborNomi: string | null
  sarlavha: string | null
  brend: string | null
  tavsif: string | null
  xususiyatlar: unknown
  hajm: number | null
  hajmBirligi: string | null
  eskiNarx: number | null
  aksiyaOxiri: Date | null
  rasmlar: string[] | null
  yangilangan: Date
}

const HAJM_BIRLIKLARI = new Set(['G', 'KG', 'ML', 'L', 'DONA', 'M'])

/**
 * Xususiyatlar ERP'da erkin JSON: `[{ nomi, qiymat }, ...]`. Buzuq yoki
 * kutilmagan qator sahifani yiqitmasligi uchun shu yerda tozalanadi.
 */
function xususiyatlarniTozala(x: unknown): { nomi: string; qiymat: string }[] {
  if (!Array.isArray(x)) return []
  const toza: { nomi: string; qiymat: string }[] = []
  for (const q of x) {
    if (!q || typeof q !== 'object') continue
    const { nomi, qiymat } = q as { nomi?: unknown; qiymat?: unknown }
    if (typeof nomi !== 'string' || typeof qiymat !== 'string') continue
    const n = nomi.trim().slice(0, 60)
    const v = qiymat.trim().slice(0, 200)
    if (n && v) toza.push({ nomi: n, qiymat: v })
  }
  return toza.slice(0, 30)
}

function qatorniOgir(q: KatalogQatori): KatalogTovari {
  return {
    id: q.id,
    nomi: q.nomi,
    birlik: q.birlik,
    shtrixKod: q.shtrixKod,
    sotishNarxi: Number(q.sotishNarxi),
    valyuta: q.valyuta === 'USD' ? 'USD' : 'UZS',
    mavjudlik: q.mavjudlik === 'YOQ' ? 'YOQ' : q.mavjudlik === 'KAM' ? 'KAM' : 'BOR',
    kategoriya: q.kategoriyaId && q.kategoriyaNomi ? { id: q.kategoriyaId, nomi: q.kategoriyaNomi } : null,
    ombor: q.omborId && q.omborNomi ? { id: q.omborId, nomi: q.omborNomi } : null,
    sarlavha: q.sarlavha,
    brend: q.brend,
    tavsif: q.tavsif,
    xususiyatlar: xususiyatlarniTozala(q.xususiyatlar),
    hajm: q.hajm === null ? null : Number(q.hajm),
    hajmBirligi: q.hajmBirligi && HAJM_BIRLIKLARI.has(q.hajmBirligi)
      ? (q.hajmBirligi as KatalogTovari['hajmBirligi'])
      : null,
    eskiNarx: q.eskiNarx === null ? null : Number(q.eskiNarx),
    aksiyaOxiri: q.aksiyaOxiri ? new Date(q.aksiyaOxiri).toISOString() : null,
    rasmlar: q.rasmlar ?? [],
    yangilangan: new Date(q.yangilangan).toISOString(),
  }
}

/**
 * Vitrina katalogi — real vaqtda.
 *
 * Kesh yo'q: so'rov bazada ~0.2 s va narx/mavjudlik eskirmasligi muhimroq
 * (mijoz savatga solgan narsa kassadagi narx bilan bir xil bo'lishi kerak).
 */
export async function katalogBazadan(): Promise<Natija<KatalogJavobi>> {
  try {
    const [qatorlar, kurs] = await Promise.all([
      db.$queryRawUnsafe<KatalogQatori[]>('SELECT * FROM public.vitrina_katalog ORDER BY nomi ASC'),
      usdKursi(),
    ])
    return {
      ok: true,
      qiymat: {
        tovarlar: qatorlar.map(qatorniOgir),
        usdKursi: kurs,
        vaqt: new Date().toISOString(),
      },
    }
  } catch (e) {
    console.error('[erp/baza] katalog o‘qilmadi', e)
    return xato('erp_ulanmadi', 'Do‘kon ma’lumotlari hozir mavjud emas. Birozdan so‘ng urinib ko‘ring.')
  }
}

/**
 * Joriy USD kursi (ERP kuniga bir marta Markaziy bankdan yangilaydi).
 * Yo'q bo'lsa `null` — dollarli tovar so'mga o'girilmaydi, taxminiy kurs
 * bilan sotgandan ko'ra ko'rsatmagan ma'qul.
 */
async function usdKursi(): Promise<number | null> {
  const qatorlar = await db.$queryRawUnsafe<{ qiymat: string }[]>(
    `SELECT qiymat FROM public.sozlamalar WHERE kalit = 'usd_kursi' LIMIT 1`,
  )
  const k = Number(qatorlar[0]?.qiymat)
  return Number.isFinite(k) && k > 0 ? k : null
}

const DOKON_KALITLARI = ['dokon_nomi', 'telefon', 'manzil', 'ish_vaqti', 'qaytarish_shartlari']

/** Do'kon aloqa ma'lumotlari — ERP sozlamalari (chekdagi bilan bir xil). */
export async function dokonBazadan(): Promise<Natija<DokonMalumoti>> {
  try {
    const qatorlar = await db.$queryRawUnsafe<{ kalit: string; qiymat: string | null }[]>(
      `SELECT kalit, qiymat FROM public.sozlamalar WHERE kalit = ANY($1::text[])`,
      DOKON_KALITLARI,
    )
    const q = (k: string) => qatorlar.find(x => x.kalit === k)?.qiymat?.trim() || null
    return {
      ok: true,
      qiymat: {
        nomi: q('dokon_nomi'),
        telefon: q('telefon'),
        manzil: q('manzil'),
        ishVaqti: q('ish_vaqti'),
        qaytarishShartlari: q('qaytarish_shartlari'),
      },
    }
  } catch (e) {
    console.error('[erp/baza] do‘kon ma’lumoti o‘qilmadi', e)
    return xato('erp_ulanmadi', 'Do‘kon ma’lumotlari hozir mavjud emas.')
  }
}

/**
 * Mahsulot rasmi. ERP rasmlarni `data:image/...;base64,...` ko'rinishida
 * saqlaydi — bu yerda baytlarga ochiladi va HTTP javobida keshlanadi.
 */
export async function rasmBazadan(
  tovarId: string,
  tartib: number,
): Promise<{ turi: string; baytlar: Buffer } | null> {
  if (!Number.isInteger(tartib) || tartib < 0 || tartib > 20) return null
  try {
    const qatorlar = await db.$queryRawUnsafe<{ rasm: string | null }[]>(
      `SELECT rasmlar[$2] AS rasm FROM public.tovarlar
       WHERE id = $1 AND holati = 'FAOL' AND qulflangan = false
         AND EXISTS (SELECT 1 FROM public.tovar_kartochkalari k WHERE k."tovarId" = public.tovarlar.id AND k.saytda = true)`,
      tovarId,
      tartib + 1, // PostgreSQL massivi 1 dan boshlanadi
    )
    const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/.exec(qatorlar[0]?.rasm ?? '')
    if (!m) return null
    return { turi: m[1]!, baytlar: Buffer.from(m[2]!, 'base64') }
  } catch (e) {
    console.error('[erp/baza] rasm o‘qilmadi', e)
    return null
  }
}

/**
 * Mijoz buyurtmani bekor qilganda ERP'dagi band (rezerv) bo'shatiladi.
 * Idempotent: band bo'lmasa ham muvaffaqiyatli, 0 qaytadi.
 */
export async function rezervBoshatBazada(buyurtmaRaqami: string): Promise<Natija<{ boshatildi: number }>> {
  try {
    const n = await db.$executeRawUnsafe(
      `UPDATE public.onlayn_rezervlar
          SET holati = 'BOSHATILDI', "yangilangan" = now()
        WHERE "buyurtmaRaqami" = $1 AND holati = 'FAOL'`,
      buyurtmaRaqami,
    )
    return { ok: true, qiymat: { boshatildi: Number(n) } }
  } catch (e) {
    console.error('[erp/baza] rezerv bo‘shatilmadi', e)
    return xato('erp_ulanmadi', 'Buyurtmani bekor qilib bo‘lmadi. Birozdan so‘ng urinib ko‘ring.')
  }
}
