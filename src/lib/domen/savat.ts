import 'server-only'
import { randomBytes } from 'node:crypto'
import { db } from '@/lib/db'
import { vitrina } from '@/lib/domen/vitrina'
import { savatJamisi } from '@/lib/domen/narx'
import { type Natija, muvaffaq, xato } from '@/lib/natija'
import type { Mavjudlik } from '@/lib/erp/turlar'

// Savat — faqat ro'yxatdan o'tgan xaridor uchun.
//
// Narx va mavjudlik savatda SAQLANMAYDI: har ochilishda ERP'dan jonli
// olinadi. Aks holda mijoz kecha qo'shgan tovarni kechagi narxda ko'rib,
// buyurtmada boshqa summaga duch kelardi.

/** Bitta qatorga qo'shish mumkin bo'lgan eng katta miqdor. */
export const MAKS_MIQDOR = 99

export interface SavatQatori {
  elonId: string
  slug: string
  nomi: string
  birlik: string
  rasm: string | null
  miqdor: number
  birlikNarxiSom: number | null
  mavjudlik: Mavjudlik
  jamiSom: number | null
}

export interface Savat {
  qatorlar: SavatQatori[]
  soni: number
  mahsulotSumma: number
  /** Buyurtma berib bo'lmaydigan qatorlar bor (yo'q yoki narxi noma'lum). */
  muammoBor: boolean
}

async function savatId(hisobId: string): Promise<string> {
  const bor = await db.mpSavat.findUnique({ where: { hisobId }, select: { id: true } })
  if (bor) return bor.id
  const yangi = await db.mpSavat.upsert({
    where: { hisobId },
    update: {},
    // `belgi` — mehmon savati uchun mo'ljallangan maydon; hisob savatida
    // ham majburiy, shuning uchun tasodifiy qiymat.
    create: { hisobId, belgi: randomBytes(18).toString('base64url') },
    select: { id: true },
  })
  return yangi.id
}

export async function savatniOl(hisobId: string): Promise<Natija<Savat>> {
  const savat = await db.mpSavat.findUnique({
    where: { hisobId },
    select: { qatorlar: { select: { elonId: true, miqdor: true }, orderBy: { id: 'asc' } } },
  })
  const xom = savat?.qatorlar ?? []
  if (xom.length === 0) return muvaffaq({ qatorlar: [], soni: 0, mahsulotSumma: 0, muammoBor: false })

  const v = await vitrina()
  if (!v.ok) return v
  const boyicha = new Map(v.qiymat.map(t => [t.elonId, t]))

  const qatorlar: SavatQatori[] = []
  for (const q of xom) {
    const t = boyicha.get(q.elonId)
    // Vitrinadan olib tashlangan tovar savatda ko'rsatilmaydi
    if (!t) continue
    const miqdor = Number(q.miqdor)
    qatorlar.push({
      elonId: t.elonId, slug: t.slug, nomi: t.nomi, birlik: t.birlik,
      rasm: t.rasmlar[0] ?? null, miqdor,
      birlikNarxiSom: t.narxSom, mavjudlik: t.mavjudlik,
      jamiSom: t.narxSom === null ? null : Math.round(t.narxSom * miqdor),
    })
  }

  const hisoblanadigan = qatorlar.filter(q => q.birlikNarxiSom !== null && q.mavjudlik !== 'YOQ')
  const jami = savatJamisi(hisoblanadigan.map(q => ({ birlikNarxiSom: q.birlikNarxiSom!, miqdor: q.miqdor })))

  return muvaffaq({
    qatorlar,
    soni: qatorlar.reduce((s, q) => s + q.miqdor, 0),
    mahsulotSumma: jami.mahsulotSumma,
    muammoBor: qatorlar.length !== hisoblanadigan.length,
  })
}

/** Qo'shish (mavjud bo'lsa miqdor oshiriladi). */
export async function savatgaQosh(hisobId: string, slug: string, miqdor = 1): Promise<Natija<{ soni: number }>> {
  if (!Number.isInteger(miqdor) || miqdor < 1 || miqdor > MAKS_MIQDOR) {
    return xato('miqdor_notogri', `Miqdor 1 dan ${MAKS_MIQDOR} gacha bo‘lishi kerak`)
  }
  const v = await vitrina()
  if (!v.ok) return v
  const t = v.qiymat.find(x => x.slug === slug)
  if (!t) return xato('topilmadi', 'Mahsulot topilmadi')
  if (t.mavjudlik === 'YOQ') return xato('mavjud_emas', `«${t.nomi}» hozir mavjud emas`)
  if (t.narxSom === null) return xato('narx_yoq', `«${t.nomi}» narxi hozircha aniqlanmadi`)

  const id = await savatId(hisobId)
  const bor = await db.mpSavatQatori.findUnique({ where: { savatId_elonId: { savatId: id, elonId: t.elonId } } })
  const yangiMiqdor = Math.min(MAKS_MIQDOR, (bor ? Number(bor.miqdor) : 0) + miqdor)

  await db.mpSavatQatori.upsert({
    where: { savatId_elonId: { savatId: id, elonId: t.elonId } },
    update: { miqdor: yangiMiqdor },
    create: { savatId: id, elonId: t.elonId, miqdor: yangiMiqdor },
  })
  return muvaffaq({ soni: await savatSoni(hisobId) })
}

/** Miqdorni o'rnatish; 0 — qatorni o'chirish. */
export async function miqdorQoy(hisobId: string, elonId: string, miqdor: number): Promise<Natija<{ soni: number }>> {
  if (!Number.isInteger(miqdor) || miqdor < 0 || miqdor > MAKS_MIQDOR) {
    return xato('miqdor_notogri', `Miqdor 0 dan ${MAKS_MIQDOR} gacha bo‘lishi kerak`)
  }
  const savat = await db.mpSavat.findUnique({ where: { hisobId }, select: { id: true } })
  if (!savat) return xato('topilmadi', 'Savat topilmadi')

  if (miqdor === 0) {
    await db.mpSavatQatori.deleteMany({ where: { savatId: savat.id, elonId } })
  } else {
    // Faqat O'Z savatidagi qator — boshqaning qatori ID bilan tahrirlanmasin
    const n = await db.mpSavatQatori.updateMany({ where: { savatId: savat.id, elonId }, data: { miqdor } })
    if (n.count === 0) return xato('topilmadi', 'Savatda bunday mahsulot yo‘q')
  }
  return muvaffaq({ soni: await savatSoni(hisobId) })
}

export async function savatSoni(hisobId: string): Promise<number> {
  const r = await db.mpSavatQatori.aggregate({
    where: { savat: { hisobId } },
    _sum: { miqdor: true },
  })
  return Number(r._sum.miqdor ?? 0)
}
