import type { NextRequest } from 'next/server'
import { kirishKodiTasdiq } from '@/lib/domen/kirish-kodi'
import { seansOch } from '@/lib/hisob'
import { telefonniTozala } from '@/lib/domen/telefon'
import { XATOLAR } from '@/lib/natija'
import { ipChegarasi, javob, jsonOqi, ozSaytdanmi, xatoJavob } from '@/lib/api'

export const dynamic = 'force-dynamic'

/**
 * POST /api/kirish/tasdiq — kodni tekshirish va seans ochish.
 *
 * Ro'yxatdan o'tishda ism ham keladi va hisobga yoziladi. Kodni tanlab
 * olishga qarshi ikki chegara bor: shu yerda IP bo'yicha, domenda esa
 * har bir kod uchun 5 ta noto'g'ri urinish (`kirish-kodi.ts`).
 */
export async function POST(req: NextRequest) {
  if (!ozSaytdanmi(req)) return javob({ kod: 'taqiqlangan', xato: 'Ruxsat yoq' }, 403)

  const kutish = ipChegarasi(req, 'kirish-tasdiq', 15, 10 * 60_000)
  if (kutish) {
    const n = XATOLAR.tezlikChegarasi(kutish)
    if (!n.ok) return xatoJavob(n.xato)
  }

  const tana = await jsonOqi(req)
  if (!tana) return xatoJavob({ kod: 'notogri_sorov', xabar: 'Sorov notogri' })

  const telefon = telefonniTozala(tana.telefon)
  if (!telefon) {
    return xatoJavob({ kod: 'telefon_notogri', xabar: 'Telefon raqamini toliq kiriting: +998 90 123 45 67' })
  }

  const kod = typeof tana.kod === 'string' ? tana.kod.trim() : ''
  if (!/^\d{6}$/.test(kod)) return xatoJavob({ kod: 'kod_notogri', xabar: 'Kodni toliq kiriting (6 raqam)' })

  const ism = typeof tana.ism === 'string' ? tana.ism.trim().replace(/\s+/g, ' ') : ''
  if (ism && (ism.length < 2 || ism.length > 60)) {
    return xatoJavob({ kod: 'ism_notogri', xabar: 'Ismingizni kiriting (2–60 belgi)' })
  }

  const n = await kirishKodiTasdiq(telefon, kod, ism || undefined)
  if (!n.ok) return xatoJavob(n.xato)

  await seansOch(n.qiymat.hisobId)
  return javob({ ok: true, yangi: n.qiymat.yangi, hisob: { ism: n.qiymat.ism } })
}
