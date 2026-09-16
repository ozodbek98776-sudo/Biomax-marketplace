import 'server-only'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { db } from '@/lib/db'
import { sozlama, ishlabChiqarish } from '@/lib/sozlama'
import { SEANS_COOKIE, SEANS_MUDDATI_S, seansOqi, seansYarat } from '@/lib/seans'

export interface JoriyHisob {
  id: string
  telefon: string
  ism: string | null
}

/**
 * Joriy xaridor yoki `null` (mehmon).
 *
 * `cache` — bitta so'rov davomida sarlavha, sahifa va boshqa joylar
 * chaqirsa ham baza bir marta so'raladi.
 */
export const joriyHisob = cache(async (): Promise<JoriyHisob | null> => {
  const qiymat = (await cookies()).get(SEANS_COOKIE)?.value
  const id = seansOqi(qiymat, sozlama.SESSION_SECRET)
  if (!id) return null
  // Imzo to'g'ri bo'lsa ham hisob o'chirilgan yoki bloklangan bo'lishi mumkin.
  const h = await db.mpHisob.findFirst({
    where: { id, faol: true, tasdiqlangan: true },
    select: { id: true, telefon: true, ism: true },
  })
  return h
})

/** Himoyalangan sahifa uchun: mehmon bo'lsa kirish sahifasiga, qaytish manzili bilan. */
export async function hisobTalab(qaytish: string): Promise<JoriyHisob> {
  const h = await joriyHisob()
  if (!h) redirect(`/kirish?keyin=${encodeURIComponent(qaytish)}`)
  return h
}

export async function seansOch(hisobId: string) {
  ;(await cookies()).set(SEANS_COOKIE, seansYarat(hisobId, sozlama.SESSION_SECRET), {
    httpOnly: true,
    // `lax` — boshqa saytdan kelgan POST so'rovga cookie qo'shilmaydi (CSRF'ga qarshi).
    sameSite: 'lax',
    secure: ishlabChiqarish,
    path: '/',
    maxAge: SEANS_MUDDATI_S,
  })
}

export async function seansYop() {
  ;(await cookies()).delete(SEANS_COOKIE)
}
