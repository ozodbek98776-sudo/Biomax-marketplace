import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { kirishKodiYubor } from '@/lib/domen/kirish-kodi'

// POST /api/kirish/kod — telefonga kirish kodi yuborish

const sxema = z.object({
  telefon: z.string().regex(/^\+998\d{9}$/, 'Telefon +998901234567 formatida bolishi kerak'),
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

    const { telefon } = validatsiya.data
    const natija = await kirishKodiYubor(telefon)

    if (!natija.ok) {
      return NextResponse.json({ ok: false, xato: natija.xato }, { status: 400 })
    }

    return NextResponse.json({ ok: true, kanal: natija.qiymat.kanal })
  } catch (error) {
    console.error('[api/kirish/kod] xato:', error)
    return NextResponse.json(
      { ok: false, xato: { kod: 'server', xabar: 'Ichki xato' } },
      { status: 500 },
    )
  }
}
