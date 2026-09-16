// O'zbekiston telefon raqamlari — sof mantiq.
//
// Raqam hisobning YAGONA identifikatori, shuning uchun bir raqam har doim
// bitta ko'rinishga keltiriladi. Aks holda "+998 90 123 45 67" va
// "901234567" ikki xil hisob ochib yuborardi.

/** Kanonik ko'rinish: `+998901234567` */
export type Telefon = string & { readonly __telefon: unique symbol }

/**
 * Mobil operator kodlari (998 dan keyingi ikki raqam).
 * Ro'yxatda yo'q kodga SMS yuborish pul va vaqt isrofi — oldindan rad etiladi.
 */
const OPERATOR_KODLARI = new Set([
  '20', '33', '50', '55', '77', '88', '90', '91', '93', '94', '95', '97', '98', '99',
])

/**
 * Har qanday yozuvni kanonik ko'rinishga keltiradi yoki `null`.
 *
 * Qabul qilinadi: "+998 90 123-45-67", "998901234567", "90 123 45 67",
 * "(90) 123 45 67". Qolgan hamma narsa — xato.
 */
export function telefonniTozala(kirish: unknown): Telefon | null {
  if (typeof kirish !== 'string') return null
  let r = kirish.replace(/\D/g, '')
  if (r.length === 12 && r.startsWith('998')) r = r.slice(3)
  if (r.length !== 9) return null
  if (!OPERATOR_KODLARI.has(r.slice(0, 2))) return null
  return `+998${r}` as Telefon
}

/** Ko'rsatish uchun: `+998 90 123 45 67` */
export function telefonMatni(t: string): string {
  const r = t.replace(/\D/g, '').slice(-9)
  if (r.length !== 9) return t
  return `+998 ${r.slice(0, 2)} ${r.slice(2, 5)} ${r.slice(5, 7)} ${r.slice(7)}`
}

/** Faqat 9 ta raqam (forma maydoni uchun): `90 123 45 67` */
export function mahalliyQism(kirish: string): string {
  let r = kirish.replace(/\D/g, '')
  if (r.startsWith('998') && r.length > 9) r = r.slice(3)
  r = r.slice(0, 9)
  const q = [r.slice(0, 2), r.slice(2, 5), r.slice(5, 7), r.slice(7, 9)]
  return q.filter(Boolean).join(' ')
}
