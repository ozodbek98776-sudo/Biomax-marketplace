import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { kodsizKir } from '@/lib/kirish-server'
import { telefonniTozala } from '@/lib/domen/telefon'
import { XATOLAR } from '@/lib/natija'
import { ipChegarasi, javob, jsonOqi, ozSaytdanmi, xatoJavob } from '@/lib/api'

export const dynamic = 'force-dynamic'

/**
 * Kodsiz kirish — telefon raqami (va royxatda ism) bilan darhol.
 */
export async function POST(req: NextRequest) {
  if (!ozSaytdanmi(req)) return javob({ kod: 'taqiqlangan', xato: 'Ruxsat yoq' }, 403)

  const kutish = ipChegarasi(req, 'kirish', 10, 10 * 60_000)
  if (kutish) {
    const n = XATOLAR.tezlikChegarasi(kutish)
    if (!n.ok) return xatoJavob(n.xato)
  }

  const tana = await jsonOqi(req)
  if (!tana) return xatoJavob({ kod: 'notogri_sorov', xabar: 'Sorov notogri' })

  const telefon = telefonniTozala(tana.telefon)
  if (!telefon) return xatoJavob({ kod: 'telefon_notogri', xabar: 'Telefon raqamini toliq kiriting: +998 90 123 45 67' })

  const rejim = tana.rejim === 'kirish' ? 'kirish' : 'royxat'
  const ism = typeof tana.ism === 'string' ? tana.ism.trim().replace(/\s+/g, ' ') : ''

  const mavjud = await db.mpHisob.findUnique({ where: { telefon }, select: { tasdiqlangan: true, faol: true } })
  if (mavjud && !mavjud.faol) {
    return xatoJavob({ kod: 'hisob_bloklangan', xabar: 'Hisob bloklangan. Dokon bilan bog\'laning.' })
  }
  if (rejim === 'kirish' && !mavjud?.tasdiqlangan) {
    return xatoJavob({ kod: 'hisob_yoq', xabar: 'Bu raqam bilan hisob ochilmagan — royxatdan o\'ting' })
  }
  if (!mavjud && (ism.length < 2 || ism.length > 60)) {
    return xatoJavob({ kod: 'ism_notogri', xabar: 'Ismingizni kiriting (2–60 belgi)' })
  }

  const n = await kodsizKir(telefon, ism)
  if (!n.ok) return xatoJavob(n.xato)
  return javob({ ok: true, ...n.qiymat })
}
