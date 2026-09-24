import 'server-only'
import { createHash, randomInt } from 'node:crypto'
import { db } from '@/lib/db'
import { kodKanali } from '@/lib/sozlama'
import { telegramKodYubor } from '@/lib/telegram-bot'
import type { Natija } from '@/lib/natija'

// Kirish kodi — bir martalik parol (OTP).
//
// Xavfsizlik:
// - Kod SHA-256 xeshi sifatida saqlanadi — baza sizib chiqsa kod qolga tushmaydi
// - 5 daqiqa amal qiladi
// - 5 marta notogri kiritilsa kuyadi
// - Telefonga 1 daqiqada 1 martadan kop yuborib bolmaydi (spam oldini olish)

const KOD_UZUNLIGI = 6
const AMAL_MUDDATI_MS = 5 * 60 * 1000 // 5 daqiqa
const MAKS_URINISH = 5
const SPAM_MUDDAT_MS = 60 * 1000 // 1 daqiqa

function kodXesh(kod: string): string {
  return createHash('sha256').update(kod).digest('hex')
}

function tasodifiyKod(): string {
  const eng = 10 ** (KOD_UZUNLIGI - 1)
  // randomInt yuqori chegarani o'z ichiga olmaydi
  return String(randomInt(eng, eng * 10))
}

/**
 * Yangi kirish kodini generatsiya qilib, Telegram orqali yuboradi.
 */
export async function kirishKodiYubor(telefon: string): Promise<Natija<{ kanal: string }>> {
  // Spam oldini olish: 1 daqiqada 1 martadan kop yuborilmasin
  const oxirgiKod = await db.mpKirishKodi.findFirst({
    where: {
      telefon,
      yaratilgan: { gte: new Date(Date.now() - SPAM_MUDDAT_MS) },
    },
    orderBy: { yaratilgan: 'desc' },
  })

  if (oxirgiKod) {
    const qolganVaqt = Math.ceil(
      (oxirgiKod.yaratilgan.getTime() + SPAM_MUDDAT_MS - Date.now()) / 1000,
    )
    return {
      ok: false,
      xato: {
        kod: 'juda_tez',
        xabar: `Kodni ${qolganVaqt} soniyadan keyin qayta yuborishingiz mumkin.`,
      },
    }
  }

  // Telegram ulanmaganini OLDIN aniqlaymiz: aks holda yozuv yaratiladi va
  // mijoz kodni olmagan holda 1 daqiqaga "juda tez" deb bloklanadi.
  let chatId: string | null = null
  if (kodKanali === 'telegram') {
    const hisob = await db.mpHisob.findUnique({
      where: { telefon },
      select: { telegramChatId: true },
    })
    chatId = hisob?.telegramChatId ?? null
    if (!chatId) {
      return {
        ok: false,
        xato: {
          kod: 'telegram_ulangmagan',
          xabar: `Telegram botni ulash kerak:\n\n1. @BioMaxMarketplaceBot ga kiring\n2. /start buyrug'ini yuboring yoki telefon raqamingizni yuboring\n3. Qaytadan urinib ko'ring`,
        },
      }
    }
  }

  const kod = tasodifiyKod()
  const amalQiladi = new Date(Date.now() + AMAL_MUDDATI_MS)

  const yozuv = await db.mpKirishKodi.create({
    data: {
      telefon,
      kodXesh: kodXesh(kod),
      amalQiladi,
    },
  })

  // Telegram orqali yuborish
  if (chatId) {
    const natija = await telegramKodYubor(chatId, kod)
    if (!natija.ok) {
      // Yetkazilmagan kod bazada qolmasin — mijoz darhol qayta urina oladi
      await db.mpKirishKodi.delete({ where: { id: yozuv.id } }).catch(() => {})
      return { ok: false, xato: natija.xato }
    }

    return { ok: true, qiymat: { kanal: 'telegram' } }
  }

  // Konsol (lokal rivojlanish)
  console.info(`[kirish-kodi] ${telefon} → ${kod}`)
  return { ok: true, qiymat: { kanal: 'konsol' } }
}

/**
 * Kirish kodini tekshiradi va tasdiqlaydi.
 */
export async function kirishKodiTasdiq(
  telefon: string,
  kod: string,
  ism?: string,
): Promise<Natija<{ yangi: boolean; hisobId: string; ism: string | null }>> {
  const xesh = kodXesh(kod)
  const hozir = new Date()

  // Amal qilayotgan kodlarni topish
  const kodlar = await db.mpKirishKodi.findMany({
    where: {
      telefon,
      kodXesh: xesh,
      amalQiladi: { gte: hozir },
      ishlatilgan: false,
    },
    orderBy: { yaratilgan: 'desc' },
    take: 1,
  })

  const kodYozuvi = kodlar[0]
  if (!kodYozuvi) {
    // Xesh mos kelmadi — urinish shu raqamning amaldagi kodiga yoziladi,
    // aks holda hisoblagich hech qachon oshmaydi va kodni tanlab olish
    // (brute force) hech nima bilan cheklanmaydi.
    const joriy = await db.mpKirishKodi.findFirst({
      where: { telefon, amalQiladi: { gte: hozir }, ishlatilgan: false },
      orderBy: { yaratilgan: 'desc' },
    })
    if (joriy) {
      const urinishlar = joriy.urinishlar + 1
      await db.mpKirishKodi.update({
        where: { id: joriy.id },
        data: { urinishlar, ishlatilgan: urinishlar >= MAKS_URINISH },
      })
      if (urinishlar >= MAKS_URINISH) {
        return {
          ok: false,
          xato: { kod: 'juda_kop_urinish', xabar: 'Juda kop notogri urinish. Yangi kod soring.' },
        }
      }
    }
    return {
      ok: false,
      xato: {
        kod: 'notogri_kod',
        xabar: 'Kod notogri yoki muddati otgan.',
      },
    }
  }

  // Urinishlar sonini tekshirish
  if (kodYozuvi.urinishlar >= MAKS_URINISH) {
    await db.mpKirishKodi.update({
      where: { id: kodYozuvi.id },
      data: { ishlatilgan: true },
    })

    return {
      ok: false,
      xato: {
        kod: 'juda_kop_urinish',
        xabar: 'Juda kop notogri urinish. Yangi kod soring.',
      },
    }
  }

  // Kodni ishlatilgan deb belgilash
  await db.mpKirishKodi.update({
    where: { id: kodYozuvi.id },
    data: { ishlatilgan: true },
  })

  // Hisob topish yoki yaratish
  let hisob = await db.mpHisob.findUnique({
    where: { telefon },
  })

  const yangi = !hisob

  const toza = ism?.trim().replace(/\s+/g, ' ').slice(0, 60) || null

  if (!hisob) {
    hisob = await db.mpHisob.create({
      data: {
        telefon,
        ism: toza,
        tasdiqlangan: true,
      },
    })
  } else if (!hisob.tasdiqlangan || (toza && !hisob.ism)) {
    // Ism faqat bo'sh bo'lsa yoziladi — mijoz keyin kabinetdan o'zgartiradi
    hisob = await db.mpHisob.update({
      where: { id: hisob.id },
      data: { tasdiqlangan: true, ...(toza && !hisob.ism ? { ism: toza } : {}) },
    })
  }

  return { ok: true, qiymat: { yangi, hisobId: hisob.id, ism: hisob.ism } }
}

/**
 * Muddati otgan kodlarni tozalash.
 * Cron job orqali kuniga bir marta chaqirilishi kerak.
 */
export async function tozalaKirishKodlari(): Promise<number> {
  const natija = await db.mpKirishKodi.deleteMany({
    where: {
      OR: [
        { amalQiladi: { lt: new Date() } },
        { yaratilgan: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      ],
    },
  })

  return natija.count
}
