import 'server-only'
import { NextResponse, type NextRequest } from 'next/server'
import { sozlama } from '@/lib/sozlama'
import { imzoTogrimi } from './imzo'

// ERP → marketplace so'rovlarini tekshirish (buyurtmalarni boshqarish).
//
// Kalit marketplace → ERP yo'nalishidagi bilan bir xil, lekin imzoga
// YO'L ham kiradi: ERP'ga yuborilgan so'rovni ushlab olib, bu yerdagi
// boshqa manzilga qayta yuborib bo'lmaydi.

export async function erpSorovi(req: NextRequest): Promise<{ ok: true; tana: string } | { ok: false; javob: NextResponse }> {
  const tana = req.method === 'GET' ? '' : await req.text()
  const vaqt = req.headers.get('x-mp-timestamp')
  const imzo = req.headers.get('x-mp-signature')
  if (!vaqt || !imzo) {
    return { ok: false, javob: NextResponse.json({ kod: 'imzo_yoq', xato: 'Ruxsat yo‘q' }, { status: 401 }) }
  }
  // Imzo so'rov yo'li + query bilan: filtrlarni o'zgartirib qayta yuborib bo'lmasin
  const yol = req.nextUrl.pathname + req.nextUrl.search
  const t = imzoTogrimi(sozlama.ERP_HMAC_SECRET, yol, tana, vaqt, imzo)
  if (!t.ok) {
    console.warn('[erp→mp] imzo rad etildi:', t.sabab, req.nextUrl.pathname)
    return { ok: false, javob: NextResponse.json({ kod: t.sabab, xato: 'Ruxsat yo‘q' }, { status: 401 }) }
  }
  return { ok: true, tana }
}
