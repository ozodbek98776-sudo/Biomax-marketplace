import type { NextRequest } from 'next/server'
import { erpSorovi } from '@/lib/erp/kiruvchi'
import { db } from '@/lib/db'
import { nuqtaniOqi } from '@/lib/domen/nuqta'
import { javob, xatoJavob } from '@/lib/api'

export const dynamic = 'force-dynamic'

// ERP SHARTNOMASI — buyurtmaning yetkazish nuqtasini aniqlashtirish.
// Mijoz xaritada nuqta belgilamagan bo'lsa, do'kon telefonda aniqlab kiritadi —
// kuryer aniq joyga boradi. Faqat kuryer bilan yetkaziladigan buyurtmalar.
export async function POST(req: NextRequest, { params }: { params: Promise<{ raqam: string }> }) {
  const t = await erpSorovi(req)
  if (!t.ok) return t.javob
  let tana: unknown
  try { tana = JSON.parse(t.tana) } catch { return xatoJavob({ kod: 'notogri', xabar: "So'rov noto'g'ri" }) }
  const n = nuqtaniOqi(tana)
  if ('xato' in n) return xatoJavob({ kod: 'notogri', xabar: n.xato })

  const raqam = decodeURIComponent((await params).raqam)
  const r = await db.mpBuyurtma.updateMany({ where: { raqam, yetkazish: 'KURYER' }, data: { lat: n.lat, lng: n.lng } })
  if (r.count === 0) return xatoJavob({ kod: 'topilmadi', xabar: 'Kuryerlik buyurtma topilmadi' })
  return javob(n)
}
