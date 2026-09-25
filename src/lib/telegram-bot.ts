import 'server-only'
import { Bot } from 'grammy'
import { sozlama, kodKanali } from '@/lib/sozlama'
import type { DomenXatosi } from '@/lib/natija'

// Telegram bot orqali kirish kodi yuborish.
//
// Bot token .env da: TELEGRAM_BOT_TOKEN
// Foydalanuvchi telefon raqamini beradi → bot unga kodni yuboradi

let bot: Bot | null = null

function getBot(): Bot {
  if (!bot) {
    if (!sozlama.TELEGRAM_BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN sozlanmagan')
    }
    bot = new Bot(sozlama.TELEGRAM_BOT_TOKEN)
  }
  return bot
}

let botNomiKesh: string | null = null

/**
 * Botning @username'i — saytdagi «Telegram'da ochish» havolasi uchun
 * (`https://t.me/<nom>?start=kirish`). Telegram'dan bir marta so'raladi va
 * eslab qolinadi; token yo'q yoki Telegram javob bermasa `null`.
 */
export async function botNomi(): Promise<string | null> {
  if (botNomiKesh) return botNomiKesh
  if (!sozlama.TELEGRAM_BOT_TOKEN) return null
  try {
    const men = await Promise.race([
      getBot().api.getMe(),
      new Promise<never>((_, rad) => setTimeout(() => rad(new Error('vaqt tugadi')), 2500)),
    ])
    botNomiKesh = men.username ?? null
    return botNomiKesh
  } catch (e) {
    console.error('[telegram-bot] nomini olib bo‘lmadi:', e instanceof Error ? e.message : e)
    return null
  }
}

export type KodYuborishNatija =
  | { ok: true; kanal: 'telegram' | 'konsol'; devKod?: string }
  | { ok: false; xato: DomenXatosi }

/**
 * Telegram orqali kod yuborish.
 * 
 * MUHIM: Bu funksiya telefon raqami bo'yicha chat_id topa olmaydi.
 * Foydalanuvchi avval botga /start yozishi kerak.
 * 
 * YECHIM: Chat ID ni baza da saqlaymiz (foydalanuvchi /start bosganda).
 */
export async function telegramKodYubor(
  chatId: number | string,
  kod: string,
): Promise<KodYuborishNatija> {
  // Rivojlanishda konsol (ishlab chiqarishda `kodKanali` har doim telegram)
  if (kodKanali === 'konsol') {
    console.info(`[telegram-kod] chat=${chatId} → ${kod}`)
    return { ok: true, kanal: 'konsol', devKod: kod }
  }

  try {
    const bot = getBot()
    const xabar = `🔐 Bu sizning kodingiz: <code>${kod}</code>\n\n` +
      `Uni saytga kiriting va ro‘yxatdan o‘ting (hisobingiz bo‘lsa — shu kod bilan kirasiz).\n\n` +
      `⏱ Kod 5 daqiqa amal qiladi.\n` +
      `⚠️ Kodni hech kimga bermang — do‘kon xodimlari ham uni so‘ramaydi.`

    await bot.api.sendMessage(chatId, xabar, { parse_mode: 'HTML' })
    return { ok: true, kanal: 'telegram' }
  } catch (error) {
    console.error('[telegram-kod] xato:', error)
    return {
      ok: false,
      xato: {
        kod: 'telegram_xato',
        xabar: 'Telegram orqali kod yuborib bolmadi. Telefon raqamingizda Telegram ochiq ekanligini tekshiring.',
      },
    }
  }
}
