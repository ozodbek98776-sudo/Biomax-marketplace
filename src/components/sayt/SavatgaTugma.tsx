'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/cn'
import type { Mavjudlik } from '@/lib/erp/turlar'
import { useSaytHolati, type OynaTovari } from '@/components/sayt/SaytHolati'
import MiqdorKiritgich from '@/components/sayt/MiqdorKiritgich'

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
      <MiqdorKiritgich
        qiymat={miqdor}
        onOzgardi={ozgartir}
        nomi={tovar.nomi}
        // Nol yozilsa yoki bittadan kamaytirilsa — savatdan olib tashlanadi
        min={0}
        band={band}
        korinish="tasma"
        katta={olcham === 'katta'}
        className={cn('border border-brend bg-brend-och text-brend', shakl, 'gap-0 px-0', className)}
      />
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
