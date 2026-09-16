import type { NextRequest } from 'next/server'
import { erpSorovi } from '@/lib/erp/kiruvchi'
import { erpBuyurtmalar } from '@/lib/domen/buyurtma-server'
import { holatmi } from '@/lib/domen/buyurtma'
import { javob } from '@/lib/api'

export const dynamic = 'force-dynamic'

// ERP SHARTNOMASI — onlayn buyurtmalar ro'yxati (do'kon paneli uchun).
export async function GET(req: NextRequest) {
  const t = await erpSorovi(req)
  if (!t.ok) return t.javob

  const p = req.nextUrl.searchParams
  const h = p.get('holat')
  const natija = await erpBuyurtmalar({
    holat: h === 'FAOL' ? 'FAOL' : holatmi(h) ? h : null,
    qidiruv: p.get('q'),
    sahifa: Number(p.get('sahifa')) || 1,
  })
  return javob(natija)
}
