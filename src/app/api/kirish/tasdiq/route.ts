import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { kirishKodiTasdiq } from '@/lib/domen/kirish-kodi'
import { seansOch } from '@/lib/hisob'

// POST /api/kirish/tasdiq — kirish kodini tekshirish va seans boshlash

const sxema = z.object({
  telefon: z.string().regex(/^\+998\d{9}$/, 'Telefon +998901234567 formatida bolishi kerak'),
  kod: z.string().length(6, 'Kod 6 raqamli bolishi kerak'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validatsiya = sxema.safeParse(body)

    if (!validatsiya.success) {
      const xato = validatsiya.error.issues[0]
      return NextResponse.json(
        { ok: false, xato: { kod: 'validatsiya', xabar: xato?.message || 'Validatsiya xatosi' } },
        { status: 400 },
      )
    }

    const { telefon, kod } = validatsiya.data
    const natija = await kirishKodiTasdiq(telefon, kod)

    if (!natija.ok) {
      return NextResponse.json({ ok: false, xato: natija.xato }, { status: 400 })
    }

    const { hisobId, yangi } = natija.qiymat

    // Seans yaratish
    await seansOch(hisobId)

    return NextResponse.json({ ok: true, yangi })
  } catch (error) {
    console.error('[api/kirish/tasdiq] xato:', error)
    return NextResponse.json(
      { ok: false, xato: { kod: 'server', xabar: 'Ichki xato' } },
      { status: 500 },
    )
  }
}
