import 'server-only'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { TAFSILOT, tekis } from '@/lib/domen/buyurtma-server'
import { MIJOZ_SAHIFA_HAJMI, mijozXulosasi, type MijozRoyxatFiltri } from '@/lib/domen/mijoz'

// Xaridor hisoblari — ERP paneli uchun (imzolangan shartnoma orqali).
//
// Kirish kodlari va savat bu yerdan CHIQMAYDI: do'konga faqat mijozni
// tanish va unga xizmat qilish uchun kerak bo'lgan narsa beriladi.

export interface MijozQatori {
  id: string
  telefon: string
  ism: string | null
  tasdiqlangan: boolean
  faol: boolean
  yaratilgan: string
  buyurtmaSoni: number
  bajarilganSoni: number
  faolSoni: number
  xaridSumma: number
  oxirgiBuyurtma: string | null
}

const FAOL = Prisma.sql`('YANGI','TASDIQLANGAN','YIGILMOQDA','YOLDA')`

export async function erpMijozlar(f: MijozRoyxatFiltri) {
  const shartlar: Prisma.Sql[] = []
  if (f.qidiruv) {
    const naqsh = `%${f.qidiruv}%`
    shartlar.push(f.raqamlar
      ? Prisma.sql`(h.ism ILIKE ${naqsh} OR h.telefon LIKE ${`%${f.raqamlar}%`})`
      : Prisma.sql`h.ism ILIKE ${naqsh}`)
  }
  const where = shartlar.length ? Prisma.sql`WHERE ${Prisma.join(shartlar, ' AND ')}` : Prisma.empty
  const having = f.filtr === 'buyurtmali' ? Prisma.sql`HAVING count(b.id) > 0`
    : f.filtr === 'buyurtmasiz' ? Prisma.sql`HAVING count(b.id) = 0`
    : Prisma.empty
  const tartib = f.tartib === 'summa' ? Prisma.sql`"xaridSumma" DESC, "buyurtmaSoni" DESC, h.yaratilgan DESC`
    : f.tartib === 'oxirgi' ? Prisma.sql`"oxirgiBuyurtma" DESC NULLS LAST, h.yaratilgan DESC`
    : Prisma.sql`h.yaratilgan DESC`

  const guruhlangan = Prisma.sql`
    SELECT h.id, h.telefon, h.ism, h.tasdiqlangan, h.faol, h.yaratilgan,
      count(b.id)::int AS "buyurtmaSoni",
      (count(b.id) FILTER (WHERE b.holati = 'BAJARILGAN'))::int AS "bajarilganSoni",
      (count(b.id) FILTER (WHERE b.holati::text IN ${FAOL}))::int AS "faolSoni",
      coalesce(sum(b."jamiSumma") FILTER (WHERE b.holati = 'BAJARILGAN'), 0)::float8 AS "xaridSumma",
      max(b.yaratilgan) AS "oxirgiBuyurtma"
    FROM marketplace.mp_hisoblar h
    LEFT JOIN marketplace.mp_buyurtmalar b ON b."hisobId" = h.id
    ${where}
    GROUP BY h.id
    ${having}`

  const [qatorlar, jamiQator, statQator] = await Promise.all([
    db.$queryRaw<(Omit<MijozQatori, 'yaratilgan' | 'oxirgiBuyurtma'> & { yaratilgan: Date; oxirgiBuyurtma: Date | null })[]>`
      ${guruhlangan}
      ORDER BY ${tartib}
      LIMIT ${MIJOZ_SAHIFA_HAJMI} OFFSET ${(f.sahifa - 1) * MIJOZ_SAHIFA_HAJMI}`,
    db.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM (${guruhlangan}) x`,
    db.$queryRaw<{ jami: number; buyurtmali: number; yangi7: number; faolBuyurtmali: number }[]>`
      SELECT
        (SELECT count(*)::int FROM marketplace.mp_hisoblar) AS jami,
        (SELECT count(DISTINCT "hisobId")::int FROM marketplace.mp_buyurtmalar) AS buyurtmali,
        (SELECT count(*)::int FROM marketplace.mp_hisoblar WHERE yaratilgan > now() - interval '7 days') AS yangi7,
        (SELECT count(DISTINCT "hisobId")::int FROM marketplace.mp_buyurtmalar WHERE holati::text IN ${FAOL}) AS "faolBuyurtmali"`,
  ])

  return {
    mijozlar: qatorlar.map(q => ({
      ...q,
      yaratilgan: q.yaratilgan.toISOString(),
      oxirgiBuyurtma: q.oxirgiBuyurtma ? q.oxirgiBuyurtma.toISOString() : null,
    })) satisfies MijozQatori[],
    jami: jamiQator[0]?.n ?? 0,
    sahifa: f.sahifa,
    sahifaHajmi: MIJOZ_SAHIFA_HAJMI,
    statistika: statQator[0] ?? { jami: 0, buyurtmali: 0, yangi7: 0, faolBuyurtmali: 0 },
  }
}

/** Bitta xaridor: hisob, manzillar va BARCHA buyurtmalari (eng yangisi tepada, 200 tagacha). */
export async function erpMijoz(id: string) {
  const h = await db.mpHisob.findUnique({
    where: { id },
    select: {
      id: true, telefon: true, ism: true, tasdiqlangan: true, faol: true, yaratilgan: true, yangilangan: true,
      manzillar: {
        select: { id: true, nomi: true, viloyat: true, tuman: true, manzil: true, moljal: true, lat: true, lng: true, asosiy: true },
        orderBy: [{ asosiy: 'desc' }, { id: 'asc' }],
      },
      buyurtmalar: { select: TAFSILOT, orderBy: { yaratilgan: 'desc' }, take: 200 },
      _count: { select: { buyurtmalar: true } },
    },
  })
  if (!h) return null
  const buyurtmalar = h.buyurtmalar.map(tekis)
  return {
    id: h.id, telefon: h.telefon, ism: h.ism, tasdiqlangan: h.tasdiqlangan, faol: h.faol,
    yaratilgan: h.yaratilgan, yangilangan: h.yangilangan,
    manzillar: h.manzillar,
    buyurtmalar,
    /** 200 tadan ko'p bo'lsa — ro'yxat qisqartirilgan */
    jamiBuyurtma: h._count.buyurtmalar,
    xulosa: mijozXulosasi(buyurtmalar),
  }
}
