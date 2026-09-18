import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { SOZLAMA_XATOLARI, katalog } from '@/lib/erp/mijoz'

// Salomatlik tekshiruvi — "sayt ishlayaptimi?" degan savolga aniq javob.
//
// Faqat "server javob berdi" yetarli emas: marketplace ikki narsaga
// tayanadi — o'z bazasi va ERP shartnomasi. Ikkalasidan biri tushsa
// sahifa ochiladi-yu, katalog bo'sh chiqadi. Shu yerda ikkalasi ham
// alohida tekshiriladi, ishga tushirgich va kelajakdagi monitoring
// shunga qaraydi.
//
// Maxfiy narsa qaytarilmaydi: kalit, ulanish manzili yoki xato matni
// ichidagi tafsilot yo'q — faqat "ok / emas", kechikish va ERP ulanmasa
// SABABI (qaysi sozlama yetishmayotgani). Sababsiz "nosoz" javobidan
// muammoni topib bo'lmasdi — 2026-09-18 da shunday bo'lgan.

const ERP_IZOHI: Record<string, string> = {
  tarmoq: 'ERP manziliga ulanib bo‘lmadi — ERP_BASE_URL ni tekshiring',
  vaqt_tugadi: 'ERP javob bermadi (vaqt tugadi)',
  erp_rad_etdi: 'ERP so‘rovni rad etdi — ERP_BASE_URL noto‘g‘ri yoki ERP eski versiyada',
  erp_shartnoma: 'ERP javobi kutilgan shaklda emas — ERP va marketplace versiyalari farq qiladi',
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

/** ERP ulanmasa — mashina o'qiydigan sabab va odam o'qiydigan izoh. */
async function erpTekshir() {
  const bosh = performance.now()
  try {
    const n = await katalog()
    const ms = Math.round(performance.now() - bosh)
    if (n.ok) return { ok: true, ms }
    const t = n.xato.tafsilot as { sabab?: unknown; holat?: unknown } | undefined
    const sabab = typeof t?.sabab === 'string' ? t.sabab : n.xato.kod
    const izoh = SOZLAMA_XATOLARI[sabab] ?? ERP_IZOHI[sabab]
      ?? (sabab.startsWith('holat_5') ? 'ERP ichki xato qaytardi' : undefined)
    return { ok: false, ms, sabab, ...(izoh ? { izoh } : {}) }
  } catch {
    return { ok: false, ms: Math.round(performance.now() - bosh), sabab: 'nomalum' }
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
