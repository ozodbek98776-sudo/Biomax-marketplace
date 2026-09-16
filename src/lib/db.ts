import 'server-only'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { sozlama, ishlabChiqarish } from '@/lib/sozlama'

// Prisma mijozi — bitta nusxa.
//
// Rivojlanishda Next har o'zgarishda modulni qayta yuklaydi. Global'da
// saqlamasak har qayta yuklashda yangi ulanishlar hovuzi ochilib,
// bir necha daqiqada baza "too many connections" bilan yiqiladi.

const global_ = globalThis as unknown as { prisma?: PrismaClient; pool?: Pool }

/*
 * Marketplace jadvallari ALOHIDA `marketplace` PostgreSQL sxemasida.
 * Sxema Prisma sxemasida (`multiSchema` + `@@schema`) e'lon qilingan,
 * shuning uchun so'rovlar to'liq nom bilan yoziladi va `search_path` ga
 * tayanmaydi — Neon pooler'i uni baribir qabul qilmaydi.
 */
const pool = global_.pool ?? new Pool({
  connectionString: sozlama.DATABASE_URL,
  // Ommaviy sayt — ko'p qisqa so'rov. Hovuz kichik, lekin bo'sh ulanish
  // tez yopiladi, aks holda Neon ularni o'zi uzib, xato beradi.
  max: 10,
  idleTimeoutMillis: 20_000,
  connectionTimeoutMillis: 10_000,
})

export const db = global_.prisma ?? new PrismaClient({
  adapter: new PrismaPg(pool),
  log: ishlabChiqarish ? ['error'] : ['error', 'warn'],
})

if (!ishlabChiqarish) {
  global_.prisma = db
  global_.pool = pool
}
