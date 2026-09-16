import type { NextRequest } from 'next/server'
import { joriyHisob } from '@/lib/hisob'
import { mijozBekorQilish } from '@/lib/domen/buyurtma-server'
import { javob, jsonOqi, ozSaytdanmi, xatoJavob } from '@/lib/api'

export const dynamic = 'force-dynamic'

/** Mijoz o'z buyurtmasini bekor qiladi — faqat kuryerga topshirilgunga qadar. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ raqam: string }> }) {
  if (!ozSaytdanmi(req)) return javob({ kod: 'taqiqlangan', xato: 'Ruxsat yo‘q' }, 403)
  const h = await joriyHisob()
  if (!h) return xatoJavob({ kod: 'kirish_kerak', xabar: 'Hisobingizga kiring' })

  const { raqam } = await params
  const tana = await jsonOqi(req)
  const sabab = typeof tana?.sabab === 'string' && tana.sabab.trim() ? tana.sabab.trim().slice(0, 200) : null

  const n = await mijozBekorQilish(h.id, decodeURIComponent(raqam), sabab)
  return n.ok ? javob(n.qiymat) : xatoJavob(n.xato)
}
