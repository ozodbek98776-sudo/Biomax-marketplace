import type { NextRequest } from 'next/server'
import { vitrina } from '@/lib/domen/vitrina'
import { kartaga } from '@/lib/domen/karta'
import { javob, xatoJavob } from '@/lib/api'

export const dynamic = 'force-dynamic'

/**
 * Kartochka ma'lumoti slug'lar bo'yicha — "Yaqinda ko'rilganlar" uchun.
 * Faqat ommaviy ma'lumot (vitrinadagi narx va mavjudlik); tartib so'ralgan tartibda.
 */
export async function GET(req: NextRequest) {
  const sluglar = (req.nextUrl.searchParams.get('slug') ?? '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 12)
  if (sluglar.length === 0) return javob({ tovarlar: [] })
  const v = await vitrina()
  if (!v.ok) return xatoJavob(v.xato)
  const boyicha = new Map(v.qiymat.map(t => [t.slug, t]))
  return javob({ tovarlar: sluglar.flatMap(s => { const t = boyicha.get(s); return t ? [kartaga(t)] : [] }) })
}
