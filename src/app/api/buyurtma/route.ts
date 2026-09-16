import type { NextRequest } from 'next/server'
import { joriyHisob } from '@/lib/hisob'
import { buyurtmaYarat } from '@/lib/domen/buyurtma-server'
import { javob, jsonOqi, ozSaytdanmi, xatoJavob } from '@/lib/api'

export const dynamic = 'force-dynamic'

/** Buyurtma berish — savatdagi hamma mahsulot bitta buyurtmaga. */
export async function POST(req: NextRequest) {
  if (!ozSaytdanmi(req)) return javob({ kod: 'taqiqlangan', xato: 'Ruxsat yo‘q' }, 403)
  const h = await joriyHisob()
  if (!h) return xatoJavob({ kod: 'kirish_kerak', xabar: 'Buyurtma berish uchun hisobingizga kiring' })

  const tana = await jsonOqi(req)
  if (!tana) return xatoJavob({ kod: 'notogri_sorov', xabar: 'So‘rov noto‘g‘ri' })

  const n = await buyurtmaYarat({ id: h.id, ism: h.ism }, tana)
  return n.ok ? javob(n.qiymat, 201) : xatoJavob(n.xato)
}
