// Mavzu (yorug' / qorong'i) — sof mantiq, React'siz.
//
// Uch holat, ikkitasi emas: `tizim` — telefon sozlamasiga ergashadi.
// Ko'p sayt faqat "yorug'/qorong'i" beradi va kechqurun telefon o'zi
// qorong'iga o'tganda sayt yorug'ligicha qolib, ko'zni qamashtiradi.

export const MAVZULAR = ['tizim', 'yorug', 'qorongi'] as const
export type Mavzu = (typeof MAVZULAR)[number]

export const SAQLASH_KALITI = 'biomax-mavzu'
/** CSS shu sinfga tayanadi (`globals.css` dagi `@custom-variant dark`). */
export const QORONGI_SINF = 'qorongi'

export function mavzuTogrimi(q: unknown): q is Mavzu {
  return typeof q === 'string' && (MAVZULAR as readonly string[]).includes(q)
}

/** Tanlangan mavzu + tizim holatidan haqiqiy ko'rinishni hisoblaydi. */
export function amaldagiKorinish(mavzu: Mavzu, tizimQorongimi: boolean): 'yorug' | 'qorongi' {
  if (mavzu === 'tizim') return tizimQorongimi ? 'qorongi' : 'yorug'
  return mavzu
}

/**
 * Sahifa chizilishidan OLDIN ishlaydigan skript.
 *
 * Nega inline va nega `<head>` da: React yuklanguncha kutilsa, qorong'i
 * rejimdagi foydalanuvchi bir lahza oq ekran ko'radi — kechasi bu ko'zni
 * qamashtiradi. Shuning uchun sinf HTML kelishi bilan qo'yiladi.
 *
 * `try/catch` shart: shaxsiy rejimda `localStorage` ga murojaat xato
 * beradi va u tutilmasa butun sahifa chizilmay qoladi.
 */
export const MAVZU_SKRIPTI = `(function(){try{
var m=localStorage.getItem(${JSON.stringify(SAQLASH_KALITI)});
var t=window.matchMedia('(prefers-color-scheme: dark)').matches;
var q=m==='qorongi'||((m==='tizim'||!m)&&t);
if(q)document.documentElement.classList.add(${JSON.stringify(QORONGI_SINF)});
document.documentElement.style.colorScheme=q?'dark':'light';
}catch(e){}})()`
