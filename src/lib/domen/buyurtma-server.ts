import 'server-only'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { vitrina } from '@/lib/domen/vitrina'
import { katalog, rezervBoshat } from '@/lib/erp/mijoz'
import { savatJamisi } from '@/lib/domen/narx'
import { DOKON } from '@/lib/dokon'
import { type Natija, muvaffaq, xato } from '@/lib/natija'
import {
  type Holat, type RasmiylashtirishKirishi,
  buyurtmaRaqami, mijozBekorQilaOladimi, otishMumkinmi, rasmiylashtirishniTekshir, vaqtOraliqlari, holatYorligi,
} from '@/lib/domen/buyurtma'

// Buyurtma — baza bilan ishlaydigan qism.
//
// Narx va nom buyurtma paytida NUSXA qilinadi: keyin katalogda narx
// o'zgarsa ham mijoz nimaga rozi bo'lgani hujjatda qoladi.

const TOSHKENT_YIL = () => new Date(Date.now() + 5 * 3_600_000).getUTCFullYear()

export async function buyurtmaYarat(
  hisob: { id: string; ism: string | null },
  kirish: RasmiylashtirishKirishi,
): Promise<Natija<{ raqam: string }>> {
  const t = rasmiylashtirishniTekshir(kirish, {
    hududlar: DOKON.hududlar,
    oraliqlar: vaqtOraliqlari(),
    standartIsm: hisob.ism,
  })
  if (!t.ok) return t
  const f = t.qiymat

  // Jonli narx va mavjudlik — tranzaksiyadan OLDIN (tarmoq so'rovi
  // tranzaksiya ichida ulanishni band qilib turmasin).
  const [v, erp] = await Promise.all([vitrina(), katalog()])
  if (!v.ok) return v
  if (!erp.ok) return erp
  const boyicha = new Map(v.qiymat.map(x => [x.elonId, x]))

  try {
    const raqam = await db.$transaction(async tx => {
      // Savat qatori qulflanadi: bir vaqtda ikki marta bosilgan "Buyurtma
      // berish" ikkita buyurtma yaratmasin — ikkinchisi bo'sh savatni ko'radi.
      const savat = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM marketplace.mp_savatlar WHERE "hisobId" = ${hisob.id} FOR UPDATE`
      const savatId = savat[0]?.id
      if (!savatId) throw new DomenXato('savat_bosh', 'Savat bo‘sh')

      const xom = await tx.mpSavatQatori.findMany({ where: { savatId }, select: { elonId: true, miqdor: true } })
      if (xom.length === 0) throw new DomenXato('savat_bosh', 'Savat bo‘sh')

      const qatorlar = xom.map(q => {
        const tovar = boyicha.get(q.elonId)
        if (!tovar) throw new DomenXato('mahsulot_yoq', 'Savatdagi mahsulotlardan biri sotuvdan olingan — savatni yangilang')
        if (tovar.mavjudlik === 'YOQ') throw new DomenXato('mavjud_emas', `«${tovar.nomi}» hozir mavjud emas — uni savatdan olib tashlang`)
        if (tovar.narxSom === null) throw new DomenXato('narx_yoq', `«${tovar.nomi}» narxi hozircha aniqlanmadi`)
        const miqdor = Number(q.miqdor)
        return { tovar, miqdor, birlikNarxi: tovar.narxSom, jami: Math.round(tovar.narxSom * miqdor) }
      })

      const jami = savatJamisi(qatorlar.map(q => ({ birlikNarxiSom: q.birlikNarxi, miqdor: q.miqdor })), f.yetkazishNarx)

      const ketma = await tx.$queryRaw<{ n: bigint }[]>`SELECT nextval('marketplace.mp_buyurtma_raqam_seq') AS n`
      const raqam = buyurtmaRaqami(TOSHKENT_YIL(), Number(ketma[0]!.n))

      await tx.mpBuyurtma.create({
        data: {
          raqam,
          hisobId: hisob.id,
          yetkazish: f.yetkazish,
          hudud: f.hudud,
          manzilMatni: f.manzil,
          moljal: f.moljal,
          lat: f.lat,
          lng: f.lng,
          aloqaTel: f.aloqaTel,
          aloqaIsm: f.aloqaIsm,
          vaqtOraligi: f.vaqt.yorliq,
          yetkazishBoshi: f.vaqt.boshi,
          tolovUsuli: f.tolov,
          mahsulotSumma: jami.mahsulotSumma,
          yetkazishNarx: jami.yetkazishNarx,
          jamiSumma: jami.jamiSumma,
          usdKursi: erp.qiymat.usdKursi,
          izoh: f.izoh,
          qatorlar: {
            create: qatorlar.map(q => ({
              erpTovarId: q.tovar.erpTovarId,
              slug: q.tovar.slug,
              nomi: q.tovar.nomi,
              birlik: q.tovar.birlik,
              birlikNarxi: q.birlikNarxi,
              miqdor: q.miqdor,
              jami: q.jami,
            })),
          },
          tarix: { create: { holati: 'YANGI', kim: 'mijoz' } },
        },
      })

      await tx.mpSavatQatori.deleteMany({ where: { savatId } })

      // Manzil keyingi safar uchun — bir xil matn ikki marta saqlanmaydi
      if (f.manzilniSaqla && f.manzil) {
        const bor = await tx.mpManzil.findFirst({ where: { hisobId: hisob.id, manzil: f.manzil }, select: { id: true } })
        if (bor) {
          await tx.mpManzil.update({ where: { id: bor.id }, data: { viloyat: f.hudud, moljal: f.moljal, lat: f.lat, lng: f.lng } })
        } else {
          const soni = await tx.mpManzil.count({ where: { hisobId: hisob.id } })
          await tx.mpManzil.create({
            data: {
              hisobId: hisob.id, nomi: soni === 0 ? 'Asosiy' : `Manzil ${soni + 1}`,
              // `viloyat` maydoni yetkazish hududi (tuman) uchun ishlatiladi
              viloyat: f.hudud, manzil: f.manzil, moljal: f.moljal, lat: f.lat, lng: f.lng, asosiy: soni === 0,
            },
          })
        }
      }
      return raqam
    }, { timeout: 15_000 })

    return muvaffaq({ raqam })
  } catch (e) {
    if (e instanceof DomenXato) return xato(e.kod, e.message)
    throw e
  }
}

class DomenXato extends Error {
  constructor(public kod: string, xabar: string) { super(xabar) }
}

// ─── O'qish ──────────────────────────────────────────────────────────

export const TAFSILOT = {
  id: true, raqam: true, holati: true, yetkazish: true, hudud: true, manzilMatni: true, moljal: true,
  lat: true, lng: true, aloqaTel: true, aloqaIsm: true, vaqtOraligi: true, yetkazishBoshi: true,
  tolovUsuli: true, mahsulotSumma: true, yetkazishNarx: true, jamiSumma: true, izoh: true, bekorSababi: true,
  yaratilgan: true, yangilangan: true,
  qatorlar: { select: { id: true, erpTovarId: true, slug: true, nomi: true, birlik: true, birlikNarxi: true, miqdor: true, jami: true }, orderBy: { id: 'asc' } },
  tarix: { select: { holati: true, izoh: true, kim: true, sana: true }, orderBy: { sana: 'asc' } },
} satisfies Prisma.MpBuyurtmaSelect

type XomTafsilot = Prisma.MpBuyurtmaGetPayload<{ select: typeof TAFSILOT }>

/** Decimal → number: mijozga va ERP'ga JSON'da oddiy son ketadi. */
export function tekis(b: XomTafsilot) {
  return {
    ...b,
    mahsulotSumma: Number(b.mahsulotSumma),
    yetkazishNarx: Number(b.yetkazishNarx),
    jamiSumma: Number(b.jamiSumma),
    qatorlar: b.qatorlar.map(q => ({ ...q, birlikNarxi: Number(q.birlikNarxi), miqdor: Number(q.miqdor), jami: Number(q.jami) })),
    holatYorligi: holatYorligi(b.holati, b.yetkazish === 'OLIB_KETISH' ? 'OLIB_KETISH' : 'KURYER'),
  }
}
export type BuyurtmaTafsiloti = ReturnType<typeof tekis>

/** Mijozning o'z buyurtmasi — boshqaning raqamini terib ko'rib bo'lmaydi. */
export async function mijozBuyurtmasi(hisobId: string, raqam: string): Promise<BuyurtmaTafsiloti | null> {
  const b = await db.mpBuyurtma.findFirst({ where: { raqam, hisobId }, select: TAFSILOT })
  return b ? tekis(b) : null
}

export async function mijozBekorQilish(hisobId: string, raqam: string, sabab: string | null): Promise<Natija<{ holati: Holat }>> {
  const n = await holatniOzgartir({ raqam, hisobId }, 'BEKOR', {
    kim: 'mijoz',
    izoh: sabab ? `Mijoz bekor qildi: ${sabab}` : 'Mijoz bekor qildi',
    bekorSababi: sabab ?? 'Mijoz bekor qildi',
    mijozdan: true,
  })
  if (n.ok) {
    // ERP'dagi zaxira bandi bo'shatiladi. Bu yerda muvaffaqiyatsizlik mijozni
    // to'xtatmaydi: band baribir 48 soatda o'zi tugaydi, jurnalga yoziladi.
    const r = await rezervBoshat(raqam)
    if (!r.ok) console.error(`[buyurtma] ${raqam}: ERP bandi bo‘shatilmadi — ${r.xato.xabar}`)
  }
  return n
}

/**
 * Holatni o'zgartirish — mijoz ham, do'kon ham shu yerdan o'tadi.
 *
 * O'tish shartli `updateMany` bilan: ikki xodim bir vaqtda bosganda (biri
 * "tasdiqlash", biri "bekor") faqat bittasi o'tadi, ikkinchisi aniq xato oladi.
 */
export async function holatniOzgartir(
  qayerda: { raqam: string; hisobId?: string },
  yangi: Holat,
  o: { kim: string; izoh?: string | null; bekorSababi?: string | null; mijozdan?: boolean },
): Promise<Natija<{ holati: Holat }>> {
  const b = await db.mpBuyurtma.findFirst({
    where: { raqam: qayerda.raqam, ...(qayerda.hisobId ? { hisobId: qayerda.hisobId } : {}) },
    select: { id: true, holati: true, yetkazish: true },
  })
  if (!b) return xato('topilmadi', 'Buyurtma topilmadi')

  if (o.mijozdan && !mijozBekorQilaOladimi(b.holati)) {
    return xato('bekor_mumkin_emas', b.holati === 'YOLDA'
      ? 'Buyurtma yo‘lga chiqqan — bekor qilish uchun do‘kon bilan bog‘laning'
      : `«${holatYorligi(b.holati)}» holatidagi buyurtmani bekor qilib bo‘lmaydi`)
  }
  if (!otishMumkinmi(b.holati, yangi)) {
    return xato('holat_mos_emas', `«${holatYorligi(b.holati)}» dan «${holatYorligi(yangi)}» ga o‘tib bo‘lmaydi`)
  }
  if (yangi === 'BEKOR' && !o.bekorSababi?.trim()) {
    return xato('sabab_kerak', 'Bekor qilish sababini yozing')
  }

  const natija = await db.$transaction(async tx => {
    const n = await tx.mpBuyurtma.updateMany({
      where: { id: b.id, holati: b.holati },
      data: { holati: yangi, ...(yangi === 'BEKOR' ? { bekorSababi: o.bekorSababi!.trim().slice(0, 300) } : {}) },
    })
    if (n.count === 0) return false
    await tx.mpHolatTarixi.create({
      data: { buyurtmaId: b.id, holati: yangi, kim: o.kim.slice(0, 80), izoh: o.izoh?.slice(0, 300) ?? null },
    })
    return true
  })
  if (!natija) return xato('holat_ozgardi', 'Buyurtma holati hozirgina o‘zgardi — sahifani yangilang')
  return muvaffaq({ holati: yangi })
}

// ─── Do'kon (ERP) uchun ──────────────────────────────────────────────

export interface ErpRoyxatFiltri {
  holat?: Holat | 'FAOL' | null
  qidiruv?: string | null
  sahifa?: number
}

const SAHIFA_HAJMI = 30

export async function erpBuyurtmalar(f: ErpRoyxatFiltri) {
  const qidiruv = f.qidiruv?.trim().slice(0, 60)
  const where: Prisma.MpBuyurtmaWhereInput = {
    ...(f.holat === 'FAOL'
      ? { holati: { in: ['YANGI', 'TASDIQLANGAN', 'YIGILMOQDA', 'YOLDA'] } }
      : f.holat ? { holati: f.holat } : {}),
    ...(qidiruv
      ? { OR: [
          { raqam: { contains: qidiruv, mode: 'insensitive' } },
          { aloqaTel: { contains: qidiruv.replace(/\D/g, '') || qidiruv } },
          { aloqaIsm: { contains: qidiruv, mode: 'insensitive' } },
        ] }
      : {}),
  }
  const sahifa = Math.max(1, Math.min(1000, Math.floor(f.sahifa ?? 1)))

  const [jami, qatorlar, guruh] = await Promise.all([
    db.mpBuyurtma.count({ where }),
    db.mpBuyurtma.findMany({
      where,
      // Faol buyurtmalarda eng yangisi tepada; kutayotganlar birinchi ko'rinsin
      orderBy: [{ yaratilgan: 'desc' }],
      skip: (sahifa - 1) * SAHIFA_HAJMI,
      take: SAHIFA_HAJMI,
      select: TAFSILOT,
    }),
    db.mpBuyurtma.groupBy({ by: ['holati'], _count: { _all: true } }),
  ])

  const sonlar = Object.fromEntries(guruh.map(g => [g.holati, g._count._all])) as Partial<Record<Holat, number>>
  return { buyurtmalar: qatorlar.map(tekis), jami, sahifa, sahifaHajmi: SAHIFA_HAJMI, sonlar }
}

export async function erpBuyurtma(raqam: string): Promise<BuyurtmaTafsiloti | null> {
  const b = await db.mpBuyurtma.findUnique({ where: { raqam }, select: TAFSILOT })
  return b ? tekis(b) : null
}
