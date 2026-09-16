import type { NextRequest } from 'next/server'
import { erpSorovi } from '@/lib/erp/kiruvchi'
import { erpMijoz } from '@/lib/domen/mijoz-server'
import { javob, xatoJavob } from '@/lib/api'

export const dynamic = 'force-dynamic'

// ERP SHARTNOMASI — bitta xaridor: manzillari va barcha buyurtmalari tarkibi bilan.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const t = await erpSorovi(req)
  if (!t.ok) return t.javob
  const id = decodeURIComponent((await params).id)
  if (!/^[a-z0-9]{10,40}$/i.test(id)) return xatoJavob({ kod: 'topilmadi', xabar: 'Mijoz topilmadi' })
  const m = await erpMijoz(id)
  if (!m) return xatoJavob({ kod: 'topilmadi', xabar: 'Mijoz topilmadi' })
  return javob(m)
}
