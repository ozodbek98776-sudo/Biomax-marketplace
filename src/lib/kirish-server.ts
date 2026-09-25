import 'server-only'
import { db } from '@/lib/db'
import { seansOch } from '@/lib/hisob'
import type { Natija } from '@/lib/natija'
import { muvaffaq, xato } from '@/lib/natija'

// Kodsiz kirish — telefon raqami bilan hisobni topish yoki ochish va seans.
//
// `/api/kirish` da ishlatiladi — kirish kodi o'chirilganda (KIRISH_KODI=ochirilgan).
//
// Tekshiruvlar (rejim, ism, bloklangan hisob) chaqiruvchida bajarilgan
// bo'lishi kerak; bu yerda faqat yozish va seans.

export interface KirishNatija {
  yangi: boolean
  hisob: { ism: string | null; telefon: string }
}

export async function kodsizKir(telefon: string, ism: string): Promise<Natija<KirishNatija>> {
  const mavjud = await db.mpHisob.findUnique({ where: { telefon }, select: { id: true, ism: true, faol: true } })
  if (mavjud && !mavjud.faol) return xato('hisob_bloklangan', 'Hisob bloklangan. Do‘kon bilan bog‘laning.')

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
      if (ism.length < 2) return xato('ism_notogri', 'Ismingizni kiriting (2–60 belgi)')
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
    if (!bor?.faol) return xato('hisob_bloklangan', 'Hisob bloklangan. Do‘kon bilan bog‘laning.')
    hisob = { id: bor.id, ism: bor.ism, telefon: bor.telefon }
  }

  await seansOch(hisob.id)
  return muvaffaq({ yangi, hisob: { ism: hisob.ism, telefon: hisob.telefon } })
}
