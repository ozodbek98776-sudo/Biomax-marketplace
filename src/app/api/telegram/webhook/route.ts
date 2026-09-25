import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { Bot, webhookCallback } from 'grammy'
import { kirishKodiYoqilgan, sozlama } from '@/lib/sozlama'
import { db } from '@/lib/db'
import { telefonniTozala } from '@/lib/domen/telefon'
import { kirishKodiYubor } from '@/lib/domen/kirish-kodi'

// Telegram bot webhook'i: mijoz botga raqamini ulashadi, chat ID bazaga
// yoziladi va kirish kodlari shu chatga boradi (`lib/domen/kirish-kodi.ts`).

export const dynamic = 'force-dynamic'

/**
 * Webhook maxfiy kaliti.
 *
 * Telegram har so'rovga `X-Telegram-Bot-Api-Secret-Token` sarlavhasini
 * qo'shadi va grammy uni tekshiradi. Bu SHART: kalitsiz webhook'ga istalgan
 * odam soxta "contact" xabarini yuborib, O'ZINING chat ID'sini BEGONA telefon
 * raqamiga bog'lab qo'yishi va o'sha raqamning kirish kodini olishi mumkin edi.
 *
 * Kalit bot tokenidan hosil qilinadi — alohida muhit o'zgaruvchisi kerak emas,
 * tokenni bilmagan odam kalitni ham topa olmaydi.
 */
function webhookKaliti(token: string): string {
  return createHash('sha256').update(`webhook:${token}`).digest('hex').slice(0, 48)
}

const token = sozlama.TELEGRAM_BOT_TOKEN
const bot = token ? new Bot(token) : null
const KALIT = token ? webhookKaliti(token) : ''

if (bot) {
  // /start. Sayt «Kod olish» bosilganda botni `?start=kirish` bilan yangi
  // oynada ochadi. Telegram START tugmasini o'zi ko'rsatadi — uni faqat
  // odamning o'zi bosa oladi (bot o'zini "start" qila olmaydi).
  bot.command('start', async (ctx) => {
    const chatId = ctx.chat.id.toString()

    // Kirish kodi o'chirilgan — botdan hech narsa talab qilinmaydi
    if (!kirishKodiYoqilgan) {
      await ctx.reply(
        '👋 Assalomu alaykum! BioMax botiga xush kelibsiz.\n\n' +
        `Saytga kirish uchun kod kerak emas — ismingiz va telefon raqamingiz bilan ro‘yxatdan o‘ting: ${sozlama.SAYT_URL}`,
      )
      return
    }

    // Raqam avval tasdiqlangan — kod DARHOL, boshqa hech narsa so'ralmaydi
    const ulangan = await db.mpHisob.findFirst({
      where: { telegramChatId: chatId },
      select: { telefon: true },
    })
    if (ulangan) {
      const n = await kirishKodiYubor(ulangan.telefon, { faqatBot: true })
      if (!n.ok && n.xato.kod === 'juda_tez') {
        await ctx.reply('🔐 Kodingiz yuqorida — o‘shani saytga kiriting.')
      } else if (!n.ok) {
        console.error('[telegram-webhook] /start: kod yuborilmadi:', n.xato.kod)
        await ctx.reply('❌ Kodni yuborib bo‘lmadi. Bir daqiqadan so‘ng saytda «Kodni qayta yuborish» ni bosing.')
      }
      return
    }

    // Birinchi marta: raqam egasi ekanini bitta bosish bilan tasdiqlash.
    // Bu SHART — aks holda begona odam saytga boshqaning raqamini yozib,
    // kodni o'z Telegram'iga olib, o'sha hisobga kira olardi.
    await ctx.reply(
      ctx.match === 'kirish'
        ? '👋 Assalomu alaykum!\n\nKodingizni olish uchun pastdagi «📱 Raqamni tasdiqlash» tugmasini bosing.'
        : '👋 Assalomu alaykum! BioMax botiga xush kelibsiz.\n\n' +
          'Pastdagi «📱 Raqamni tasdiqlash» tugmasini bosing — saytdagi kirish kodlari shu yerga keladi.',
      {
        reply_markup: {
          keyboard: [
            [{ text: '📱 Raqamni tasdiqlash', request_contact: true }],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      },
    )
  })

  // Contact yuborilganda
  bot.on('message:contact', async (ctx) => {
    const contact = ctx.message.contact
    if (!contact) return

    // FAQAT o'z raqami. Telegram'da kitobchadagi boshqa odamning kontaktini
    // ham yuborish mumkin — u holda begona chat ID shu raqamga bog'lanib,
    // kirish kodi o'sha odamga ketardi.
    if (!contact.user_id || contact.user_id !== ctx.from?.id) {
      await ctx.reply(
        '⚠️ Faqat O‘Z raqamingizni yuboring — pastdagi «📱 Raqamni tasdiqlash» tugmasi orqali.',
      )
      return
    }

    const chatId = ctx.chat.id.toString()
    const telefon = telefonniTozala(contact.phone_number)
    if (!telefon) {
      await ctx.reply('⚠️ Raqamni o‘qib bo‘lmadi. Raqamingiz +998 bilan boshlanishi kerak.')
      return
    }

    try {
      await db.mpHisob.upsert({
        where: { telefon },
        create: {
          telefon,
          telegramChatId: chatId,
          ism: contact.first_name || ctx.from?.first_name || undefined,
        },
        update: {
          telegramChatId: chatId,
        },
      })

      await ctx.reply(
        `✅ Raqamingiz tasdiqlandi: ${telefon}`,
        {
          reply_markup: { remove_keyboard: true },
        },
      )

      // Mijoz odatda saytdan kelgan: kodni qayta so'ratmasdan shu zahoti
      // yuboramiz. Bot orqali — bepul va aynan shu chatga. Yaqinda kod
      // yuborilgan bo'lsa (1 daqiqa) yangisi yuborilmaydi — eskisi amal qiladi.
      if (!kirishKodiYoqilgan) return
      const kod = await kirishKodiYubor(telefon, { faqatBot: true })
      if (!kod.ok && kod.xato.kod !== 'juda_tez') {
        console.error('[telegram-webhook] kod yuborilmadi:', kod.xato.kod)
      }
    } catch (error) {
      console.error('[telegram-webhook] contact xato:', error)
      await ctx.reply('❌ Xatolik yuz berdi. Iltimos, qaytadan urinib ko\'ring.')
    }
  })

  // Boshqa xabarlar
  bot.on('message', async (ctx) => {
    await ctx.reply(
      '💡 Botdan foydalanish uchun /start buyrug\'ini yuboring yoki telefon raqamingizni yuboring.',
    )
  })
}

export async function POST(req: NextRequest) {
  if (!bot) {
    return NextResponse.json({ error: 'Bot not configured' }, { status: 500 })
  }

  try {
    // grammy sarlavhadagi kalitni o'zi tekshiradi — mos kelmasa 401
    const callback = webhookCallback(bot, 'std/http', { secretToken: KALIT })
    return await callback(req)
  } catch (error) {
    console.error('[telegram-webhook] xato:', error)
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 })
  }
}

/**
 * Webhook'ni Telegram'da ro'yxatdan o'tkazish (bir marta, qo'lda).
 *
 * `GET /api/telegram/webhook?kalit=<webhookKaliti>` — kalitsiz javob
 * bermaydi: bu yerda bot sozlamasi o'zgaradi va webhook holati ko'rinadi.
 * Kalitni jurnaldan olish mumkin (server ishga tushganda yozilmaydi) —
 * uni hisoblash uchun bot tokeni kerak, u esa faqat egada.
 */
export async function GET(req: NextRequest) {
  if (!bot) {
    return NextResponse.json({ error: 'Bot not configured' }, { status: 500 })
  }
  if (req.nextUrl.searchParams.get('kalit') !== KALIT) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const webhookUrl = `${sozlama.SAYT_URL}/api/telegram/webhook`
    await bot.api.setWebhook(webhookUrl, { secret_token: KALIT })

    const info = await bot.api.getWebhookInfo()
    return NextResponse.json({
      success: true,
      webhook: webhookUrl,
      info,
    })
  } catch (error) {
    console.error('[telegram-webhook] setup xato:', error)
    return NextResponse.json({ error: 'Failed to set webhook' }, { status: 500 })
  }
}
