import type { NextRequest } from 'next/server'
import { joriyHisob } from '@/lib/hisob'
import { mijozBuyurtmaBelgisi } from '@/lib/domen/buyurtma-server'
import { javob } from '@/lib/api'

export const dynamic = 'force-dynamic'

/**
 * Mijozning buyurtmasi o'zgardimi — sahifa qayta yuklanmasdan holat
 * yangilanishi uchun. `?raqam=` berilsa faqat shu buyurtma, aks holda
 * mijozning barcha buyurtmalari (kabinet ro'yxati).
 */
export async function GET(req: NextRequest) {
  const hisob = await joriyHisob()
  if (!hisob) return javob({ kod: 'kirish_kerak', xato: 'Kirish kerak' }, 401)
  const raqam = req.nextUrl.searchParams.get('raqam')
  const toza = raqam && /^MP-\d{4}-\d{5,}$/.test(raqam) ? raqam : null
  return javob({ belgi: await mijozBuyurtmaBelgisi(hisob.id, toza) })
}
