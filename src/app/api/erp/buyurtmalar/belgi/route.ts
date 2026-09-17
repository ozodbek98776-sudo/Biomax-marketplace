import type { NextRequest } from 'next/server'
import { erpSorovi } from '@/lib/erp/kiruvchi'
import { erpBuyurtmaBelgisi } from '@/lib/domen/buyurtma-server'
import { javob } from '@/lib/api'

export const dynamic = 'force-dynamic'

// ERP SHARTNOMASI — buyurtmalar o'zgarganini bildiruvchi qisqa belgi.
// Panel buni tez-tez so'raydi va faqat belgi o'zgarganda ro'yxatni yuklaydi.
export async function GET(req: NextRequest) {
  const t = await erpSorovi(req)
  if (!t.ok) return t.javob
  return javob(await erpBuyurtmaBelgisi())
}
