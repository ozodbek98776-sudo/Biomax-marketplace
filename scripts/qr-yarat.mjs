// Ilovani o'rnatish sahifasiga olib boradigan QR kod va chop etiladigan plakat.
//
// Ishlatish:
//   node scripts/qr-yarat.mjs
//   node scripts/qr-yarat.mjs --manzil https://biomaxmarketplace.store/ilova
//
// Natija (hujjatlar/qr/):
//   qr-ilova.svg / .png   — QR kodning o'zi (markazida do'kon belgisi)
//   qr-plakat.svg / .png  — A5 plakat: sarlavha, QR, uch qadam, manzil
//
// Nega markazda belgi bo'lishi mumkin: QR "H" darajasida yaratiladi —
// kodning 30% i shikastlansa ham o'qiladi, markazdagi belgi esa 15% dan
// kamini yopadi.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import QRCode from 'qrcode'

const ILDIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PLAYWRIGHT = process.env.PLAYWRIGHT_YOLI
  ?? 'C:/Users/Ozodbek/Desktop/konstovar/konstovar/node_modules/playwright/index.mjs'

const arg = (nom, standart) => {
  const i = process.argv.indexOf(`--${nom}`)
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : standart
}

const MANZIL = arg('manzil', 'https://biomaxmarketplace.store/ilova?manba=qr')
const CHIQISH = resolve(ILDIZ, arg('chiqish', 'hujjatlar/qr'))
const DOKON = arg('dokon', 'BioMax')
/** Plakatda ko'rinadigan qisqa manzil — mijoz qo'lda ham yoza olsin. */
const KORINADIGAN = arg('korinadigan', new URL(MANZIL).host + new URL(MANZIL).pathname)

const QIZIL = '#C62828'
const SIYOH = '#1A1413'
const QOGOZ = '#FBF9F8'

// ─── Shrift (plakat matni brendga mos chiqsin) ──────────────────────────────
function shriftlar() {
  const fayl = t => {
    try {
      const b = readFileSync(join(ILDIZ, 'node_modules', '@fontsource', 'onest', 'files', `onest-${t}-normal.woff2`))
      return b.toString('base64')
    } catch {
      return null
    }
  }
  const qismlar = [
    ['latin-800', 800], ['latin-ext-800', 800], ['latin-700', 700], ['latin-ext-700', 700],
  ]
  const qoidalar = qismlar
    .map(([t, ogirlik]) => {
      const b64 = fayl(t)
      return b64
        ? `@font-face{font-family:'Onest';font-style:normal;font-weight:${ogirlik};src:url(data:font/woff2;base64,${b64}) format('woff2');}`
        : ''
    })
    .filter(Boolean)
    .join('')
  return qoidalar
}

// ─── QR ─────────────────────────────────────────────────────────────────────
/** `qrcode` kutubxonasi bergan SVG'dan faqat nuqtalar yo'lini ajratib olamiz. */
async function qrYoli(manzil) {
  const svg = await QRCode.toString(manzil, { type: 'svg', errorCorrectionLevel: 'H', margin: 0 })
  const yol = svg.match(/<path[^>]*d="([^"]+)"[^>]*stroke="[^"]*"/)?.[1] ?? svg.match(/ d="([^"]+)"/g)?.pop()?.slice(4, -1)
  const olcham = Number(svg.match(/viewBox="0 0 (\d+)/)?.[1] ?? 0)
  if (!yol || !olcham) throw new Error('QR yo‘li o‘qilmadi')
  return { yol, olcham }
}

function qrSvg({ yol, olcham }, { tomon = 1024, belgiBilan = true } = {}) {
  const chet = 2 // "sokin zona" — QR atrofida bo'sh joy (modul hisobida)
  const jami = olcham + chet * 2
  const belgi = olcham * 0.22
  const belgiX = (jami - belgi) / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${tomon}" height="${tomon}" viewBox="0 0 ${jami} ${jami}" role="img" aria-label="${DOKON} ilovasi — QR kod">
  <rect width="${jami}" height="${jami}" fill="#FFFFFF"/>
  <g transform="translate(${chet} ${chet})" fill="none" stroke="${SIYOH}" stroke-width="1" shape-rendering="crispEdges">
    <path d="${yol}"/>
  </g>
  ${belgiBilan ? `<g transform="translate(${belgiX} ${belgiX})">
    <rect width="${belgi}" height="${belgi}" rx="${belgi * 0.22}" fill="#FFFFFF"/>
    <g transform="translate(${belgi * 0.08} ${belgi * 0.08}) scale(${(belgi * 0.84) / 512})">
      <rect width="512" height="512" rx="112" fill="${QIZIL}"/>
      <path d="M188 204v-24a68 68 0 0 1 136 0v24" fill="none" stroke="#FFFFFF" stroke-width="26" stroke-linecap="round"/>
      <path d="M120 200h272a26 26 0 0 1 25.9 28.7l-17.6 168A48 48 0 0 1 352.6 440H159.4a48 48 0 0 1-47.7-43.3l-17.6-168A26 26 0 0 1 120 200z" fill="#FFFFFF"/>
      <path d="M256 262c44 38 44 98 0 136-44-38-44-98 0-136z" fill="${QIZIL}"/>
      <path d="M256 276v108" fill="none" stroke="#FFFFFF" stroke-width="10" stroke-linecap="round"/>
    </g>
  </g>` : ''}
  <desc>${manziliXavfsiz(MANZIL)}</desc>
</svg>`
}

const manziliXavfsiz = m => String(m).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// ─── Plakat (A5, 148×210 mm) ────────────────────────────────────────────────
function plakatSvg(qr) {
  const W = 1748 // 148 mm @ 300 dpi
  const H = 2480 // 210 mm @ 300 dpi
  const qrTomon = 900
  const qrX = (W - qrTomon) / 2
  const qadamlar = [
    ['1', 'Telefon kamerasini QR kodga tuting'],
    ['2', 'Chiqqan havolani oching'],
    ['3', '«Ilovani o‘rnatish» tugmasini bosing'],
  ]
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${DOKON} ilovasi plakati">
  <style>${shriftlar()}
    text{font-family:'Onest',Arial,Helvetica,sans-serif;fill:${SIYOH}}
    .sarlavha{font-size:112px;font-weight:800;letter-spacing:-3px}
    .ost{font-size:46px;font-weight:700;fill:#5B5350}
    .qadam{font-size:40px;font-weight:700}
    .raqam{font-size:36px;font-weight:800;fill:#FFFFFF}
    .manzil{font-size:44px;font-weight:800;fill:${QIZIL};letter-spacing:1px}
    .izoh{font-size:32px;font-weight:700;fill:#8A817D}
  </style>
  <rect width="${W}" height="${H}" fill="${QOGOZ}"/>
  <rect x="0" y="0" width="${W}" height="26" fill="${QIZIL}"/>

  <g transform="translate(${W / 2} 250)" text-anchor="middle">
    <text class="sarlavha" y="0">Bio<tspan fill="${QIZIL}">Max</tspan></text>
    <text class="ost" y="86">onlayn do‘kon</text>
  </g>

  <g transform="translate(${W / 2} 470)" text-anchor="middle">
    <text class="sarlavha" style="font-size:74px" y="0">Ilovani telefoningizga</text>
    <text class="sarlavha" style="font-size:74px" y="92">o‘rnatib oling</text>
  </g>

  <g transform="translate(${qrX} 640)">
    <rect x="-28" y="-28" width="${qrTomon + 56}" height="${qrTomon + 56}" rx="48" fill="#FFFFFF" stroke="#E7E1DE" stroke-width="4"/>
    ${qrSvg(qr, { tomon: qrTomon }).replace('<svg ', '<svg x="0" y="0" ')}
  </g>

  <g transform="translate(${W / 2} ${640 + qrTomon + 130})" text-anchor="middle">
    <text class="manzil" y="0">${manziliXavfsiz(KORINADIGAN)}</text>
  </g>

  <g transform="translate(220 ${640 + qrTomon + 250})">
    ${qadamlar.map(([n, matn], i) => `<g transform="translate(0 ${i * 118})">
      <circle cx="34" cy="26" r="34" fill="${QIZIL}"/>
      <text class="raqam" x="34" y="39" text-anchor="middle">${n}</text>
      <text class="qadam" x="94" y="40">${matn}</text>
    </g>`).join('\n    ')}
  </g>

  <g transform="translate(${W / 2} ${H - 120})" text-anchor="middle">
    <text class="izoh" y="0">Play Market yoki App Store kerak emas — bir necha soniya vaqt oladi</text>
  </g>
  <rect x="0" y="${H - 26}" width="${W}" height="26" fill="${QIZIL}"/>
</svg>`
}

// ─── SVG → PNG (brauzer orqali) ─────────────────────────────────────────────
async function pngYoz(svg, yol, en, boy) {
  const { chromium } = await import(pathToFileURL(PLAYWRIGHT).href)
  const brauzer = await chromium.launch()
  try {
    const sahifa = await brauzer.newPage({ viewport: { width: en, height: boy } })
    await sahifa.setContent(`<!doctype html><style>html,body{margin:0;padding:0}svg{display:block}</style>${svg}`, { waitUntil: 'load' })
    await sahifa.locator('svg').first().screenshot({ path: yol })
  } finally {
    await brauzer.close()
  }
}

// ─── Ishga tushirish ────────────────────────────────────────────────────────
mkdirSync(CHIQISH, { recursive: true })
const qr = await qrYoli(MANZIL)

const qrFayl = qrSvg(qr, { tomon: 1024 })
writeFileSync(join(CHIQISH, 'qr-ilova.svg'), qrFayl, 'utf8')
await pngYoz(qrFayl, join(CHIQISH, 'qr-ilova.png'), 1024, 1024)

const plakat = plakatSvg(qr)
writeFileSync(join(CHIQISH, 'qr-plakat.svg'), plakat, 'utf8')
await pngYoz(plakat, join(CHIQISH, 'qr-plakat.png'), 1748, 2480)

writeFileSync(join(CHIQISH, 'MANZIL.txt'), `${MANZIL}\n`, 'utf8')
console.log(`QR manzili: ${MANZIL}`)
console.log(`Fayllar: ${CHIQISH}`)
