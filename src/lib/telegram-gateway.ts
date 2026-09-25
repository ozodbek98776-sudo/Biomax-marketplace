import 'server-only'
import { sozlama } from '@/lib/sozlama'

// Telegram Gateway — kirish kodini TELEFON RAQAMINING O'ZIGA yuborish.
//
// Bot orqali yuborishda mijoz avval botga «Start» bosishi shart (Telegram
// qoidasi: bot o'zi birinchi yoza olmaydi) va ko'pchilik buni tushunmaydi.
// Gateway — Telegram'ning rasmiy xizmati: kod Telegram'ning o'z
// «Verification Codes» xabari bo'lib keladi, hech qanday bot kerak emas.
//
// Narx: bitta kod $0.01; yetkazilmagan kod uchun pul qaytariladi (`ttl`).
// Sharti: raqamda Telegram bo'lishi kerak.
// Hujjat: https://core.telegram.org/gateway/api
//
// Kodning O'ZINI biz yaratamiz va bazada xesh sifatida tekshiramiz
// (`domen/kirish-kodi.ts`) — Gateway faqat yetkazadi. Shunda urinishlar
// hisoblagichi va muddat bitta joyda, kanaldan qat'i nazar bir xil.

const ASOS = 'https://gatewayapi.telegram.org'
const KUTISH_MS = 10_000

export type GatewayNatija =
  | { ok: true; soralgan: string }
  | { ok: false; sabab: string }

/** Gateway sozlanganmi (token bor). */
export function gatewayBormi(): boolean {
  return !!sozlama.TELEGRAM_GATEWAY_TOKEN
}

/**
 * Kodni raqamga yuboradi.
 *
 * `ttl` — shu vaqt ichida yetkazilmasa Telegram pulni qaytaradi; kodning
 * o'z amal qilish muddati bilan bir xil qilib beriladi.
 */
export async function gatewaydanYubor(telefon: string, kod: string, ttlSoniya: number): Promise<GatewayNatija> {
  const token = sozlama.TELEGRAM_GATEWAY_TOKEN
  if (!token) return { ok: false, sabab: 'sozlanmagan' }

  const boshqaruv = new AbortController()
  const soat = setTimeout(() => boshqaruv.abort(), KUTISH_MS)
  try {
    const javob = await fetch(`${ASOS}/sendVerificationMessage`, {
      method: 'POST',
      signal: boshqaruv.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        phone_number: telefon,
        code: kod,
        ttl: Math.min(3600, Math.max(30, Math.round(ttlSoniya))),
      }),
    })
    const j = await javob.json().catch(() => null) as
      | { ok: true; result: { request_id: string } }
      | { ok: false; error?: string }
      | null

    if (j?.ok) return { ok: true, soralgan: j.result.request_id }

    // Sabab jurnalga yoziladi (raqam emas — faqat xato matni)
    const sabab = (j && !j.ok && j.error) || `holat_${javob.status}`
    console.error(`[telegram-gateway] yuborilmadi: ${sabab}`)
    return { ok: false, sabab }
  } catch (e) {
    const sabab = e instanceof Error && e.name === 'AbortError' ? 'vaqt_tugadi' : 'tarmoq'
    console.error(`[telegram-gateway] yuborilmadi: ${sabab}`)
    return { ok: false, sabab }
  } finally {
    clearTimeout(soat)
  }
}
