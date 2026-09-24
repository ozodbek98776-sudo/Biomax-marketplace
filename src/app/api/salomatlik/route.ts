import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Salomatlik tekshiruvi — "sayt ishlayaptimi?" degan savolga aniq javob.
//
// Faqat "server javob berdi" yetarli emas: sayt ikki narsaga tayanadi —
// o'z jadvallari (`marketplace` sxema) va ERP ma'lumotlari (`public`
// sxemadagi `vitrina_katalog` ko'rinishi). Ikkalasi shu yerda alohida
// tekshiriladi, ishga tushirgich va monitoring shunga qaraydi.
//
// Maxfiy narsa qaytarilmaydi: ulanish manzili ham, xato matni ham yo'q —
// faqat "ok / emas", kechikish va nosozlik SABABI. Sababsiz "nosoz"
// javobidan muammoni topib bo'lmasdi — 2026-09-18 da shunday bo'lgan.

const IZOHLAR: Record<string, string> = {
  korinish_yoq: 'ERP migratsiyasi qo‘llanmagan: public.vitrina_katalog ko‘rinishi yo‘q',
  ruxsat_yoq: 'Baza foydalanuvchisiga public sxemani o‘qish ruxsati berilmagan',
  baza: 'Bazaga ulanib bo‘lmadi — DATABASE_URL ni tekshiring',
}

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

/** ERP ma'lumotlari o'qilyaptimi — mashina o'qiydigan sabab va izoh bilan. */
async function erpTekshir() {
  const bosh = performance.now()
  try {
    const q = await db.$queryRawUnsafe<{ n: number }[]>(
      'SELECT count(*)::int AS n FROM public.vitrina_katalog',
    )
    return { ok: true, ms: Math.round(performance.now() - bosh), tovarlar: Number(q[0]?.n ?? 0) }
  } catch (e) {
    const matn = e instanceof Error ? e.message : ''
    const sabab = /does not exist/i.test(matn) ? 'korinish_yoq'
      : /permission denied/i.test(matn) ? 'ruxsat_yoq'
      : 'baza'
    return { ok: false, ms: Math.round(performance.now() - bosh), sabab, izoh: IZOHLAR[sabab] }
  }
}

export async function GET() {
  const [baza, erp] = await Promise.all([
    olcha(() => db.$queryRaw`select 1`),
    erpTekshir(),
  ])
  const hammasi = baza.ok && erp.ok

  return NextResponse.json(
    { holat: hammasi ? 'ishlayapti' : 'nosoz', baza, erp, vaqt: new Date().toISOString() },
    // 503 — yuk balanslovchi va monitoring nosoz nusxani darhol ajratsin.
    { status: hammasi ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  )
}
