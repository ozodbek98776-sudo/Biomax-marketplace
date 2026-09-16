import 'server-only'
import { cache } from 'react'
import { dokonMalumoti } from '@/lib/erp/mijoz'
import { DOKON } from '@/lib/dokon'
import type { DokonMalumoti } from '@/lib/erp/turlar'

/**
 * Do'kon aloqa ma'lumotlari — ERP sozlamalaridan (5 daqiqa keshda).
 *
 * ERP javob bermasa sahifa yiqilmaydi: nom statik qiymatdan olinadi, aloqa
 * qatorlari esa shunchaki ko'rinmaydi. Kiritilmagan qiymat ham `null` —
 * saytda "[TELEFON]" kabi to'ldiruvchi hech qachon chiqmaydi.
 */
export const dokonAloqa = cache(async (): Promise<DokonMalumoti & { nomi: string }> => {
  const n = await dokonMalumoti()
  if (!n.ok) return { nomi: DOKON.nomi, telefon: null, manzil: null, ishVaqti: null, qaytarishShartlari: null }
  return { ...n.qiymat, nomi: n.qiymat.nomi || DOKON.nomi }
})
