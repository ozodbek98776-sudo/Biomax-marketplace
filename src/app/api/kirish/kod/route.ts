import type { NextRequest } from 'next/server'
import { kirishKodiYubor } from '@/lib/domen/kirish-kodi'
import { telefonniTozala } from '@/lib/domen/telefon'
import { XATOLAR } from '@/lib/natija'
import { ipChegarasi, javob, jsonOqi, ozSaytdanmi, xatoJavob } from '@/lib/api'

export const dynamic = 'force-dynamic'

/**
 * POST /api/kirish/kod — raqamga bir martalik kod yuborish (Telegram bot).
 *
 * Mijoz avval botga /start bosib raqamini ulashi kerak — chat ID shunda
 * saqlanadi (`api/telegram/webhook`). Ulanmagan bo'lsa yo'riqnoma qaytadi.
 */
export async function POST(req: NextRequest) {
  if (!ozSaytdanmi(req)) return javob({ kod: 'taqiqlangan', xato: 'Ruxsat yoq' }, 403)

  // Bitta IP dan kod "quvurlash" — telefon bo'yicha chegara domenda (1 daqiqa)
  const kutish = ipChegarasi(req, 'kirish-kod', 5, 10 * 60_000)
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

  const n = await kirishKodiYubor(telefon)
  if (!n.ok) return xatoJavob(n.xato)
  return javob({ ok: true, kanal: n.qiymat.kanal })
}
