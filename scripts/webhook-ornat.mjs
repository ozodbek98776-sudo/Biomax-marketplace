// Telegram webhook'ini ro'yxatdan o'tkazish (bir marta, deploydan keyin).
//
//   node scripts/webhook-ornat.mjs                       # .env dagi SAYT_URL ga
//   node scripts/webhook-ornat.mjs https://sayt.example  # boshqa manzilga
//   node scripts/webhook-ornat.mjs --holat               # faqat holatni ko'rsatadi
//
// Maxfiy kalit bot tokenidan hosil qilinadi (`api/telegram/webhook` da ham
// aynan shunday) — Telegram har so'rovda uni sarlavhada qaytaradi va
// begona odam soxta xabar yubora olmaydi.
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

function envOqi(yol = '.env') {
  try {
    const matn = readFileSync(yol, 'utf8')
    const qiymatlar = {}
    for (const qator of matn.split(/\r?\n/)) {
      const m = qator.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/)
      if (m) qiymatlar[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
    }
    return qiymatlar
  } catch {
    return {}
  }
}

const env = { ...envOqi(), ...process.env }
const token = env.TELEGRAM_BOT_TOKEN
if (!token) {
  console.error('TELEGRAM_BOT_TOKEN topilmadi (.env yoki muhit o‘zgaruvchisi).')
  process.exit(1)
}

const kalit = createHash('sha256').update(`webhook:${token}`).digest('hex').slice(0, 48)
const tg = (usul, tana) =>
  fetch(`https://api.telegram.org/bot${token}/${usul}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tana ?? {}),
  }).then(r => r.json())

const argv = process.argv.slice(2)
if (argv.includes('--holat')) {
  const info = await tg('getWebhookInfo')
  console.log(JSON.stringify(info.result ?? info, null, 2))
  process.exit(0)
}

const asos = (argv[0] || env.SAYT_URL || '').replace(/\/$/, '')
if (!/^https:\/\//.test(asos)) {
  console.error('Manzil HTTPS bo‘lishi kerak (Telegram boshqasini qabul qilmaydi). SAYT_URL ni tekshiring.')
  process.exit(1)
}

const url = `${asos}/api/telegram/webhook`
const natija = await tg('setWebhook', { url, secret_token: kalit, drop_pending_updates: true })
if (!natija.ok) {
  console.error('Xato:', natija.description)
  process.exit(1)
}

const info = await tg('getWebhookInfo')
console.log(`Webhook o‘rnatildi: ${url}`)
console.log(JSON.stringify(info.result ?? info, null, 2))
