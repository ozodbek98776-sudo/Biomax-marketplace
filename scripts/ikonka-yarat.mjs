// SVG belgidan PWA uchun PNG ikonkalar yasaydi.
//
// Ishlatish:  node scripts/ikonka-yarat.mjs
// Manba:      public/ikonka/ikonka.svg va ikonka-maskable.svg
// Natija:     public/ikonka/ikonka-{192,512}.png, ikonka-maskable-512.png,
//             apple-touch-icon.png (180)
//
// Chizishni brauzerning o'zi bajaradi (Playwright) — qo'shimcha rasm
// kutubxonasi kerak emas. Playwright ERP loyihasida o'rnatilgan.
import { readFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ILDIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const IKONKA = join(ILDIZ, 'public', 'ikonka')
const PLAYWRIGHT = process.env.PLAYWRIGHT_YOLI
  ?? 'C:/Users/Ozodbek/Desktop/konstovar/konstovar/node_modules/playwright/index.mjs'

const { chromium } = await import(pathToFileURL(PLAYWRIGHT).href).catch(() => {
  console.error('Playwright topilmadi. PLAYWRIGHT_YOLI bilan yo‘lini ko‘rsating.')
  process.exit(1)
})

const ISHLAR = [
  { manba: 'ikonka.svg', chiqish: 'ikonka-192.png', olcham: 192 },
  { manba: 'ikonka.svg', chiqish: 'ikonka-512.png', olcham: 512 },
  { manba: 'ikonka.svg', chiqish: 'apple-touch-icon.png', olcham: 180 },
  { manba: 'ikonka-maskable.svg', chiqish: 'ikonka-maskable-512.png', olcham: 512 },
]

mkdirSync(IKONKA, { recursive: true })
const brauzer = await chromium.launch()
try {
  for (const ish of ISHLAR) {
    const svg = readFileSync(join(IKONKA, ish.manba), 'utf8')
    const sahifa = await brauzer.newPage({ viewport: { width: ish.olcham, height: ish.olcham } })
    await sahifa.setContent(
      `<!doctype html><style>html,body{margin:0;padding:0}svg{display:block;width:${ish.olcham}px;height:${ish.olcham}px}</style>${svg}`,
      { waitUntil: 'load' },
    )
    await sahifa.locator('svg').screenshot({ path: join(IKONKA, ish.chiqish), omitBackground: true })
    await sahifa.close()
    console.log(`✓ ${ish.chiqish} (${ish.olcham}×${ish.olcham})`)
  }
} finally {
  await brauzer.close()
}
