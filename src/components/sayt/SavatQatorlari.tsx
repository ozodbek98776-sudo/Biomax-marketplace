'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Minus, Package, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { MavjudlikBelgisi, Narx } from '@/components/ui/Belgilar'
import type { SavatQatori } from '@/lib/domen/savat'
import { cn } from '@/lib/cn'

const MAKS = 99

/**
 * Savat qatorlari — miqdor va o'chirish.
 *
 * Har o'zgarish serverga yoziladi va sahifa serverdan qayta chiziladi:
 * jami summa FAQAT serverda hisoblanadi (jonli narx bilan), mijoz
 * tomonida qo'shib chiqilgan summa ekranda boshqacha chiqib qolmasin.
 */
export default function SavatQatorlari({ qatorlar }: { qatorlar: SavatQatori[] }) {
  const router = useRouter()
  const [kutilmoqda, boshla] = useTransition()
  const [bandQator, setBandQator] = useState<string | null>(null)
  // Oxirgi o'zgartirilgan qator — server javobi kelguncha spinner shu qatorda qoladi
  const [oxirgi, setOxirgi] = useState<string | null>(null)

  async function qoy(q: SavatQatori, miqdor: number) {
    setBandQator(q.elonId)
    setOxirgi(q.elonId)
    try {
      const j = await fetch('/api/savat', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elonId: q.elonId, miqdor }),
      })
      if (!j.ok) {
        const d: { xato?: string } = await j.json().catch(() => ({}))
        toast.error(d.xato ?? 'O‘zgartirilmadi')
        return
      }
      if (miqdor === 0) toast.success(`«${q.nomi}» savatdan olib tashlandi`)
      boshla(() => router.refresh())
    } catch {
      toast.error('Internet aloqasini tekshiring')
    } finally {
      setBandQator(null)
    }
  }

  return (
    <ul className="flex flex-col gap-px overflow-hidden rounded-[20px] border border-chiziq bg-chiziq">
      {qatorlar.map(q => {
        // Yangilanish kutilayotganda hamma qator qulflanadi — eskirgan miqdor ustiga bosilmasin
        const band = bandQator === q.elonId || kutilmoqda
        const yoq = q.mavjudlik === 'YOQ' || q.birlikNarxiSom === null
        return (
          <li key={q.elonId} className={cn('flex gap-3 bg-yuza p-3.5 sm:gap-4 sm:p-4', yoq && 'bg-qogoz')}>
            <Link
              href={`/mahsulot/${q.slug}`}
              tabIndex={-1}
              aria-hidden
              className="flex h-[76px] w-[76px] shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-linear-to-br from-rasm-1 to-rasm-2 sm:h-[88px] sm:w-[88px]"
            >
              {q.rasm ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={q.rasm} alt="" className="h-full w-full object-cover" />
              ) : (
                <Package size={32} strokeWidth={1.4} className="text-chiziq-2" aria-hidden />
              )}
            </Link>

            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-start gap-2">
                  <Link href={`/mahsulot/${q.slug}`} className="line-clamp-2 flex-1 text-[14.5px] font-medium leading-snug hover:text-brend sm:text-[15px]">
                    {q.nomi}
                  </Link>
                  {/* Telefonda o'chirish nom yonida — pastki qatorda miqdor va summaga joy qolsin */}
                  <OchirishTugmasi nomi={q.nomi} disabled={band} onClick={() => qoy(q, 0)} className="-mr-1.5 -mt-1.5 sm:hidden" />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[13px] text-xira">
                  <MavjudlikBelgisi holat={q.mavjudlik} />
                  {q.birlikNarxiSom !== null && (
                    <span className="tabular-nums">
                      <Narx som={q.birlikNarxiSom} className="text-[13px] font-medium text-xira" /> / {q.birlik}
                    </span>
                  )}
                </div>
                {yoq && <span className="text-[12.5px] font-medium text-kam">Buyurtmaga kirmaydi — hozir mavjud emas</span>}
              </div>

              <div className="flex items-center justify-between gap-3 sm:justify-end sm:gap-5">
                <div className="flex h-10 items-center rounded-xl border border-chiziq bg-yuza" aria-label={`${q.nomi} miqdori`}>
                  <button
                    type="button"
                    onClick={() => qoy(q, q.miqdor - 1)}
                    disabled={band || q.miqdor <= 1}
                    aria-label="Kamaytirish"
                    className="flex h-10 w-10 items-center justify-center rounded-l-xl text-siyoh-2 transition hover:bg-yuza-2 disabled:text-chiziq-2 disabled:hover:bg-transparent"
                  >
                    <Minus size={16} strokeWidth={2.2} aria-hidden />
                  </button>
                  <span className="flex w-9 items-center justify-center font-raqam text-[15px] font-semibold tabular-nums" aria-live="polite">
                    {bandQator === q.elonId || (kutilmoqda && oxirgi === q.elonId) ? <Loader2 size={15} className="animate-spin text-xira" aria-label="Saqlanmoqda" /> : q.miqdor}
                  </span>
                  <button
                    type="button"
                    onClick={() => qoy(q, q.miqdor + 1)}
                    disabled={band || yoq || q.miqdor >= MAKS}
                    aria-label="Ko‘paytirish"
                    className="flex h-10 w-10 items-center justify-center rounded-r-xl text-siyoh-2 transition hover:bg-yuza-2 disabled:text-chiziq-2 disabled:hover:bg-transparent"
                  >
                    <Plus size={16} strokeWidth={2.2} aria-hidden />
                  </button>
                </div>

                <Narx som={q.jamiSom} className="text-right text-[16px] sm:min-w-[104px] sm:text-[17px]" />

                <OchirishTugmasi nomi={q.nomi} disabled={band} onClick={() => qoy(q, 0)} className="hidden sm:flex" />
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function OchirishTugmasi({
  nomi, disabled, onClick, className,
}: {
  nomi: string
  disabled: boolean
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`${nomi} — olib tashlash`}
      className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xira transition hover:bg-brend-och hover:text-brend', className)}
    >
      <Trash2 size={18} strokeWidth={1.9} aria-hidden />
    </button>
  )
}
