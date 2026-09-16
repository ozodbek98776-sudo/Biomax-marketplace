import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { sozlama } from '@/lib/sozlama'
import { seansOch } from '@/lib/hisob'
import { telefonniTozala } from '@/lib/domen/telefon'
import { KOD_MAKS_URINISH, kodTogrimi } from '@/lib/domen/kirish-kodi'
import { XATOLAR } from '@/lib/natija'
import { ipChegarasi, javob, jsonOqi, ozSaytdanmi, xatoJavob } from '@/lib/api'

export const dynamic = 'force-dynamic'

/**
 * 2-qadam: kodni tekshirish, hisobni ochish yoki topish, seans berish.
 *
 * Hisob FAQAT shu yerda yaratiladi — kod tasdiqlangandan keyin. 1-qadamda
 * yaratilsa, begona raqamlar bilan bazani "yarim hisoblar" bilan to'ldirish
 * mumkin bo'lardi.
 */
export async function POST(req: NextRequest) {
  if (!ozSaytdanmi(req)) return javob({ kod: 'taqiqlangan', xato: 'Ruxsat yo‘q' }, 403)

  const kutish = ipChegarasi(req, 'tasdiq', 30, 10 * 60_000)
  if (kutish) {
    const n = XATOLAR.tezlikChegarasi(kutish)
    if (!n.ok) return xatoJavob(n.xato)
  }

  const tana = await jsonOqi(req)
  const telefon = telefonniTozala(tana?.telefon)
  const kod = typeof tana?.kod === 'string' ? tana.kod.replace(/\D/g, '') : ''
  if (!telefon || kod.length !== 6) {
    return xatoJavob({ kod: 'notogri_sorov', xabar: '6 xonali kodni kiriting' })
  }

  const yozuv = await db.mpKirishKodi.findFirst({
    where: { telefon, ishlatilgan: false, amalQiladi: { gt: new Date() } },
    orderBy: { yaratilgan: 'desc' },
  })
  if (!yozuv) {
    return xatoJavob({ kod: 'kod_eskirgan', xabar: 'Kod muddati o‘tgan — yangi kod so‘rang' })
  }
  if (yozuv.urinishlar >= KOD_MAKS_URINISH) {
    const n = XATOLAR.kodKopUrinish()
    if (!n.ok) return xatoJavob(n.xato)
  }

  if (!kodTogrimi(kod, telefon, sozlama.SESSION_SECRET, yozuv.kodXesh)) {
    // Urinish atomik oshiriladi — parallel so'rovlar bilan chegarani
    // chetlab o'tib bo'lmasin.
    const yangilangan = await db.mpKirishKodi.update({
      where: { id: yozuv.id },
      data: {
        urinishlar: { increment: 1 },
        // Chegaraga yetsa kod shu zahoti kuydiriladi
        ...(yozuv.urinishlar + 1 >= KOD_MAKS_URINISH ? { ishlatilgan: true } : {}),
      },
      select: { urinishlar: true },
    })
    const qoldi = Math.max(0, KOD_MAKS_URINISH - yangilangan.urinishlar)
    return xatoJavob({
      kod: qoldi === 0 ? 'kod_kop_urinish' : 'kod_notogri',
      xabar: qoldi === 0 ? 'Juda ko‘p noto‘g‘ri urinish — yangi kod so‘rang' : `Kod noto‘g‘ri. Yana ${qoldi} ta urinish qoldi.`,
      tafsilot: { qoldi },
    })
  }

  // Kod bir marta ishlatiladi. `updateMany` sharti bilan — ikki parallel
  // to'g'ri so'rovdan faqat bittasi o'tadi.
  const kuydirildi = await db.mpKirishKodi.updateMany({
    where: { id: yozuv.id, ishlatilgan: false },
    data: { ishlatilgan: true },
  })
  if (kuydirildi.count === 0) {
    return xatoJavob({ kod: 'kod_eskirgan', xabar: 'Kod allaqachon ishlatilgan — yangi kod so‘rang' })
  }

  const ism = typeof tana?.ism === 'string' ? tana.ism.trim().replace(/\s+/g, ' ').slice(0, 60) : ''
  const mavjud = await db.mpHisob.findUnique({ where: { telefon } })

  if (mavjud && !mavjud.faol) {
    return xatoJavob({ kod: 'hisob_bloklangan', xabar: 'Hisob bloklangan. Do‘kon bilan bog‘laning.' })
  }
  if (!mavjud && ism.length < 2) {
    return xatoJavob({ kod: 'ism_notogri', xabar: 'Ismingizni kiriting' })
  }

  const hisob = mavjud
    ? await db.mpHisob.update({
        where: { id: mavjud.id },
        // Ism bo'sh bo'lsa to'ldiriladi; bor ismni kirish paytida almashtirmaymiz
        data: { tasdiqlangan: true, ...(!mavjud.ism && ism.length >= 2 ? { ism } : {}) },
      })
    : await db.mpHisob.create({ data: { telefon, ism, tasdiqlangan: true } })

  await seansOch(hisob.id)

  return javob({ ok: true, yangi: !mavjud, hisob: { ism: hisob.ism, telefon: hisob.telefon } })
}
