import 'server-only'
import { ishlabChiqarish, kodKanali } from '@/lib/sozlama'
import { kirishKodiYubor } from '@/lib/erp/mijoz'
import type { DomenXatosi } from '@/lib/natija'

// Kirish kodini mijozga yetkazish.
//
// Asosiy kanal — Telegram: kod ERP orqali do'konning mijozlarga chek va
// eslatma yuboradigan akkauntidan mijozning Telegram profiliga boradi.
// Alohida SMS provayder va shartnoma kerak emas.
//
// `konsol` kanali faqat rivojlanish uchun: kod hech qayerga ketmaydi,
// ekranda ko'rsatiladi. Ishlab chiqarishda bu kanal kodni OSHKOR QILMAYDI.

export type YetkazishNatija =
  | { ok: true; kanal: 'telegram' | 'konsol'; devKod?: string }
  | { ok: false; xato: DomenXatosi }

export async function kodYetkaz(telefon: string, kod: string): Promise<YetkazishNatija> {
  if (kodKanali === 'konsol') {
    if (ishlabChiqarish) {
      return { ok: false, xato: { kod: 'kanal_sozlanmagan', xabar: 'Kod yuborish xizmati sozlanmagan. Do‘kon bilan bog‘laning.' } }
    }
    console.info(`[kod:konsol] ${telefon} → ${kod}`)
    return { ok: true, kanal: 'konsol', devKod: kod }
  }

  const n = await kirishKodiYubor(telefon, kod)
  if (n.ok) return { ok: true, kanal: 'telegram' }
  return { ok: false, xato: n.xato }
}
