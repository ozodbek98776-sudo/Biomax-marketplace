// Do'kon haqidagi statik ma'lumot: nom, shahar, yetkazish hududlari.
//
// Aloqa ma'lumotlari (telefon, manzil, ish vaqti) bu yerda EMAS — ular
// ERP sozlamalaridan olinadi (`dokon-server.ts`), chekdagi bilan bitta manba.

export interface YetkazishHududi {
  nomi: string
  /** Faol bo'lmasa "tez orada" deb ko'rsatiladi. */
  faol: boolean
  muddat: string
  narxSom: number
}

export const DOKON = {
  nomi: 'BioMax',
  shahar: 'Toshkent',
  // TZ 7-bo'lim: birinchi bosqichda ikki tuman. Yangi hudud qo'shish —
  // shu ro'yxatga qator qo'shish.
  hududlar: [
    { nomi: 'Chilonzor', faol: true, muddat: '2 soat ichida', narxSom: 15_000 },
    { nomi: 'Yunusobod', faol: true, muddat: '2 soat ichida', narxSom: 15_000 },
  ] satisfies YetkazishHududi[],
} as const

export const faolHududlarMatni = DOKON.hududlar.filter(h => h.faol).map(h => h.nomi).join(' va ')
