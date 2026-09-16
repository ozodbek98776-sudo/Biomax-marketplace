import type { NextRequest } from 'next/server'
import { erpSorovi } from '@/lib/erp/kiruvchi'
import { erpBuyurtma } from '@/lib/domen/buyurtma-server'
import { keyingiHolatlar } from '@/lib/domen/buyurtma'
import { javob, xatoJavob } from '@/lib/api'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ raqam: string }> }) {
  const t = await erpSorovi(req)
  if (!t.ok) return t.javob
  const b = await erpBuyurtma(decodeURIComponent((await params).raqam))
  if (!b) return xatoJavob({ kod: 'topilmadi', xabar: 'Buyurtma topilmadi' })
  // Panel tugmalarini o'zi hisoblamasin — qoidalar faqat shu yerda
  return javob({ ...b, keyingiHolatlar: keyingiHolatlar(b.holati) })
}
