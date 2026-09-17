// Ilovani o'rnatish — qurilmani aniqlash va matnlar (sof mantiq, sinovga oson).
//
// Nega kerak: o'rnatish har qurilmada boshqacha ishlaydi.
//   · Android/Chrome — brauzer "o'rnatasizmi?" oynasini o'zi chiqaradi, biz
//     faqat tugma bosilganda uni chaqiramiz (`beforeinstallprompt`).
//   · iPhone/Safari — Apple bunday oyna bermaydi, foydalanuvchi "Ulashish →
//     Bosh ekranga qo'shish" qadamlarini o'zi bosadi.
//   · Telegram/Instagram ichidagi brauzer — umuman o'rnata olmaydi, avval
//     sahifani oddiy brauzerda ochish kerak.

export type Qurilma = 'android' | 'ios' | 'kompyuter'
export type OrnatishYoli = 'tugma' | 'ios-qadamlar' | 'brauzerda-oching' | 'ornatilgan' | 'brauzer-menyusi'

export interface MuhitBelgilari {
  ua: string
  standalone: boolean
  /** `beforeinstallprompt` ushlangan (Chrome oynani chiqarishga tayyor) */
  taklifBor: boolean
  maxTouchPoints?: number
  platform?: string
}

export function qurilmaAniqla(b: Pick<MuhitBelgilari, 'ua' | 'maxTouchPoints' | 'platform'>): Qurilma {
  const ua = b.ua.toLowerCase()
  // iPadOS 13+ o'zini "Macintosh" deb tanishtiradi — sezgir ekran bilan ajratiladi
  if (/iphone|ipad|ipod/.test(ua) || (b.platform === 'MacIntel' && (b.maxTouchPoints ?? 0) > 1)) return 'ios'
  if (/android/.test(ua)) return 'android'
  return 'kompyuter'
}

/** Telegram, Instagram, Facebook kabi ilovalar ichidagi brauzer. */
export function ilovaIchidagiBrauzer(ua: string): boolean {
  return /telegram|instagram|fban|fbav|line\/|micromessenger|twitter/i.test(ua)
}

export function ornatishYoli(b: MuhitBelgilari): OrnatishYoli {
  if (b.standalone) return 'ornatilgan'
  if (b.taklifBor) return 'tugma'
  if (ilovaIchidagiBrauzer(b.ua)) return 'brauzerda-oching'
  if (qurilmaAniqla(b) === 'ios') return 'ios-qadamlar'
  return 'brauzer-menyusi'
}

export const IOS_QADAMLAR = [
  'Pastdagi «Ulashish» tugmasini bosing (yuqoriga qaragan strelka).',
  'Ro‘yxatdan «Bosh ekranga qo‘shish» ni tanlang.',
  'O‘ng yuqoridagi «Qo‘shish» ni bosing — ilova bosh ekranda paydo bo‘ladi.',
] as const

export const BRAUZER_QADAMLAR = [
  'Brauzer menyusini oching (⋮ yoki manzil satridagi belgi).',
  '«Ilovani o‘rnatish» yoki «Install app» ni tanlang.',
] as const

export const FOYDALAR = [
  { sarlavha: 'Bosh ekrandan bir bosishda', matn: 'Har safar manzil yozib o‘tirmaysiz — ilova telefoningizda turadi.' },
  { sarlavha: 'Tez ochiladi', matn: 'Belgilar va uslublar telefonda saqlanadi, sahifa darhol chiziladi.' },
  { sarlavha: 'Buyurtma holati jonli', matn: 'Do‘kon tasdiqlagani va kuryer yo‘lga chiqqani o‘zi yangilanib turadi.' },
  { sarlavha: 'Joy egallamaydi', matn: 'Bir necha yuz kilobayt — oddiy ilovadan o‘n barobar kichik.' },
] as const

/**
 * Sahifa chizilishidan oldin ishlaydigan kichik skript.
 *
 * Chrome `beforeinstallprompt` hodisasini sahifa ochilishi bilan yuboradi —
 * React komponenti ulgurmasligi mumkin. Shuning uchun hodisa shu yerda
 * ushlab olinadi va "O'rnatish" tugmasi bosilganda ishlatiladi.
 */
export const TAKLIF_SKRIPTI = `(function(){try{
window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__ilovaTaklifi=e});
}catch(e){}})()`
