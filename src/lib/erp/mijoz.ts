import 'server-only'
import { z } from 'zod'
import { sozlama } from '@/lib/sozlama'
import { type Natija, muvaffaq, xato, XATOLAR } from '@/lib/natija'
import { imzoYarat } from './imzo'
import { SHARTNOMA_VERSIYASI, katalogJavobiSxema, dokonJavobiSxema } from './turlar'

// ERP shartnoma mijozi.
//
// Marketplace ERP bilan FAQAT shu fayl orqali gaplashadi. Boshqa hech
// qayerda `fetch(ERP_BASE_URL...)` yozilmasligi kerak — shunda imzolash,
// qayta urinish, javob tekshiruvi va xato tarjimasi bitta joyda qoladi.

const SORIQ_MS = 8_000

/**
 * ERP so'rovni imzo yoki kalit sababli rad etdi. Bu mijozning xatosi emas —
 * ikki tizim orasidagi SOZLAMA xatosi. Mijozga "Ruxsat yo'q" ko'rsatish
 * uni chalg'itardi; unga umumiy xabar, jurnalga esa aniq sabab yoziladi.
 * Kodlar ERP'dagi `lib/marketplace-imzo.ts` bilan bir xil.
 */
export const SOZLAMA_XATOLARI: Record<string, string> = {
  kalit_sozlanmagan: 'ERP serverida MP_HMAC_SECRET o‘rnatilmagan (kamida 32 belgi)',
  imzo_mos_emas: 'Kalitlar mos emas: ERP dagi MP_HMAC_SECRET va marketplace dagi ERP_HMAC_SECRET bir xil bo‘lishi kerak',
  imzo_shakli: 'Kalitlar mos emas: ERP dagi MP_HMAC_SECRET va marketplace dagi ERP_HMAC_SECRET bir xil bo‘lishi kerak',
  imzo_yoq: 'So‘rov imzosiz yetib bordi — oraliq proksi sarlavhalarni kesyapti',
  muddati_otgan: 'Server soatlari 5 daqiqadan ko‘proq farq qilyapti',
  kelajak_vaqti: 'Server soatlari 5 daqiqadan ko‘proq farq qilyapti',
  vaqt_notogri: 'So‘rov vaqti buzilgan',
}
/** Faqat vaqtinchalik nosozlikda qayta urinamiz — yozish amallarida EMAS. */
const QAYTA_URINISH = 2

interface Sorov {
  yol: string
  usul?: 'GET' | 'POST'
  tana?: unknown
  /** Yozish amali — qayta urinilmaydi (ikki marta bajarilib qolmasin). */
  yozish?: boolean
  /** Next kesh sozlamasi — faqat GET uchun. */
  kesh?: { revalidate: number; teglar?: string[] }
  /** Javob kutish muddati (ms). Standart 8 soniya. */
  kutish?: number
}

async function sorov<T>(s: Sorov, sxema: z.ZodType<T>): Promise<Natija<T>> {
  const usul = s.usul ?? 'GET'
  const tana = s.tana === undefined ? '' : JSON.stringify(s.tana)
  const urinishlar = s.yozish ? 1 : QAYTA_URINISH

  let oxirgiSabab = 'nomalum'

  for (let i = 0; i < urinishlar; i++) {
    const { vaqt, imzo } = imzoYarat(sozlama.ERP_HMAC_SECRET, s.yol, tana)
    const boshqaruvchi = new AbortController()
    const soat = setTimeout(() => boshqaruvchi.abort(), s.kutish ?? SORIQ_MS)

    try {
      const javob = await fetch(sozlama.ERP_BASE_URL + s.yol, {
        method: usul,
        signal: boshqaruvchi.signal,
        headers: {
          'Content-Type': 'application/json',
          'X-MP-Timestamp': vaqt,
          'X-MP-Signature': imzo,
          'X-MP-Version': String(SHARTNOMA_VERSIYASI),
        },
        body: usul === 'GET' ? undefined : tana,
        ...(s.kesh
          ? { next: { revalidate: s.kesh.revalidate, tags: s.kesh.teglar } }
          : { cache: 'no-store' as const }),
      })

      // 4xx — bizning xatomiz, qayta urinish yordam bermaydi.
      if (javob.status >= 400 && javob.status < 500) {
        const j = await javob.json().catch(() => ({})) as { kod?: string; xato?: string; tafsilot?: Record<string, unknown> }
        if (j.kod && j.kod in SOZLAMA_XATOLARI) {
          console.error(`[erp] so'rov rad etildi — sozlama xatosi «${j.kod}»: ${SOZLAMA_XATOLARI[j.kod]}`, s.yol)
          return xato('erp_sozlama', 'Do‘kon tizimi bilan aloqa hozir ishlamayapti. Do‘kon bilan bog‘laning.', { sabab: j.kod })
        }
        return xato(j.kod ?? 'erp_rad_etdi', j.xato ?? 'So‘rov rad etildi', { ...j.tafsilot, holat: javob.status })
      }
      if (!javob.ok) {
        oxirgiSabab = `holat_${javob.status}`
        continue
      }

      const xom: unknown = await javob.json()
      const tekshirilgan = sxema.safeParse(xom)
      if (!tekshirilgan.success) {
        // ERP kutilmagan shakl qaytardi — bu sozlash xatosi, qayta
        // urinish yordam bermaydi. Jurnalga to'liq yoziladi.
        console.error('[erp] javob shartnomaga mos emas', s.yol, tekshirilgan.error.issues)
        return xato('erp_shartnoma', 'Do‘kon tizimi kutilmagan javob qaytardi')
      }
      return muvaffaq(tekshirilgan.data)
    } catch (e) {
      oxirgiSabab = e instanceof Error && e.name === 'AbortError' ? 'vaqt_tugadi' : 'tarmoq'
    } finally {
      clearTimeout(soat)
    }
  }

  console.error('[erp] ulanmadi', s.yol, oxirgiSabab)
  const n = XATOLAR.erpUlanmadi()
  // Sabab (tarmoq / vaqt tugadi / 5xx) salomatlik tekshiruvida ko'rinsin
  return n.ok ? n : xato(n.xato.kod, n.xato.xabar, { sabab: oxirgiSabab })
}

// ─── Shartnoma amallari ──────────────────────────────────────────────

/**
 * Vitrina katalogi.
 *
 * Mavjudlik ombor + do'kon yig'indisidan hisoblanadi (TZ 5.1) — ombordagi
 * tovar ham sotuvda ko'rinsin.
 */
export function katalog() {
  return sorov(
    { yol: '/api/marketplace/katalog', kesh: { revalidate: 60, teglar: ['katalog'] } },
    katalogJavobiSxema,
  )
}

/**
 * Mijoz buyurtmani saytda bekor qilganda ERP'dagi zaxira bandini bo'shatish.
 * Idempotent — band bo'lmasa ham muvaffaqiyatli.
 */
export function rezervBoshat(buyurtmaRaqami: string) {
  return sorov(
    { yol: '/api/marketplace/rezerv-boshat', usul: 'POST', tana: { buyurtmaRaqami }, yozish: true },
    z.object({ ok: z.literal(true), boshatildi: z.number() }),
  )
}

/**
 * Kirish kodini mijozning Telegram profiliga yetkazish (do'kon akkaunti orqali).
 *
 * Telegram'da raqamni topish va tezlik chegarasi tufayli 10 soniyagacha
 * cho'ziladi. Yozish amali: qayta urinilmaydi — mijoz ikkita xabar olmasin.
 */
export function kirishKodiYubor(telefon: string, kod: string) {
  return sorov(
    { yol: '/api/marketplace/kod-yubor', usul: 'POST', tana: { telefon, kod }, yozish: true, kutish: 25_000 },
    z.object({ ok: z.literal(true) }),
  )
}

/** Do'kon aloqa ma'lumotlari — chekdagi bilan bir xil sozlamalar. */
export function dokonMalumoti() {
  return sorov(
    { yol: '/api/marketplace/dokon', kesh: { revalidate: 300, teglar: ['dokon'] } },
    dokonJavobiSxema,
  )
}

/**
 * Mahsulot rasmi (baytlar). JSON emas — shuning uchun umumiy `sorov` dan tashqarida,
 * lekin imzo va kutish muddati bir xil.
 */
export async function rasmOl(tovarId: string, tartib: number): Promise<{ turi: string; baytlar: ArrayBuffer } | null> {
  const yol = `/api/marketplace/rasm/${encodeURIComponent(tovarId)}/${tartib}`
  const { vaqt, imzo } = imzoYarat(sozlama.ERP_HMAC_SECRET, yol, '')
  const boshqaruvchi = new AbortController()
  const soat = setTimeout(() => boshqaruvchi.abort(), SORIQ_MS)
  try {
    const j = await fetch(sozlama.ERP_BASE_URL + yol, {
      signal: boshqaruvchi.signal,
      cache: 'no-store',
      headers: { 'X-MP-Timestamp': vaqt, 'X-MP-Signature': imzo, 'X-MP-Version': String(SHARTNOMA_VERSIYASI) },
    })
    if (!j.ok) return null
    const turi = j.headers.get('content-type') ?? ''
    if (!turi.startsWith('image/')) return null
    return { turi, baytlar: await j.arrayBuffer() }
  } catch {
    return null
  } finally {
    clearTimeout(soat)
  }
}
