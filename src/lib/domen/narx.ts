import type { Valyuta } from '@/lib/erp/turlar'

// Pul bilan ishlash.
//
// Ikkita qat'iy qoida:
//
//   1. HISOB-KITOB butun tiyinlarda (integer) bajariladi. `0.1 + 0.2`
//      suzuvchi nuqtada 0.30000000000000004 beradi; savatda 20 ta qator
//      bo'lsa xato tiyinlardan so'mgacha o'sadi va chekdagi jami mos
//      kelmay qoladi.
//
//   2. Dollarda narxlangan tovar so'mga BUYURTMA PAYTIDA o'giriladi va
//      kurs buyurtmada saqlanadi. Aks holda mijoz 100 000 so'mga rozi
//      bo'lib, ertasiga kurs oshsa hujjatda boshqa summa turadi.

/** So'mni tiyinga: 1250.5 -> 125050 */
export function tiyinga(som: number): number {
  return Math.round(som * 100)
}

/** Tiyinni so'mga: 125050 -> 1250.5 */
export function somga(tiyin: number): number {
  return tiyin / 100
}

/**
 * Tovar narxini so'mga o'giradi.
 *
 * `usdKursi` yo'q bo'lsa (kurs xizmati javob bermadi) dollarli tovarni
 * SOTIB BO'LMAYDI — `null` qaytadi. Taxminiy kurs bilan sotish mijozdan
 * noto'g'ri pul olishga olib keladi.
 */
export function somdaNarx(
  narx: number,
  valyuta: Valyuta,
  usdKursi: number | null,
): number | null {
  if (valyuta === 'UZS') return Math.round(narx)
  if (!usdKursi || !Number.isFinite(usdKursi) || usdKursi <= 0) return null
  return Math.round(narx * usdKursi)
}

export interface SavatQatori {
  birlikNarxiSom: number
  miqdor: number
}

export interface SavatJami {
  mahsulotSumma: number
  yetkazishNarx: number
  jamiSumma: number
}

/**
 * Savat jamisi. Hamma qo'shish tiyinlarda, so'ngida bir marta so'mga
 * qaytariladi — oraliqda yaxlitlash xatosi to'planmasin.
 */
export function savatJamisi(
  qatorlar: SavatQatori[],
  yetkazishNarx = 0,
): SavatJami {
  let mahsulotTiyin = 0
  for (const q of qatorlar) {
    // Miqdor kasr bo'lishi mumkin (0.5 kg) — shuning uchun ko'paytmani
    // yaxlitlaymiz, aks holda tiyin butun bo'lmay qoladi.
    mahsulotTiyin += Math.round(tiyinga(q.birlikNarxiSom) * q.miqdor)
  }
  const yetkazishTiyin = tiyinga(yetkazishNarx)
  return {
    mahsulotSumma: somga(mahsulotTiyin),
    yetkazishNarx: somga(yetkazishTiyin),
    jamiSumma: somga(mahsulotTiyin + yetkazishTiyin),
  }
}

/** Ko'rsatish uchun: 1250000 -> "1 250 000 so'm" */
export function narxMatni(som: number): string {
  // Ajratuvchi — uzilmas probel: raqam qator oxirida bo'linib ketmasin.
  const raqam = Math.round(som).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${raqam} so'm`
}
