import { NextRequest, NextResponse } from 'next/server'
import { Bot, webhookCallback } from 'grammy'
import { sozlama } from '@/lib/sozlama'
import { db } from '@/lib/db'

// Telegram webhook endpoint
// Bot bu yerga xabarlarni yuboradi

const bot = sozlama.TELEGRAM_BOT_TOKEN ? new Bot(sozlama.TELEGRAM_BOT_TOKEN) : null

if (bot) {
  // /start buyrug'i
  bot.command('start', async (ctx) => {
    const chatId = ctx.chat.id.toString()

    // Telefon raqami yo'q - contact so'raymiz
    await ctx.reply(
      '👋 Assalomu alaykum! BioMax Marketplace botiga xush kelibsiz.\n\n' +
      '📱 Telefon raqamingizni yuboring (pastdagi tugmani bosing).\n' +
      'Shunda saytda kirish kodlari shu yerga keladi.',
      {
        reply_markup: {
          keyboard: [
            [{ text: '📱 Telefon raqamni yuborish', request_contact: true }],
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

    const chatId = ctx.chat.id.toString()
    const telefon = contact.phone_number.startsWith('+') 
      ? contact.phone_number 
      : `+${contact.phone_number}`

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
        '✅ Ajoyib! Telefon raqamingiz saqlandi.\n\n' +
        `📱 ${telefon}\n\n` +
        'Endi BioMax Marketplace saytida kirish kodlari shu botga keladi.',
        {
          reply_markup: { remove_keyboard: true },
        },
      )
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
    const callback = webhookCallback(bot, 'std/http')
    return await callback(req)
  } catch (error) {
    console.error('[telegram-webhook] xato:', error)
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 })
  }
}

// GET so'rovi - webhook o'rnatish
export async function GET() {
  if (!bot) {
    return NextResponse.json({ error: 'Bot not configured' }, { status: 500 })
  }

  try {
    const webhookUrl = `${sozlama.SAYT_URL}/api/telegram/webhook`
    await bot.api.setWebhook(webhookUrl)
    
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
