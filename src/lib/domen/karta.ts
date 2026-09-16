// Mahsulot kartochkasi ma'lumoti — server va mijoz komponentlari uchun umumiy.

import type { Mavjudlik } from '@/lib/erp/turlar'
import type { VitrinaTovari } from '@/lib/domen/vitrina'

export interface KartaTovari {
  elonId: string
  slug: string
  nomi: string
  narxSom: number | null
  eskiNarxSom: number | null
  chegirmaFoiz: number | null
  birlikNarxi: string | null
  mavjudlik: Mavjudlik
  rasm: string | null
  kategoriya?: string | null
}

/** Vitrina mahsulotini kartochka ma'lumotiga — hamma sahifada bir xil. */
export function kartaga(t: VitrinaTovari): KartaTovari {
  return {
    elonId: t.elonId, slug: t.slug, nomi: t.nomi, narxSom: t.narxSom, eskiNarxSom: t.eskiNarxSom,
    chegirmaFoiz: t.chegirmaFoiz, birlikNarxi: t.birlikNarxi, mavjudlik: t.mavjudlik,
    rasm: t.rasmlar[0] ?? null, kategoriya: t.kategoriya?.nomi ?? null,
  }
}

