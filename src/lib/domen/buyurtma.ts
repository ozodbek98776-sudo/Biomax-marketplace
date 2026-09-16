// Buyurtma qoidalari — sof mantiq (baza va tarmoqsiz, sinovga oson).
//
// Holatlar, ruxsat etilgan o'tishlar, yetkazish vaqti oraliqlari va
// rasmiylashtirish formasining tekshiruvi SHU YERDA. Sahifa, API va ERP
// tomonidagi boshqaruv hammasi shu qoidalardan foydalanadi — "mijoz qachon
// bekor qila oladi" degan savolga ikki joyda ikki xil javob bo'lmasin.

import { type Natija, muvaffaq, xato } from '@/lib/natija'
import { telefonniTozala } from '@/lib/domen/telefon'
import type { YetkazishHududi } from '@/lib/dokon'

export const HOLATLAR = ['YANGI', 'TASDIQLANGAN', 'YIGILMOQDA', 'YOLDA', 'BAJARILGAN', 'BEKOR', 'QAYTARILGAN'] as const
export type Holat = (typeof HOLATLAR)[number]
export type Yetkazish = 'KURYER' | 'OLIB_KETISH'
export type TolovUsuli = 'NAQD_YETKAZISHDA' | 'KARTA_YETKAZISHDA'

/** Oldinga yo'l. Orqaga qaytish yo'q: "yo'lda"dan "yig'ilmoqda"ga qaytgan buyurtma tarixni chalkashtiradi. */
const OTISHLAR: Record<Holat, readonly Holat[]> = {
  YANGI: ['TASDIQLANGAN', 'BEKOR'],
  TASDIQLANGAN: ['YIGILMOQDA', 'BEKOR'],
  YIGILMOQDA: ['YOLDA', 'BEKOR'],
  YOLDA: ['BAJARILGAN', 'BEKOR'],
  BAJARILGAN: ['QAYTARILGAN'],
  BEKOR: [],
  QAYTARILGAN: [],
}

export function holatmi(q: unknown): q is Holat {
  return typeof q === 'string' && (HOLATLAR as readonly string[]).includes(q)
}

export function keyingiHolatlar(joriy: Holat): readonly Holat[] {
  return OTISHLAR[joriy]
}

export function otishMumkinmi(joriy: Holat, yangi: Holat): boolean {
  return OTISHLAR[joriy].includes(yangi)
}

/**
 * Mijoz o'zi bekor qila oladimi.
 *
 * Kuryerga topshirilgunga qadar — ha. Yo'lga chiqqan buyurtmani bir bosishda
 * bekor qilish kuryerning bo'sh yurishiga olib keladi: bu do'kon bilan
 * gaplashib hal qilinadi.
 */
export function mijozBekorQilaOladimi(joriy: Holat): boolean {
  return joriy === 'YANGI' || joriy === 'TASDIQLANGAN' || joriy === 'YIGILMOQDA'
}

/** Yakunlangan (boshqa o'zgarmaydigan yoki faqat qaytariladigan) holat. */
export function yakunlanganmi(h: Holat): boolean {
  return h === 'BAJARILGAN' || h === 'BEKOR' || h === 'QAYTARILGAN'
}

export function holatYorligi(h: Holat, yetkazish: Yetkazish = 'KURYER'): string {
  switch (h) {
    case 'YANGI': return 'Qabul qilindi'
    case 'TASDIQLANGAN': return 'Tasdiqlandi'
    case 'YIGILMOQDA': return 'Yig‘ilmoqda'
    case 'YOLDA': return yetkazish === 'OLIB_KETISH' ? 'Olib ketishga tayyor' : 'Yo‘lda'
    case 'BAJARILGAN': return yetkazish === 'OLIB_KETISH' ? 'Olib ketildi' : 'Topshirildi'
    case 'BEKOR': return 'Bekor qilindi'
    case 'QAYTARILGAN': return 'Qaytarildi'
  }
}

/** Mijozga ko'rsatiladigan bosqichlar (bekor/qaytarish bu chiziqda emas). */
export const BOSQICHLAR: readonly Holat[] = ['YANGI', 'TASDIQLANGAN', 'YIGILMOQDA', 'YOLDA', 'BAJARILGAN']

/** Ko'rinadigan raqam: MP-2026-00042 */
export function buyurtmaRaqami(yil: number, tartib: number): string {
  return `MP-${yil}-${String(tartib).padStart(5, '0')}`
}

// ─── Yetkazish vaqti ─────────────────────────────────────────────────
//
// Toshkent vaqti (UTC+5, yozgi vaqt yo'q) — server qaysi mintaqada
// ishlashidan qat'i nazar oraliqlar bir xil chiqsin.

const TOSHKENT_MS = 5 * 3_600_000
/** Buyurtmani yig'ish va yo'lga chiqarish uchun eng kam vaqt. */
const TAYYORLASH_MS = 2 * 3_600_000
/** Ikki soatlik oraliqlar boshlanishi (Toshkent soati). */
const ORALIQ_BOSHLARI = [10, 12, 14, 16, 18] as const
/** "Imkon qadar tez" shu soatlar orasida qabul qilinadi (kuryer ish vaqti). */
const TEZ_SOATLAR = { dan: 8, gacha: 19 } as const

export interface VaqtOraligi {
  /** `tez` yoki `YYYY-MM-DD@HH` (Toshkent) */
  id: string
  kun: 'bugun' | 'ertaga'
  yorliq: string
  /** Oraliq boshlanishi (UTC). `tez` uchun — hozirgi vaqt. */
  boshi: Date
}

function toshkentQismlari(t: number) {
  const d = new Date(t + TOSHKENT_MS)
  return { yil: d.getUTCFullYear(), oy: d.getUTCMonth(), kun: d.getUTCDate(), soat: d.getUTCHours() }
}

function toshkentVaqti(yil: number, oy: number, kun: number, soat: number): number {
  return Date.UTC(yil, oy, kun, soat) - TOSHKENT_MS
}

const ikki = (n: number) => String(n).padStart(2, '0')

/** Hozir tanlash mumkin bo'lgan oraliqlar: bugungi qolganlari va ertangi hammasi. */
export function vaqtOraliqlari(hozir: number = Date.now()): VaqtOraligi[] {
  const b = toshkentQismlari(hozir)
  const natija: VaqtOraligi[] = []

  if (b.soat >= TEZ_SOATLAR.dan && b.soat < TEZ_SOATLAR.gacha) {
    natija.push({ id: 'tez', kun: 'bugun', yorliq: 'Imkon qadar tez — 2 soat ichida', boshi: new Date(hozir) })
  }

  for (const [kun, siljish] of [['bugun', 0], ['ertaga', 1]] as const) {
    // Oy oxiri va yil oxirini `Date.UTC` o'zi to'g'rilaydi
    const asos = new Date(Date.UTC(b.yil, b.oy, b.kun + siljish))
    for (const soat of ORALIQ_BOSHLARI) {
      const boshi = toshkentVaqti(asos.getUTCFullYear(), asos.getUTCMonth(), asos.getUTCDate(), soat)
      if (boshi < hozir + TAYYORLASH_MS) continue
      const sana = `${asos.getUTCFullYear()}-${ikki(asos.getUTCMonth() + 1)}-${ikki(asos.getUTCDate())}`
      natija.push({
        id: `${sana}@${ikki(soat)}`,
        kun,
        yorliq: `${kun === 'bugun' ? 'Bugun' : 'Ertaga'}, ${ikki(soat)}:00–${ikki(soat + 2)}:00`,
        boshi: new Date(boshi),
      })
    }
  }
  return natija
}

// ─── Rasmiylashtirish formasi ────────────────────────────────────────

export interface RasmiylashtirishKirishi {
  yetkazish?: unknown
  hudud?: unknown
  manzil?: unknown
  moljal?: unknown
  lat?: unknown
  lng?: unknown
  vaqt?: unknown
  aloqaTel?: unknown
  aloqaIsm?: unknown
  tolov?: unknown
  izoh?: unknown
  manzilniSaqla?: unknown
}

export interface TekshirilganBuyurtma {
  yetkazish: Yetkazish
  hudud: string | null
  manzil: string | null
  moljal: string | null
  lat: number | null
  lng: number | null
  vaqt: VaqtOraligi
  aloqaTel: string
  aloqaIsm: string
  tolov: TolovUsuli
  izoh: string | null
  yetkazishNarx: number
  manzilniSaqla: boolean
}

function matn(q: unknown, maks: number): string | null {
  if (typeof q !== 'string') return null
  const t = q.trim().replace(/\s+/g, ' ')
  return t ? t.slice(0, maks) : null
}

/** Toshkent atrofi — xarita nuqtasi mantiqsiz bo'lsa (0,0 kabi) saqlanmaydi. */
function koordinata(lat: unknown, lng: unknown): { lat: number; lng: number } | null {
  const a = typeof lat === 'number' ? lat : NaN
  const o = typeof lng === 'number' ? lng : NaN
  if (!Number.isFinite(a) || !Number.isFinite(o)) return null
  if (a < 40.9 || a > 41.7 || o < 68.8 || o > 69.8) return null
  return { lat: Math.round(a * 1e6) / 1e6, lng: Math.round(o * 1e6) / 1e6 }
}

export function rasmiylashtirishniTekshir(
  k: RasmiylashtirishKirishi,
  muhit: { hududlar: readonly YetkazishHududi[]; oraliqlar: readonly VaqtOraligi[]; standartIsm: string | null },
): Natija<TekshirilganBuyurtma> {
  const yetkazish: Yetkazish | null = k.yetkazish === 'KURYER' || k.yetkazish === 'OLIB_KETISH' ? k.yetkazish : null
  if (!yetkazish) return xato('yetkazish_notogri', 'Qabul qilish usulini tanlang', { maydon: 'yetkazish' })

  let hudud: YetkazishHududi | null = null
  let manzil: string | null = null
  let moljal: string | null = null
  let nuqta: { lat: number; lng: number } | null = null

  if (yetkazish === 'KURYER') {
    hudud = muhit.hududlar.find(h => h.faol && h.nomi === k.hudud) ?? null
    if (!hudud) return xato('hudud_notogri', 'Yetkazish hududini tanlang', { maydon: 'hudud' })
    manzil = matn(k.manzil, 200)
    if (!manzil || manzil.length < 5) {
      return xato('manzil_notogri', 'Manzilni to‘liq yozing: ko‘cha, uy, xonadon', { maydon: 'manzil' })
    }
    moljal = matn(k.moljal, 120)
    nuqta = koordinata(k.lat, k.lng)
  }

  const vaqt = muhit.oraliqlar.find(o => o.id === k.vaqt)
  if (!vaqt) {
    return xato('vaqt_notogri', typeof k.vaqt === 'string' && k.vaqt
      ? 'Tanlangan vaqt o‘tib ketdi — boshqa vaqtni tanlang'
      : 'Qulay vaqtni tanlang', { maydon: 'vaqt' })
  }

  const aloqaTel = telefonniTozala(k.aloqaTel)
  if (!aloqaTel) return xato('telefon_notogri', 'Aloqa telefonini to‘liq kiriting', { maydon: 'aloqaTel' })

  const aloqaIsm = matn(k.aloqaIsm, 60) ?? muhit.standartIsm
  if (!aloqaIsm || aloqaIsm.length < 2) return xato('ism_notogri', 'Qabul qiluvchining ismini kiriting', { maydon: 'aloqaIsm' })

  const tolov: TolovUsuli | null =
    k.tolov === 'NAQD_YETKAZISHDA' || k.tolov === 'KARTA_YETKAZISHDA' ? k.tolov : null
  if (!tolov) return xato('tolov_notogri', 'To‘lov usulini tanlang', { maydon: 'tolov' })

  return muvaffaq({
    yetkazish,
    hudud: hudud?.nomi ?? null,
    manzil,
    moljal,
    lat: nuqta?.lat ?? null,
    lng: nuqta?.lng ?? null,
    vaqt,
    aloqaTel,
    aloqaIsm,
    tolov,
    izoh: matn(k.izoh, 300),
    yetkazishNarx: hudud?.narxSom ?? 0,
    manzilniSaqla: yetkazish === 'KURYER' && k.manzilniSaqla === true,
  })
}

export function tolovYorligi(t: TolovUsuli | 'ONLAYN'): string {
  return t === 'NAQD_YETKAZISHDA' ? 'Naqd — qabul qilganda' : t === 'KARTA_YETKAZISHDA' ? 'Karta — qabul qilganda' : 'Onlayn'
}
