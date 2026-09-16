// Mahsulot sahifasi uchun sof hisob-kitoblar (bazasiz, sinovga oson).

import type { HajmBirligi } from '@/lib/erp/turlar'

const BIRLIK_YORLIQ: Record<HajmBirligi, string> = { G: 'g', KG: 'kg', ML: 'ml', L: 'l', DONA: 'dona', M: 'm' }

function som(n: number): string {
  return `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} so‘m`
}

/**
 * Birlik narxi — turli qadoqlarni solishtirish uchun.
 *
 * Kichik birlikdagi (g, ml) katta qadoq 1 kg / 1 l ga, kichik qadoq esa
 * 100 g / 100 ml ga keltiriladi: "0,12 so'm / 1 ml" hech narsa demaydi,
 * "115 so'm / 100 ml" esa savdo rastasidagi yorliq kabi tushunarli.
 */
export function birlikNarxi(narxSom: number, hajm: number, birlik: HajmBirligi): string | null {
  if (!(hajm > 0) || !(narxSom > 0)) return null
  if (birlik === 'G' || birlik === 'ML') {
    if (hajm >= 500) return `${som((narxSom / hajm) * 1000)} / 1 ${birlik === 'G' ? 'kg' : 'l'}`
    return `${som((narxSom / hajm) * 100)} / 100 ${BIRLIK_YORLIQ[birlik]}`
  }
  if (hajm === 1) return null // "1 kg — 1 kg uchun" — ortiqcha
  return `${som(narxSom / hajm)} / 1 ${BIRLIK_YORLIQ[birlik]}`
}

/** Chegirma foizi, butun songa yumaloq. 1% dan kichik chegirma ko'rsatilmaydi. */
export function chegirmaFoizi(narx: number, eskiNarx: number): number | null {
  if (!(eskiNarx > narx) || !(narx > 0)) return null
  const f = Math.round((1 - narx / eskiNarx) * 100)
  return f >= 1 ? f : null
}

export function hajmMatni(miqdor: number, birlik: HajmBirligi): string {
  const n = Number.isInteger(miqdor) ? String(miqdor) : String(miqdor).replace('.', ',')
  return `${n} ${BIRLIK_YORLIQ[birlik]}`
}

/** Aksiya tugashigacha: "3 kun qoldi", "bugun tugaydi". */
export function aksiyaQoldi(oxiri: string | null, hozir: number = Date.now()): string | null {
  if (!oxiri) return null
  const ms = Date.parse(oxiri) - hozir
  if (!(ms > 0)) return null
  const soat = ms / 3_600_000
  if (soat < 24) return 'Aksiya bugun tugaydi'
  const kun = Math.ceil(soat / 24)
  return `Aksiya tugashiga ${kun} kun`
}
