// Vitrinani ERP mahsulotlari bilan to'ldirish.
//
// Har bir FAOL va qulflanmagan tovarga bittadan `MpElon` yaratadi.
// Narx va mavjudlik BU YERDA saqlanmaydi — ular har doim ERP'dan jonli
// olinadi, aks holda vitrinada eskirgan narx turib qolardi.
//
// Ishga tushirish:  npx tsx prisma/vitrina-toldirish.ts
import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// Prisma uchun `marketplace` sxemasi; xom so'rovlar esa to'liq nom
// (`public.tovarlar`) ishlatadi va ular `search_path` ga bog'liq emas.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})
const db = new PrismaClient({ adapter: new PrismaPg(pool) })

/** Nomdan SEO manzili yasaydi: "Ariel 6 kg" -> "ariel-6-kg" */
function slugla(nomi: string): string {
  return nomi
    .toLowerCase()
    // O'zbek lotinidagi apostroflar manzilda kerak emas
    .replace(/['‘’`]/g, '')
    .replace(/[^a-z0-9Ѐ-ӿ]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'mahsulot'
}

async function main() {
  // ERP jadvallari `public` sxemasida — bu SKRIPT ularni o'qiydi, lekin
  // ILOVA hech qachon o'qimaydi (u faqat shartnoma API orqali ishlaydi).
  const { rows } = await pool.query<{ id: string; nomi: string }>(`
    select t.id, t.nomi
    from public.tovarlar t
    where t.holati = 'FAOL' and t.qulflangan = false
    order by t.nomi
  `)
  console.log(`ERP'da mos tovar: ${rows.length}`)

  const band = new Set(
    (await db.mpElon.findMany({ select: { slug: true } })).map(e => e.slug),
  )

  let yangi = 0
  let mavjud = 0
  for (const t of rows) {
    const bor = await db.mpElon.findUnique({ where: { erpTovarId: t.id } })
    if (bor) { mavjud++; continue }

    // Slug yagona bo'lishi shart — bir xil nomli ikki tovar bo'lsa
    // raqam qo'shiladi.
    let slug = slugla(t.nomi)
    let n = 2
    while (band.has(slug)) slug = `${slugla(t.nomi)}-${n++}`
    band.add(slug)

    await db.mpElon.create({
      data: { erpTovarId: t.id, slug, faol: true, tartib: 0 },
    })
    yangi++
  }

  console.log(`yangi e'lon: ${yangi}, allaqachon bor: ${mavjud}`)
  console.log(`vitrinada jami: ${await db.mpElon.count({ where: { faol: true } })}`)
}

main()
  .catch(e => { console.error(e); process.exitCode = 1 })
  .finally(async () => { await db.$disconnect(); await pool.end() })
