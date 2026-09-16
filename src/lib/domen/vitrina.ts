import 'server-only'
import { db } from '@/lib/db'
import { katalog } from '@/lib/erp/mijoz'
import { somdaNarx } from '@/lib/domen/narx'
import { birlikNarxi, chegirmaFoizi } from '@/lib/domen/mahsulot'
import { type Natija, muvaffaq } from '@/lib/natija'
import type { HajmBirligi, KatalogTovari, Mavjudlik } from '@/lib/erp/turlar'

// Vitrina — ERP katalogini marketplace e'lonlari bilan birlashtiradi.
//
// Mahsulot haqidagi HAMMA narsa ERP'dan keladi: narx, mavjudlik, rasm,
// tavsif, xususiyatlar, aksiya — do'kon ularni "Onlayn vitrina"da to'ldiradi.
// Marketplace'ning o'zida faqat sayt manzili (slug) va tartib saqlanadi.
// ERP'da saytga chiqarilgan yangi mahsulotga e'lon (slug) avtomatik ochiladi.

export interface VitrinaTovari {
  elonId: string
  erpTovarId: string
  slug: string
  nomi: string
  tavsif: string | null
  brend: string | null
  /** Tayyor rasm manzillari: `/rasm/<tovar>/<tartib>?v=<versiya>` */
  rasmlar: string[]
  birlik: string
  narxSom: number | null
  /** Aksiyadan oldingi narx (so'mda) — faqat aksiya haqiqatan amalda bo'lsa */
  eskiNarxSom: number | null
  chegirmaFoiz: number | null
  aksiyaOxiri: string | null
  /** "115 so'm / 1 ml" — hajm kiritilgan bo'lsa */
  birlikNarxi: string | null
  hajm: { miqdor: number; birlik: HajmBirligi } | null
  xususiyatlar: { nomi: string; qiymat: string }[]
  mavjudlik: Mavjudlik
  kategoriya: { id: string; nomi: string } | null
  ombor: { id: string; nomi: string } | null
  yangilangan: string
}

/** Nomdan SEO manzili: "Ariel 6 kg" -> "ariel-6-kg" (kirill harflar saqlanadi) */
function slugla(nomi: string): string {
  return nomi
    .toLowerCase()
    .replace(/['‘’`ʻʼ]/g, '')
    .replace(/[^a-z0-9Ѐ-ӿ]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'mahsulot'
}

function birlashtir(
  elon: { id: string; slug: string },
  t: KatalogTovari,
  usdKursi: number | null,
): VitrinaTovari {
  const narxSom = somdaNarx(t.sotishNarxi, t.valyuta, usdKursi)
  const eskiNarxSom = t.eskiNarx === null ? null : somdaNarx(t.eskiNarx, t.valyuta, usdKursi)
  return {
    elonId: elon.id,
    erpTovarId: t.id,
    slug: elon.slug,
    nomi: t.sarlavha?.trim() || t.nomi.trim(),
    tavsif: t.tavsif,
    brend: t.brend,
    rasmlar: t.rasmlar.map((v, i) => `/rasm/${t.id}/${i}?v=${v}`),
    birlik: t.birlik,
    narxSom,
    eskiNarxSom: narxSom !== null && eskiNarxSom !== null && eskiNarxSom > narxSom ? eskiNarxSom : null,
    chegirmaFoiz: narxSom !== null && eskiNarxSom !== null ? chegirmaFoizi(narxSom, eskiNarxSom) : null,
    aksiyaOxiri: t.aksiyaOxiri,
    birlikNarxi: narxSom !== null && t.hajm !== null && t.hajmBirligi !== null ? birlikNarxi(narxSom, t.hajm, t.hajmBirligi) : null,
    hajm: t.hajm !== null && t.hajmBirligi !== null ? { miqdor: t.hajm, birlik: t.hajmBirligi } : null,
    xususiyatlar: t.xususiyatlar,
    mavjudlik: t.mavjudlik,
    kategoriya: t.kategoriya,
    ombor: t.ombor,
    yangilangan: t.yangilangan,
  }
}

/** ERP'da saytga chiqarilgan, lekin hali e'loni (slug) yo'q mahsulotlarga e'lon ochish. */
async function yangiElonlar(tovarlar: KatalogTovari[], bor: Set<string>) {
  const yangilar = tovarlar.filter(t => !bor.has(t.id))
  if (yangilar.length === 0) return
  const band = new Set((await db.mpElon.findMany({ select: { slug: true } })).map(e => e.slug))
  const data = yangilar.map(t => {
    const asos = slugla(t.sarlavha?.trim() || t.nomi)
    let slug = asos
    for (let n = 2; band.has(slug); n++) slug = `${asos}-${n}`
    band.add(slug)
    return { erpTovarId: t.id, slug, faol: true, tartib: 0 }
  })
  // Parallel ikkinchi so'rov bir xil e'lonni ochmoqchi bo'lsa — jimgina o'tkazib yuboriladi
  await db.mpElon.createMany({ data, skipDuplicates: true })
}

/** Vitrinadagi barcha mahsulotlar. */
export async function vitrina(): Promise<Natija<VitrinaTovari[]>> {
  const erp = await katalog()
  if (!erp.ok) return erp

  let elonlar = await db.mpElon.findMany({
    orderBy: [{ tartib: 'asc' }, { yaratilgan: 'desc' }],
    select: { id: true, erpTovarId: true, slug: true },
  })
  const bor = new Set(elonlar.map(e => e.erpTovarId))
  if (erp.qiymat.tovarlar.some(t => !bor.has(t.id))) {
    await yangiElonlar(erp.qiymat.tovarlar, bor)
    elonlar = await db.mpElon.findMany({
      orderBy: [{ tartib: 'asc' }, { yaratilgan: 'desc' }],
      select: { id: true, erpTovarId: true, slug: true },
    })
  }

  // ERP faqat saytga chiqarilganlarini beradi — katalogda yo'q e'lon ko'rinmaydi
  const boyicha = new Map(erp.qiymat.tovarlar.map(t => [t.id, t]))
  const natija: VitrinaTovari[] = []
  for (const e of elonlar) {
    const t = boyicha.get(e.erpTovarId)
    if (t) natija.push(birlashtir(e, t, erp.qiymat.usdKursi))
  }
  return muvaffaq(natija)
}

/** Bitta mahsulot — slug bo'yicha. */
export async function vitrinaTovari(slug: string): Promise<Natija<VitrinaTovari | null>> {
  const v = await vitrina()
  if (!v.ok) return v
  return muvaffaq(v.qiymat.find(x => x.slug === slug) ?? null)
}
