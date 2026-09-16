import type { NextRequest } from 'next/server'
import { erpSorovi } from '@/lib/erp/kiruvchi'
import { erpMijozlar } from '@/lib/domen/mijoz-server'
import { mijozFiltriniOqi } from '@/lib/domen/mijoz'
import { javob } from '@/lib/api'

export const dynamic = 'force-dynamic'

// ERP SHARTNOMASI — saytda ro'yxatdan o'tgan xaridorlar (ERP "Mijozlar › Onlayn").
export async function GET(req: NextRequest) {
  const t = await erpSorovi(req)
  if (!t.ok) return t.javob
  return javob(await erpMijozlar(mijozFiltriniOqi(req.nextUrl.searchParams)))
}
