// Saytni Vercel'ga joylash — bitta buyruq bilan.
//
//   npm run joyla            # ishlab chiqarishga (production)
//   npm run joyla -- --sinov # sinov (preview) deploy
//
// Nega kerak: Vercel odatda GitHub'dagi har push'ni o'zi deploy qiladi.
// Loyiha repoga ulanmagan bo'lsa (2026-09 da shunday bo'lgan — sayt bir
// hafta eski deployda qolgan), push hech narsani o'zgartirmaydi. Bu skript
// o'sha ulanishga bog'liq emas: kodni shu papkadan to'g'ridan-to'g'ri
// yuboradi va muhit o'zgaruvchilari joyidami — oldindan tekshiradi.
//
// Birinchi marta: `npx vercel login` (bir marta) va loyihaga ulanish
// (`npx vercel link`) — skript ularni o'zi so'raydi.
import { execFileSync, execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ILDIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const rang = {
  ok: (s) => `\u001b[32m${s}\u001b[0m`,
  x: (s) => `\u001b[31m${s}\u001b[0m`,
  s: (s) => `\u001b[33m${s}\u001b[0m`,
  xira: (s) => `\u001b[90m${s}\u001b[0m`,
}
const ok = (s) => console.log(`  ${rang.ok('✓')} ${s}`)
const ogoh = (s) => console.log(`  ${rang.s('!')} ${s}`)
const toxta = (s) => {
  console.error(`\n  ${rang.x('✗')} ${s}\n`)
  process.exit(1)
}

/**
 * Vercel CLI — o'rnatilmagan bo'lsa npx o'zi yuklab oladi.
 * `nimaUchun` berilsa, xato yuz berganda o'sha izoh bilan to'xtaydi
 * (Node'ning stek izi o'rniga — bu skriptni terminal'da odam o'qiydi).
 */
function vercel(argv, { tinch = false, nimaUchun } = {}) {
  try {
    return execFileSync('npx', ['--yes', 'vercel@latest', ...argv], {
      cwd: ILDIZ,
      encoding: 'utf8',
      stdio: tinch ? 'pipe' : 'inherit',
      shell: true,
    })
  } catch (e) {
    if (!nimaUchun) throw e
    toxta(`${nimaUchun}\n    Ko‘p uchraydigan sabab: hisobga kirilmagan — ${rang.s('npx vercel login')}`)
  }
}

const ishlabChiqarish = !process.argv.includes('--sinov')
console.log(`\n  BioMax Marketplace → Vercel (${ishlabChiqarish ? 'ishlab chiqarish' : 'sinov'})\n`)

// ── 1. Kod holati ────────────────────────────────────────────────────
try {
  const ozgargan = execSync('git status --porcelain', { cwd: ILDIZ, encoding: 'utf8' }).trim()
  if (ozgargan) ogoh(`saqlanmagan o‘zgarishlar bor (${ozgargan.split('\n').length} fayl) — ular ham joylanadi`)
  else ok('ishchi daraxt toza')
} catch {
  ogoh('git holati o‘qilmadi')
}

// ── 2. Muhit o'zgaruvchilari ─────────────────────────────────────────
// Vercel'dagilar tekshiriladi: yetishmasa sayt birinchi so'rovdayoq 500 beradi.
const KERAK = ['DATABASE_URL', 'SESSION_SECRET', 'ERP_HMAC_SECRET', 'PROKSI_ORQALI']
let ulangan = existsSync(path.join(ILDIZ, '.vercel', 'project.json'))
if (!ulangan) {
  ogoh('loyiha Vercel bilan bog‘lanmagan — hozir bog‘laymiz (mavjud loyihani tanlang)')
  vercel(['link'], { nimaUchun: 'Loyihani Vercel bilan bog‘lab bo‘lmadi.' })
  ulangan = existsSync(path.join(ILDIZ, '.vercel', 'project.json'))
  if (!ulangan) toxta('bog‘lanmadi. `npx vercel login` qilib, qaytadan urinib ko‘ring.')
}
ok('loyiha Vercel bilan bog‘langan')

let royxat = ''
try {
  royxat = vercel(['env', 'ls', ishlabChiqarish ? 'production' : 'preview'], { tinch: true })
} catch {
  toxta('Vercel bilan gaplashib bo‘lmadi. Avval: npx vercel login')
}
const yoq = KERAK.filter((k) => !new RegExp(`(^|\\s)${k}(\\s|$)`, 'm').test(royxat))
if (yoq.length) {
  console.log(`\n  ${rang.x('✗')} Vercel'da quyidagilar yo‘q: ${yoq.join(', ')}`)
  console.log(`    ${rang.xira('Qo‘shish: npx vercel env add <NOM> ' + (ishlabChiqarish ? 'production' : 'preview'))}`)
  console.log(`    ${rang.xira('Qiymatlar — shu papkadagi .env faylida.')}\n`)
  process.exit(1)
}
ok(`muhit o‘zgaruvchilari joyida (${KERAK.length} ta)`)

// ── 3. Deploy ────────────────────────────────────────────────────────
console.log('')
vercel(ishlabChiqarish ? ['deploy', '--prod'] : ['deploy'])

// ── 4. Tekshirish ────────────────────────────────────────────────────
const manzil = (() => {
  try {
    const env = readFileSync(path.join(ILDIZ, '.env'), 'utf8').match(/^SAYT_URL="?([^"\r\n]+)/m)
    return (env?.[1] ?? 'https://www.biomaxmarketplace.store').replace(/\/$/, '')
  } catch {
    return 'https://www.biomaxmarketplace.store'
  }
})()

if (ishlabChiqarish) {
  console.log(`\n  Tekshirilmoqda: ${manzil}/api/salomatlik`)
  try {
    const j = await fetch(`${manzil}/api/salomatlik`, { cache: 'no-store' }).then((r) => r.json())
    const v = j.versiya?.commit ? ` (${j.versiya.commit})` : ''
    if (j.holat === 'ishlayapti') ok(`sayt ishlayapti${v} — katalogda ${j.erp?.tovarlar ?? '?'} mahsulot`)
    else {
      ogoh(`holat: ${j.holat}${v}`)
      if (j.erp?.izoh) console.log(`    ${rang.xira(j.erp.izoh)}`)
      if (!j.baza?.ok) console.log(`    ${rang.xira('Bazaga ulanib bo‘lmadi — DATABASE_URL ni tekshiring')}`)
    }
  } catch {
    ogoh('salomatlik javob bermadi — domen hali yangi deployga o‘tmagan bo‘lishi mumkin')
  }
}
console.log('')
