'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Minus, Plus, ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/cn'
import type { Mavjudlik } from '@/lib/erp/turlar'
import { useSaytHolati, type OynaTovari } from '@/components/sayt/SaytHolati'

const MAKS = 99

/**
 * "Savatga" tugmasi va savatdagi miqdor boshqaruvi.
 *
 * Mahsulot savatda bo'lsa tugma "− 2 +" ga aylanadi (yirik marketplace'lardagi
 * kabi) — xaridor savat sahifasiga o'tmasdan miqdorni o'zgartiradi.
 *
 * Mehmon uchun savatga QO'SHMAYDI — ro'yxatdan o'tish oynasini ochadi va
 * mahsulotni eslab qoladi. Server ham mehmonga savatni yopgan (401).
 */
export default function SavatgaTugma({
  tovar, elonId, mavjudlik, olcham = 'karta', hozirOlish = false, className,
}: {
  tovar: OynaTovari
  elonId: string
  mavjudlik: Mavjudlik
  olcham?: 'karta' | 'katta'
  /** Qo'shgach darhol rasmiylashtirishga o'tish ("Hozir sotib olish") */
  hozirOlish?: boolean
  className?: string
}) {
  const { kirgan, savat, kirishOynasiniOch } = useSaytHolati()
  const router = useRouter()
  const [band, setBand] = useState(false)
  const miqdor = savat[elonId] ?? 0

  const shakl = olcham === 'katta'
    ? 'h-[54px] rounded-[14px] px-6 text-[16px] gap-2.5'
    : 'h-10 rounded-xl text-[13.5px] gap-2 sm:h-11 sm:text-[14.5px]'

  // Yo'q tovar — o'chirilgan tugma o'rniga holatni aniq aytamiz.
  // Narxi noma'lum (dollar kursi olinmagan) tovar ham sotilmaydi.
  if (mavjudlik === 'YOQ' || tovar.narxSom === null) {
    if (hozirOlish) return null
    return (
      <span className={cn('flex w-full items-center justify-center bg-yuza-2 font-semibold text-xira', shakl, className)}>
        {mavjudlik === 'YOQ' ? 'Hozir mavjud emas' : 'Narx aniqlanmoqda'}
      </span>
    )
  }

  async function sor(usul: 'POST' | 'PATCH', tana: object): Promise<boolean> {
    setBand(true)
    try {
      const j = await fetch('/api/savat', { method: usul, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tana) })
      const d: { xato?: string } = await j.json().catch(() => ({}))
      if (j.status === 401) { kirishOynasiniOch(tovar); return false }
      if (!j.ok) { toast.error(d.xato ?? 'Savat o‘zgarmadi'); return false }
      return true
    } catch {
      toast.error('Internet aloqasini tekshiring')
      return false
    } finally {
      setBand(false)
    }
  }

  async function qosh() {
    if (!kirgan) { kirishOynasiniOch(tovar); return }
    if (hozirOlish && miqdor > 0) { router.push('/rasmiylashtirish'); return }
    if (!(await sor('POST', { slug: tovar.slug }))) return
    if (hozirOlish) {
      router.push('/rasmiylashtirish')
      return
    }
    toast.success(`«${tovar.nomi}» savatga qo‘shildi`, {
      action: { label: 'Savatga o‘tish', onClick: () => router.push('/savat') },
    })
    router.refresh()
  }

  async function ozgartir(yangi: number) {
    if (await sor('PATCH', { elonId, miqdor: yangi })) router.refresh()
  }

  if (hozirOlish) {
    return (
      <button
        type="button" onClick={qosh} disabled={band}
        className={cn('flex w-full items-center justify-center border border-siyoh font-semibold text-siyoh transition hover:bg-siyoh hover:text-qogoz disabled:opacity-70', shakl, className)}
      >
        {band && <Loader2 size={18} className="animate-spin" aria-hidden />}
        Hozir sotib olish
      </button>
    )
  }

  if (kirgan && miqdor > 0) {
    return (
      <div
        className={cn('flex w-full items-stretch overflow-hidden border border-brend bg-brend-och text-brend', shakl, 'gap-0 px-0', className)}
        role="group" aria-label={`${tovar.nomi} — savatdagi miqdor`}
      >
        <button type="button" onClick={() => ozgartir(miqdor - 1)} disabled={band} aria-label={miqdor === 1 ? 'Savatdan olib tashlash' : 'Kamaytirish'} className="flex w-11 shrink-0 items-center justify-center transition hover:bg-brend hover:text-white disabled:opacity-60 sm:w-12">
          <Minus size={olcham === 'katta' ? 20 : 17} strokeWidth={2.4} aria-hidden />
        </button>
        <span className="flex flex-1 flex-col items-center justify-center leading-none" aria-live="polite">
          {band ? <Loader2 size={16} className="animate-spin" aria-label="Saqlanmoqda" /> : (
            <>
              <span className="font-raqam font-semibold tabular-nums">{miqdor}</span>
              {olcham === 'katta' && <span className="mt-1 text-[11px] font-medium">savatda</span>}
            </>
          )}
        </span>
        <button type="button" onClick={() => ozgartir(miqdor + 1)} disabled={band || miqdor >= MAKS} aria-label="Ko‘paytirish" className="flex w-11 shrink-0 items-center justify-center transition hover:bg-brend hover:text-white disabled:opacity-60 sm:w-12">
          <Plus size={olcham === 'katta' ? 20 : 17} strokeWidth={2.4} aria-hidden />
        </button>
      </div>
    )
  }

  return (
    <button
      type="button" onClick={qosh} disabled={band} aria-busy={band}
      className={cn('relative flex w-full items-center justify-center bg-brend font-semibold text-white transition hover:bg-brend-quyuq disabled:opacity-80', shakl, className)}
    >
      {band ? <Loader2 size={olcham === 'katta' ? 20 : 17} className="animate-spin" aria-hidden />
        : olcham === 'katta' && <ShoppingCart size={20} strokeWidth={2} aria-hidden />}
      Savatga
    </button>
  )
}
