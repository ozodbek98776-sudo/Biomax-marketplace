// Domen xatolari uchun `Natija` tipi — `throw` o'rniga.
//
// Nega: "zaxira yetmadi", "kod noto'g'ri", "buyurtma allaqachon bekor" —
// bular DASTUR XATOSI emas, ular kutilgan natijalar. Ularni `throw` bilan
// uzatish ikki muammo tug'diradi:
//
//   1. TypeScript `throw` ni tipda ko'rsatmaydi — chaqiruvchi qaysi xato
//      kelishini bilmaydi va `catch` ni unutib qo'yishi mumkin.
//   2. Haqiqiy nosozlik (baza uzildi) bilan kutilgan holat (zaxira yetmadi)
//      bir xil yo'l bilan tarqaladi va jurnalda aralashib ketadi.
//
// Shuning uchun: kutilgan holatlar `Natija` bilan QAYTARILADI, kutilmagan
// nosozliklar esa `throw` bo'lib yuqoriga chiqadi.

/** Foydalanuvchiga ko'rsatiladigan xato — matni o'zbekcha va aniq. */
export interface DomenXatosi {
  /** Mashina o'qiy oladigan kod: `zaxira_yetmadi`, `kod_notogri`... */
  kod: string
  /** Foydalanuvchiga ko'rsatiladigan matn. */
  xabar: string
  /** Qo'shimcha ma'lumot — masalan mavjud miqdor. */
  tafsilot?: Record<string, unknown>
}

export type Natija<T> =
  | { ok: true; qiymat: T }
  | { ok: false; xato: DomenXatosi }

export function muvaffaq<T>(qiymat: T): Natija<T> {
  return { ok: true, qiymat }
}

export function xato<T = never>(
  kod: string,
  xabar: string,
  tafsilot?: Record<string, unknown>,
): Natija<T> {
  return { ok: false, xato: { kod, xabar, tafsilot } }
}

/** Natija muvaffaqiyatli bo'lsa qiymatni beradi, aks holda `throw`. */
export function majburanOl<T>(n: Natija<T>): T {
  if (n.ok) return n.qiymat
  throw new Error(`${n.xato.kod}: ${n.xato.xabar}`)
}

// ─── Tez-tez uchraydigan xatolar ─────────────────────────────────────
// Matnlar bitta joyda: bir xil holat turli ekranlarda turlicha
// tushuntirilmasin.

export const XATOLAR = {
  zaxiraYetmadi: (nomi: string, mavjud: number, birlik: string) =>
    xato('zaxira_yetmadi',
      `«${nomi}» yetarli emas — ${mavjud} ${birlik} qoldi`,
      { mavjud }),

  topilmadi: (nima: string) =>
    xato('topilmadi', `${nima} topilmadi`),

  kodNotogri: () =>
    xato('kod_notogri', "Kod noto'g'ri yoki muddati o'tgan"),

  kodKopUrinish: () =>
    xato('kod_kop_urinish', 'Juda ko‘p urinish — yangi kod so‘rang'),

  tezlikChegarasi: (soniya: number) =>
    xato('tezlik_chegarasi', `Juda tez-tez — ${soniya} soniyadan keyin urinib ko‘ring`),

  savatBosh: () =>
    xato('savat_bosh', 'Savat bo‘sh'),

  tasdiqlanmagan: () =>
    xato('tasdiqlanmagan', 'Avval telefon raqamingizni tasdiqlang'),

  holatMos: (hozirgi: string) =>
    xato('holat_mos_emas', `Bu amalni «${hozirgi}» holatida bajarib bo‘lmaydi`),

  erpUlanmadi: () =>
    xato('erp_ulanmadi', 'Do‘kon tizimi vaqtincha javob bermayapti. Birozdan so‘ng urinib ko‘ring.'),
} as const
