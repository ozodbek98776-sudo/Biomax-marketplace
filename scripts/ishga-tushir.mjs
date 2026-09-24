#!/usr/bin/env node
// BioMax — ERP va Marketplace'ni BIRGA ishga tushirish.
//
//   npm run ishga
//
// Nega alohida skript: marketplace ERP'siz ishlamaydi (katalog shartnoma
// API orqali keladi). Ikkalasini qo'lda, ikki terminalda ko'tarish —
// eng ko'p uchraydigan xato manbai: biri eskirgan, biri boshqa portda,
// yoki HMAC kalitlari mos emas va katalog jimgina bo'sh chiqadi.
// Bu skript ishga tushirishdan OLDIN hammasini tekshiradi.

import { spawn, execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { createServer } from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const MP_PAPKA = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ERP_PAPKA = path.resolve(MP_PAPKA, process.env.ERP_PAPKA ?? '../konstovar/konstovar')
const ERP_PORT = 3001
const MP_PORT = 3002
const KUTISH_MS = 180_000

const rang = {
  q: s => `\x1b[31m${s}\x1b[0m`, y: s => `\x1b[32m${s}\x1b[0m`,
  s: s => `\x1b[33m${s}\x1b[0m`, x: s => `\x1b[90m${s}\x1b[0m`, b: s => `\x1b[1m${s}\x1b[0m`,
}

const bolalar = []
let tugatilmoqda = false

/** Ishga tushgan serverlarni o'chiradi. */
function serverlarniOchir() {
  for (const b of bolalar) {
    if (b.exitCode !== null) continue
    // Windows'da `kill` faqat asosiy jarayonni o'ldiradi, Next ishchilari
    // esa yetim qolib portni band qiladi — butun daraxt o'chiriladi.
    if (process.platform === 'win32') {
      try { execSync(`taskkill /pid ${b.pid} /T /F`, { stdio: 'ignore' }) } catch { /* allaqachon yo'q */ }
    } else {
      b.kill('SIGTERM')
    }
  }
}

const ok = m => console.log(`  ${rang.y('✓')} ${m}`)

/**
 * Xato bilan chiqish. Ishga tushgan serverlar ham o'chiriladi — aks holda
 * ular yetim bo'lib portni band qilib qoladi va keyingi urinish ham yiqiladi.
 */
function toxta(m) {
  tugatilmoqda = true
  console.error(`\n  ${rang.q('✗')} ${m}\n`)
  serverlarniOchir()
  process.exit(1)
}

/** `.env` faylini o'qiydi — `dotenv` ga bog'liq bo'lmaslik uchun oddiy tahlil. */
function envOqi(fayl) {
  if (!existsSync(fayl)) return null
  const q = {}
  for (const satr of readFileSync(fayl, 'utf8').split(/\r?\n/)) {
    const m = satr.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/)
    if (m) q[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return q
}

function portBoshmi(port) {
  return new Promise(hal => {
    const s = createServer()
    s.once('error', () => hal(false))
    s.once('listening', () => s.close(() => hal(true)))
    s.listen(port, '0.0.0.0')
  })
}

async function kut(url, nomi) {
  const oxir = Date.now() + KUTISH_MS
  let ketma404 = 0
  while (Date.now() < oxir) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(15_000) })
      if (r.ok) return r
      // Server javob beryapti, lekin marshrut yo'q — bu "hali ko'tarilmadi"
      // emas, sozlash xatosi. 180 soniya kutish befoyda.
      ketma404 = r.status === 404 ? ketma404 + 1 : 0
      if (ketma404 >= 5) {
        toxta(`${nomi} ishlayapti, lekin ${new URL(url).pathname} topilmadi (404). ` +
          'Odatda noto‘g‘ri loyiha papkasi yoki eskirgan .next keshi.')
      }
    } catch { /* hali ko'tarilmagan */ }
    await new Promise(r => setTimeout(r, 2000))
  }
  toxta(`${nomi} ${KUTISH_MS / 1000} soniyada javob bermadi — yuqoridagi jurnalga qarang`)
}

/**
 * Bola jarayon uchun TOZA muhit.
 *
 * `npm run ishga` PATH boshiga marketplace'ning `node_modules/.bin` ni
 * qo'shadi. Uni meros qilib olsa, ERP papkasida `next` MARKETPLACE'niki
 * bo'lib ishga tushadi va ERP marshrutlarini topmaydi — `/api/auth/*`
 * 404 qaytaradi (2026-09-13 da aynan shunday bo'ldi).
 */
function tozaMuhit() {
  const env = { ...process.env, FORCE_COLOR: '1' }
  for (const k of Object.keys(env)) {
    if (k.toLowerCase().startsWith('npm_') || k === 'INIT_CWD') delete env[k]
  }
  const pathKalit = Object.keys(env).find(k => k.toLowerCase() === 'path')
  if (pathKalit) {
    env[pathKalit] = env[pathKalit]
      .split(path.delimiter)
      .filter(q => !/[\\/]node_modules[\\/]\.bin$/i.test(q))
      .join(path.delimiter)
  }
  return env
}

// ─── 1. Oldindan tekshiruv ────────────────────────────────────────────
console.log(rang.b('\nBioMax — ishga tushirish\n'))

if (!existsSync(path.join(ERP_PAPKA, 'package.json'))) {
  toxta(`ERP topilmadi: ${ERP_PAPKA}\n    Boshqa joyda bo'lsa: ERP_PAPKA=<yo'l> npm run ishga`)
}
ok(`ERP papkasi: ${rang.x(ERP_PAPKA)}`)

const mpEnv = envOqi(path.join(MP_PAPKA, '.env'))
if (!mpEnv) toxta('Marketplace .env yo‘q — .env.example dan nusxa oling')
for (const k of ['DATABASE_URL', 'DIRECT_DATABASE_URL', 'ERP_HMAC_SECRET', 'SESSION_SECRET']) {
  if (!mpEnv[k]) toxta(`Marketplace .env da ${k} yo‘q`)
}
// Migratsiya pooler orqali o'tsa ERP buziladi (prisma.config.ts ga qarang)
if (mpEnv.DIRECT_DATABASE_URL.includes('-pooler.')) {
  toxta('DIRECT_DATABASE_URL pooler manzili — migratsiya ERP ni buzadi. Host dan "-pooler" ni olib tashlang.')
}
ok('Marketplace sozlamalari to‘liq (migratsiya — to‘g‘ridan-to‘g‘ri ulanish)')

const erpEnv = { ...envOqi(path.join(ERP_PAPKA, '.env')), ...envOqi(path.join(ERP_PAPKA, '.env.local')) }
if (!erpEnv.MP_HMAC_SECRET) toxta('ERP .env da MP_HMAC_SECRET yo‘q — ERP buyurtmalar panelini ocha olmaydi')
// Eng ayyor xato: kalitlar mos emas bo'lsa hech narsa yiqilmaydi —
// ERP paneli buyurtmalarni "yuklanmadi" deb ko'rsataveradi.
if (erpEnv.MP_HMAC_SECRET !== mpEnv.ERP_HMAC_SECRET) {
  toxta('HMAC kalitlari MOS EMAS: ERP MP_HMAC_SECRET ≠ marketplace ERP_HMAC_SECRET')
}
ok('HMAC kalitlari ikkala tomonda bir xil')

for (const [port, nomi] of [[ERP_PORT, 'ERP'], [MP_PORT, 'Marketplace']]) {
  if (!(await portBoshmi(port))) {
    toxta(`${port}-port band (${nomi}). Eski server ishlayapti — uni to‘xtating va qayta urinib ko‘ring.`)
  }
}
ok(`Portlar bo‘sh: ${ERP_PORT}, ${MP_PORT}`)

// ─── 2. Migratsiyalar ─────────────────────────────────────────────────
// Neon bo'sh turganda hisoblash uxlaydi va to'g'ridan-to'g'ri ulanish
// birinchi urinishda P1001 ("server yetib bo'lmadi") berishi mumkin — u
// uyg'onguncha bir necha soniya kerak. Faqat SHU vaqtinchalik xato qayta
// uriniladi; boshqa xato (masalan buzilgan migratsiya) darhol to'xtatadi.
for (let urinish = 1; ; urinish++) {
  try {
    execSync('npx prisma migrate deploy', { cwd: MP_PAPKA, stdio: 'pipe' })
    ok('Marketplace migratsiyalari qo‘llangan')
    break
  } catch (e) {
    const matn = `${String(e.stdout ?? '')}${String(e.stderr ?? '')}`
    if (/P1001|P1002|timed out|Can't reach/i.test(matn) && urinish < 4) {
      console.log(`  ${rang.s('…')} baza uyg‘onmoqda, qayta urinish (${urinish}/3)`)
      await new Promise(r => setTimeout(r, 5000))
      continue
    }
    toxta(`Migratsiya muvaffaqiyatsiz:\n${matn}`)
  }
}

// ─── 3. Serverlar ─────────────────────────────────────────────────────
// Neon'ning SSL rejimi haqidagi ogohlantirishi har ulanishda chiqadi va
// haqiqiy xatolarni ko'mib yuboradi — faqat shu matn yashiriladi.
const SHOVQIN = /SECURITY WARNING|sslmode|libpq|uselibpqcompat|pg-connection-string|trace-warnings|To prepare for this change|^\s*$/

function ishga(nomi, papka, port, belgi) {
  // `npx` ga ishonmaymiz — har loyiha AYNAN o'z `next` binari bilan.
  const bin = path.join(papka, 'node_modules', 'next', 'dist', 'bin', 'next')
  if (!existsSync(bin)) toxta(`${nomi}: next o‘rnatilmagan — ${papka} da npm install bajaring`)

  const b = spawn(process.execPath, [bin, 'dev', '-p', String(port)], {
    cwd: papka, env: tozaMuhit(),
  })
  const yoz = oqim => chunk => {
    for (const satr of String(chunk).split(/\r?\n/)) {
      if (!SHOVQIN.test(satr)) oqim.write(`${belgi} ${satr}\n`)
    }
  }
  b.stdout.on('data', yoz(process.stdout))
  b.stderr.on('data', yoz(process.stderr))
  b.on('exit', kod => {
    if (!tugatilmoqda) toxta(`${nomi} kutilmaganda to‘xtadi (kod ${kod})`)
  })
  bolalar.push(b)
}

function tugat() {
  if (tugatilmoqda) return
  tugatilmoqda = true
  console.log(rang.x('\n  Serverlar to‘xtatilmoqda…'))
  serverlarniOchir()
  process.exit(0)
}
process.on('SIGINT', tugat)
process.on('SIGTERM', tugat)

console.log('')
ishga('ERP', ERP_PAPKA, ERP_PORT, rang.x('[erp]'))
ishga('Marketplace', MP_PAPKA, MP_PORT, rang.q('[mp] '))

await kut(`http://localhost:${ERP_PORT}/api/auth/csrf`, 'ERP')
const salomatlik = await kut(`http://localhost:${MP_PORT}/api/salomatlik`, 'Marketplace')
const s = await salomatlik.json()

console.log(rang.b('\n  BioMax ishlayapti\n'))
console.log(`  Vitrina (xaridor)   ${rang.y(`http://localhost:${MP_PORT}`)}`)
console.log(`  ERP (do‘kon)        ${rang.y(`http://localhost:${ERP_PORT}`)}`)
console.log(`  Salomatlik          ${rang.x(`http://localhost:${MP_PORT}/api/salomatlik`)}`)
console.log(rang.x(`\n  baza ${s.baza.ms}ms · ERP shartnomasi ${s.erp.ms}ms`))
console.log(rang.x('  To‘xtatish: Ctrl+C\n'))
