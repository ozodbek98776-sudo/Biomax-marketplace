// Xaridor hisoblari — ERP panelidagi "Onlayn mijozlar" ro'yxati uchun sof mantiq.
//
// Filtrlarni bu yerda tozalash: query satridan kelgan har qanday qiymat
// SQL'ga faqat oq ro'yxat orqali tushadi.

export const MIJOZ_TARTIBLARI = ['yangi', 'oxirgi', 'summa'] as const
export type MijozTartibi = (typeof MIJOZ_TARTIBLARI)[number]

export const MIJOZ_FILTRLARI = ['hammasi', 'buyurtmali', 'buyurtmasiz'] as const
export type MijozFiltri = (typeof MIJOZ_FILTRLARI)[number]

export const MIJOZ_SAHIFA_HAJMI = 30

export interface MijozRoyxatFiltri {
  qidiruv: string | null
  /** Qidiruvdagi raqamlar — telefon bo'yicha (kamida 3 ta raqam bo'lsa) */
  raqamlar: string | null
  tartib: MijozTartibi
  filtr: MijozFiltri
  sahifa: number
}

export function mijozFiltriniOqi(p: URLSearchParams): MijozRoyxatFiltri {
  // LIKE maxsus belgilari olib tashlanadi — "%" bilan hammani chiqarib bo'lmasin
  const qidiruv = (p.get('q') ?? '').replace(/[%_\\]/g, '').trim().slice(0, 60) || null
  const raqam = qidiruv?.replace(/\D/g, '') ?? ''
  const tartib = p.get('tartib')
  const filtr = p.get('filtr')
  return {
    qidiruv,
    raqamlar: raqam.length >= 3 ? raqam : null,
    tartib: (MIJOZ_TARTIBLARI as readonly string[]).includes(tartib ?? '') ? tartib as MijozTartibi : 'yangi',
    filtr: (MIJOZ_FILTRLARI as readonly string[]).includes(filtr ?? '') ? filtr as MijozFiltri : 'hammasi',
    sahifa: Math.max(1, Math.min(1000, Math.floor(Number(p.get('sahifa')) || 1))),
  }
}

/** Mijoz kartasidagi qisqa ko'rsatkichlar — faqat topshirilgan buyurtmalar "xarid" hisoblanadi. */
export function mijozXulosasi(buyurtmalar: { holati: string; jamiSumma: number }[]) {
  const bajarilgan = buyurtmalar.filter(b => b.holati === 'BAJARILGAN')
  const xaridSumma = bajarilgan.reduce((s, b) => s + b.jamiSumma, 0)
  return {
    buyurtmaSoni: buyurtmalar.length,
    bajarilganSoni: bajarilgan.length,
    faolSoni: buyurtmalar.filter(b => ['YANGI', 'TASDIQLANGAN', 'YIGILMOQDA', 'YOLDA'].includes(b.holati)).length,
    bekorSoni: buyurtmalar.filter(b => b.holati === 'BEKOR' || b.holati === 'QAYTARILGAN').length,
    xaridSumma,
    ortachaChek: bajarilgan.length ? Math.round(xaridSumma / bajarilgan.length) : 0,
  }
}
