import 'dotenv/config'
import path from 'node:path'
import { defineConfig } from 'prisma/config'

// Prisma 7: ulanish manzili sxemada emas, shu yerda.
//
// CLI (migrate, studio) POOLER'ni emas, to'g'ridan-to'g'ri ulanishni
// ishlatadi. Sabab: migratsiya sessiyada `search_path` o'rnatadi va
// Neon pooler'i (PgBouncer, tranzaksiya rejimi) uni ulanishlar orasida
// tarqatadi — natijada ERP ning xom SQL so'rovlari vaqti-vaqti bilan
// «relation does not exist» bilan yiqilgan. Ish vaqtidagi ilova esa
// `src/lib/db.ts` da pooler'dan foydalanadi.
const url = process.env.DIRECT_DATABASE_URL
if (!url) {
  throw new Error(
    'DIRECT_DATABASE_URL yo‘q. Migratsiya pooler orqali o‘tmasligi kerak — ' +
    '.env.example ga qarang.',
  )
}
if (url.includes('-pooler.')) {
  throw new Error('DIRECT_DATABASE_URL pooler manzili bo‘lmasligi kerak (host da "-pooler" bor).')
}

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: { path: path.join('prisma', 'migrations') },
  datasource: { url },
})
