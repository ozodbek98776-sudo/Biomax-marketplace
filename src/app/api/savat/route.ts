import type { NextRequest } from 'next/server'
import { joriyHisob } from '@/lib/hisob'
import { miqdorQoy, savatgaQosh, savatniOl } from '@/lib/domen/savat'
import { javob, jsonOqi, ozSaytdanmi, xatoJavob } from '@/lib/api'

export const dynamic = 'force-dynamic'

// Savat API. Mehmon uchun YOPIQ — 401 va `kirish_kerak` kodi qaytadi,
// mijoz tomoni shu kodga qarab ro'yxatdan o'tish oynasini ochadi.

const kirishKerak = () =>
  xatoJavob({ kod: 'kirish_kerak', xabar: 'Buyurtma berish uchun ro‘yxatdan o‘ting' })

export async function GET() {
  const h = await joriyHisob()
  if (!h) return kirishKerak()
  const n = await savatniOl(h.id)
  return n.ok ? javob(n.qiymat) : xatoJavob(n.xato)
}

/** Qo'shish: `{ slug, miqdor? }` */
export async function POST(req: NextRequest) {
  if (!ozSaytdanmi(req)) return javob({ kod: 'taqiqlangan', xato: 'Ruxsat yo‘q' }, 403)
  const h = await joriyHisob()
  if (!h) return kirishKerak()
  const t = await jsonOqi(req)
  if (typeof t?.slug !== 'string') return xatoJavob({ kod: 'notogri_sorov', xabar: 'Mahsulot ko‘rsatilmagan' })
  const n = await savatgaQosh(h.id, t.slug, t.miqdor === undefined ? 1 : Number(t.miqdor))
  return n.ok ? javob(n.qiymat, 201) : xatoJavob(n.xato)
}

/** Miqdorni o'zgartirish: `{ elonId, miqdor }` (0 — o'chirish) */
export async function PATCH(req: NextRequest) {
  if (!ozSaytdanmi(req)) return javob({ kod: 'taqiqlangan', xato: 'Ruxsat yo‘q' }, 403)
  const h = await joriyHisob()
  if (!h) return kirishKerak()
  const t = await jsonOqi(req)
  if (typeof t?.elonId !== 'string') return xatoJavob({ kod: 'notogri_sorov', xabar: 'So‘rov noto‘g‘ri' })
  const n = await miqdorQoy(h.id, t.elonId, Number(t.miqdor))
  return n.ok ? javob(n.qiymat) : xatoJavob(n.xato)
}
