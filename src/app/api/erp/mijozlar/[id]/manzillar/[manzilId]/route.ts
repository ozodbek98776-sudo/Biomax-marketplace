import type { NextRequest } from 'next/server'
import { erpSorovi } from '@/lib/erp/kiruvchi'
import { db } from '@/lib/db'
import { nuqtaniOqi } from '@/lib/domen/nuqta'
import { javob, xatoJavob } from '@/lib/api'

export const dynamic = 'force-dynamic'

// ERP SHARTNOMASI — xaridorning saqlangan manziliga aniq nuqta qo'yish.
// Keyingi buyurtmada shu manzil tanlansa, nuqta buyurtmaga o'zi o'tadi.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; manzilId: string }> }) {
  const t = await erpSorovi(req)
  if (!t.ok) return t.javob
  let tana: unknown
  try { tana = JSON.parse(t.tana) } catch { return xatoJavob({ kod: 'notogri', xabar: "So'rov noto'g'ri" }) }
  const n = nuqtaniOqi(tana)
  if ('xato' in n) return xatoJavob({ kod: 'notogri', xabar: n.xato })

  const { id, manzilId } = await params
  const r = await db.mpManzil.updateMany({ where: { id: manzilId, hisobId: id }, data: { lat: n.lat, lng: n.lng } })
  if (r.count === 0) return xatoJavob({ kod: 'topilmadi', xabar: 'Manzil topilmadi' })
  return javob(n)
}
