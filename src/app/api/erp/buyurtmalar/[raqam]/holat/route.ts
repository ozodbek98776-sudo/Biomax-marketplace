import type { NextRequest } from 'next/server'
import { erpSorovi } from '@/lib/erp/kiruvchi'
import { erpBuyurtma, holatniOzgartir } from '@/lib/domen/buyurtma-server'
import { holatmi, keyingiHolatlar } from '@/lib/domen/buyurtma'
import { javob, xatoJavob } from '@/lib/api'

export const dynamic = 'force-dynamic'

// ERP SHARTNOMASI — do'kon buyurtma holatini o'zgartiradi.
// Tana: { holat, kim, izoh?, sabab? }. `kim` — ERP xodimining ismi (audit uchun).
export async function POST(req: NextRequest, { params }: { params: Promise<{ raqam: string }> }) {
  const t = await erpSorovi(req)
  if (!t.ok) return t.javob

  let tana: Record<string, unknown>
  try {
    const j: unknown = JSON.parse(t.tana)
    if (!j || typeof j !== 'object') throw new Error()
    tana = j as Record<string, unknown>
  } catch {
    return xatoJavob({ kod: 'notogri_sorov', xabar: 'So‘rov noto‘g‘ri' })
  }
  if (!holatmi(tana.holat)) return xatoJavob({ kod: 'holat_notogri', xabar: 'Holat noto‘g‘ri' })
  const kim = typeof tana.kim === 'string' && tana.kim.trim() ? `do‘kon: ${tana.kim.trim()}` : 'do‘kon'
  const izoh = typeof tana.izoh === 'string' ? tana.izoh.trim() || null : null
  const sabab = typeof tana.sabab === 'string' ? tana.sabab.trim() || null : null

  const raqam = decodeURIComponent((await params).raqam)
  const n = await holatniOzgartir({ raqam }, tana.holat, {
    kim, izoh: tana.holat === 'BEKOR' && sabab ? `Do‘kon bekor qildi: ${sabab}` : izoh, bekorSababi: sabab,
  })
  if (!n.ok) return xatoJavob(n.xato)

  const b = await erpBuyurtma(raqam)
  return javob({ ...b!, keyingiHolatlar: keyingiHolatlar(b!.holati) })
}
