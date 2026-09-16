import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { katalog } from '@/lib/erp/mijoz'

// Salomatlik tekshiruvi — "sayt ishlayaptimi?" degan savolga aniq javob.
//
// Faqat "server javob berdi" yetarli emas: marketplace ikki narsaga
// tayanadi — o'z bazasi va ERP shartnomasi. Ikkalasidan biri tushsa
// sahifa ochiladi-yu, katalog bo'sh chiqadi. Shu yerda ikkalasi ham
// alohida tekshiriladi, ishga tushirgich va kelajakdagi monitoring
// shunga qaraydi.
//
// Maxfiy narsa qaytarilmaydi: kalit, ulanish manzili yoki xato matni
// ichidagi tafsilot yo'q — faqat "ok / emas" va kechikish.

export const dynamic = 'force-dynamic'

async function olcha<T>(ish: () => Promise<T>): Promise<{ ok: boolean; ms: number }> {
  const bosh = performance.now()
  try {
    const n = await ish()
    const ok = typeof n === 'object' && n !== null && 'ok' in n ? Boolean((n as { ok: unknown }).ok) : true
    return { ok, ms: Math.round(performance.now() - bosh) }
  } catch {
    return { ok: false, ms: Math.round(performance.now() - bosh) }
  }
}

export async function GET() {
  const [baza, erp] = await Promise.all([
    olcha(() => db.$queryRaw`select 1`),
    olcha(() => katalog()),
  ])
  const hammasi = baza.ok && erp.ok

  return NextResponse.json(
    { holat: hammasi ? 'ishlayapti' : 'nosoz', baza, erp, vaqt: new Date().toISOString() },
    // 503 — yuk balanslovchi va monitoring nosoz nusxani darhol ajratsin.
    { status: hammasi ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  )
}
