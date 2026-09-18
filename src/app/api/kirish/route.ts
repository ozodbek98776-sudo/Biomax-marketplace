import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { kirishKodiYoqilgan } from '@/lib/sozlama'
import { seansOch } from '@/lib/hisob'
import { telefonniTozala } from '@/lib/domen/telefon'
import { XATOLAR } from '@/lib/natija'
import { ipChegarasi, javob, jsonOqi, ozSaytdanmi, xatoJavob } from '@/lib/api'

export const dynamic = 'force-dynamic'

/**
 * Kodsiz kirish — telefon raqami (va ro'yxatda ism) bilan darhol.
 *
 * VAQTINCHALIK YO'L. Do'kon egasi 2026-09-18 da tasdiqlash kodini hozircha
 * o'chirishga qaror qildi (Telegram orqali yetkazish sozlanguncha). Kod
 * tizimi o'chirilmagan: `KIRISH_KODI=yoqilgan` qo'yilsa bu marshrut yopiladi
 * va sayt yana `/api/kirish/kod` → `/api/kirish/tasdiq` ga qaytadi.
 *
 * Xavfi ochiq aytilgan: raqamni bilgan odam o'sha hisobga kira oladi. Shu
 * sababli IP bo'yicha chegara saqlangan — ko'p raqamni ketma-ket sinab
 * ko'rish sekinlashadi.
 */
export async function POST(req: NextRequest) {
  if (!ozSaytdanmi(req)) return javob({ kod: 'taqiqlangan', xato: 'Ruxsat yo‘q' }, 403)

  // Kod yoqilgan bo'lsa bu yo'l tekshiruvni chetlab o'tish uchun ishlatilmasin
  if (kirishKodiYoqilgan) {
    return xatoJavob({ kod: 'kod_kerak', xabar: 'Kirish uchun tasdiqlash kodi kerak — sahifani yangilang' })
  }

  const kutish = ipChegarasi(req, 'kirish', 10, 10 * 60_000)
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

  const mavjud = await db.mpHisob.findUnique({ where: { telefon }, select: { id: true, ism: true, faol: true, tasdiqlangan: true } })

  if (mavjud && !mavjud.faol) {
    return xatoJavob({ kod: 'hisob_bloklangan', xabar: 'Hisob bloklangan. Do‘kon bilan bog‘laning.' })
  }
  if (rejim === 'kirish' && !mavjud?.tasdiqlangan) {
    return xatoJavob({ kod: 'hisob_yoq', xabar: 'Bu raqam bilan hisob ochilmagan — ro‘yxatdan o‘ting' })
  }
  if (!mavjud && (ism.length < 2 || ism.length > 60)) {
    return xatoJavob({ kod: 'ism_notogri', xabar: 'Ismingizni kiriting (2–60 belgi)' })
  }

  let hisob: { id: string; ism: string | null; telefon: string }
  let yangi = false
  try {
    if (mavjud) {
      hisob = await db.mpHisob.update({
        where: { id: mavjud.id },
        // Bor ismni kirish paytida almashtirmaymiz; bo'sh bo'lsa to'ldiriladi
        data: { tasdiqlangan: true, ...(!mavjud.ism && ism.length >= 2 ? { ism: ism.slice(0, 60) } : {}) },
        select: { id: true, ism: true, telefon: true },
      })
    } else {
      hisob = await db.mpHisob.create({
        data: { telefon, ism: ism.slice(0, 60), tasdiqlangan: true },
        select: { id: true, ism: true, telefon: true },
      })
      yangi = true
    }
  } catch (e) {
    // Bir vaqtda ikki marta bosilsa ikkinchisi takror raqamga uriladi — o'sha hisobga kiramiz
    if ((e as { code?: string })?.code !== 'P2002') throw e
    const bor = await db.mpHisob.findUnique({ where: { telefon }, select: { id: true, ism: true, telefon: true, faol: true } })
    if (!bor?.faol) return xatoJavob({ kod: 'hisob_bloklangan', xabar: 'Hisob bloklangan. Do‘kon bilan bog‘laning.' })
    hisob = { id: bor.id, ism: bor.ism, telefon: bor.telefon }
  }

  await seansOch(hisob.id)
  return javob({ ok: true, yangi, hisob: { ism: hisob.ism, telefon: hisob.telefon } })
}
