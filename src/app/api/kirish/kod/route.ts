import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { kirishKodiYoqilgan, sozlama } from '@/lib/sozlama'
import { kodYetkaz } from '@/lib/kod-yetkazish'
import { telefonniTozala } from '@/lib/domen/telefon'
import { KOD_AMAL_MS, kodXeshi, kodYarat, yuborishMumkinmi } from '@/lib/domen/kirish-kodi'
import { XATOLAR } from '@/lib/natija'
import { ipChegarasi, javob, jsonOqi, ozSaytdanmi, xatoJavob } from '@/lib/api'

export const dynamic = 'force-dynamic'
// Telegram orqali yetkazish 10 soniyagacha cho'zilishi mumkin
export const maxDuration = 30

/**
 * 1-qadam: telefonga kod yuborish.
 *
 * `rejim`:
 *   · `royxat` — yangi hisob; ism majburiy. Raqam allaqachon ro'yxatda
 *     bo'lsa ham xato bermaymiz — kod yuboriladi va mijoz kiradi.
 *     "Bu raqam band" deb aytish begonaga kimning hisobi borligini
 *     oshkor qilardi.
 *   · `kirish` — mavjud hisob. Raqam topilmasa aniq aytamiz va
 *     ro'yxatdan o'tishni taklif qilamiz: do'kon mijozi uchun bu qulaylik
 *     maxfiylikdan muhimroq, raqamlar esa sir emas.
 */
export async function POST(req: NextRequest) {
  if (!ozSaytdanmi(req)) return javob({ kod: 'taqiqlangan', xato: 'Ruxsat yo‘q' }, 403)
  // Kod o'chirilgan (KIRISH_KODI) — Telegram'ga hech narsa yuborilmaydi
  if (!kirishKodiYoqilgan) {
    return xatoJavob({ kod: 'kod_ochirilgan', xabar: 'Kirish kodi hozir talab qilinmaydi — sahifani yangilang' })
  }

  const kutish = ipChegarasi(req, 'kod', 10, 10 * 60_000)
  if (kutish) {
    const n = XATOLAR.tezlikChegarasi(kutish)
    if (!n.ok) return xatoJavob(n.xato)
  }

  const tana = await jsonOqi(req)
  if (!tana) return xatoJavob({ kod: 'notogri_sorov', xabar: 'So‘rov noto‘g‘ri' })

  const telefon = telefonniTozala(tana.telefon)
  if (!telefon) return xatoJavob({ kod: 'telefon_notogri', xabar: 'Telefon raqamini to‘liq kiriting: +998 90 123 45 67' })

  const rejim = tana.rejim === 'kirish' ? 'kirish' : 'royxat'
  const ism = typeof tana.ism === 'string' ? tana.ism.trim().replace(/\s+/g, ' ') : ''

  const mavjud = await db.mpHisob.findUnique({ where: { telefon }, select: { tasdiqlangan: true, faol: true } })

  if (rejim === 'royxat' && !mavjud && (ism.length < 2 || ism.length > 60)) {
    return xatoJavob({ kod: 'ism_notogri', xabar: 'Ismingizni kiriting (2–60 belgi)' })
  }
  if (rejim === 'kirish' && !mavjud?.tasdiqlangan) {
    return xatoJavob({ kod: 'hisob_yoq', xabar: 'Bu raqam bilan hisob ochilmagan — ro‘yxatdan o‘ting' })
  }
  if (mavjud && !mavjud.faol) {
    return xatoJavob({ kod: 'hisob_bloklangan', xabar: 'Hisob bloklangan. Do‘kon bilan bog‘laning.' })
  }

  const soatOldin = new Date(Date.now() - 3_600_000)
  const oxirgilar = await db.mpKirishKodi.findMany({
    where: { telefon, yaratilgan: { gte: soatOldin } },
    select: { yaratilgan: true, amalQiladi: true, ishlatilgan: true, urinishlar: true },
  })
  const hukm = yuborishMumkinmi(oxirgilar)
  if (!hukm.ruxsat) {
    return xatoJavob({
      kod: 'tezlik_chegarasi',
      xabar: hukm.sabab === 'kutish'
        ? `Yangi kodni ${hukm.soniya} soniyadan keyin so‘rashingiz mumkin`
        : 'Bu raqamga juda ko‘p kod yuborildi. Birozdan keyin urinib ko‘ring.',
      // `sabab` — mijoz ilovasi faqat `kutish`da "o'sha kodni kiriting" deydi
      tafsilot: { soniya: hukm.soniya, sabab: hukm.sabab },
    })
  }

  const kod = kodYarat()
  // Eski kodlar kuydiriladi: bir vaqtda faqat bitta kod amal qilsin.
  // Yozuv yuborishdan OLDIN yaratiladi — parallel ikkinchi so'rov 60 soniyalik
  // chegaraga urilsin va mijozga ikki xil kod ketmasin.
  const [, yozuv] = await db.$transaction([
    db.mpKirishKodi.updateMany({ where: { telefon, ishlatilgan: false }, data: { ishlatilgan: true } }),
    db.mpKirishKodi.create({
      data: {
        telefon,
        kodXesh: kodXeshi(kod, telefon, sozlama.SESSION_SECRET),
        amalQiladi: new Date(Date.now() + KOD_AMAL_MS),
      },
      select: { id: true },
    }),
  ])

  const yetkazish = await kodYetkaz(telefon, kod)
  if (!yetkazish.ok) {
    // Yetib bormagan kod hisobga olinmaydi: aks holda mijoz 60 soniya kutishga
    // va soatlik chegaraga hech narsa olmay urilib qolardi.
    await db.mpKirishKodi.delete({ where: { id: yozuv.id } }).catch(() => {})
    return xatoJavob(yetkazish.xato)
  }

  return javob({
    ok: true,
    telefon,
    kanal: yetkazish.kanal,
    amalQiladiSoniya: KOD_AMAL_MS / 1000,
    // Faqat rivojlanishdagi `konsol` kanalida (`lib/kod-yetkazish.ts`)
    ...(yetkazish.devKod ? { devKod: yetkazish.devKod } : {}),
  })
}
