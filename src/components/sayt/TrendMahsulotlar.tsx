'use client'

import { useState } from 'react'
import { Info } from 'lucide-react'
import MahsulotKartasi, { type KartaTovari } from '@/components/MahsulotKartasi'
import { useSaytHolati } from '@/components/sayt/SaytHolati'
import { cn } from '@/lib/cn'

/**
 * Landingdagi trend mahsulotlar — kategoriya bo'yicha filtr bilan.
 *
 * Filtr mijoz tomonida: ro'yxat kichik (8–12 ta) va allaqachon sahifada,
 * har bosishda serverga borish ortiqcha kechikish bo'lardi.
 */
export default function TrendMahsulotlar({ tovarlar }: { tovarlar: KartaTovari[] }) {
  const { kirgan } = useSaytHolati()
  const [tanlangan, setTanlangan] = useState<string | null>(null)

  const kategoriyalar = [...new Set(tovarlar.map(t => t.kategoriya).filter((k): k is string => !!k))]
  const korinadi = tanlangan ? tovarlar.filter(t => t.kategoriya === tanlangan) : tovarlar

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 lg:flex-row lg:items-center lg:justify-between lg:gap-5">
        {kategoriyalar.length > 1 && (
          // Telefonda chiplar yonga suriladi — sahifa kengligidan chiqmaydi
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
            {[null, ...kategoriyalar].map(k => {
              const faol = tanlangan === k
              return (
                <button
                  key={k ?? '*'}
                  type="button"
                  aria-pressed={faol}
                  onClick={() => setTanlangan(k)}
                  className={cn(
                    'flex h-10 shrink-0 items-center rounded-full px-4 text-sm font-medium transition',
                    faol ? 'bg-siyoh text-qogoz' : 'border border-chiziq bg-yuza text-siyoh-2 hover:border-chiziq-2',
                  )}
                >
                  {k ?? 'Hammasi'}
                </button>
              )
            })}
          </div>
        )}
        {!kirgan && (
          <p className="flex items-start gap-2 text-[13.5px] leading-snug text-xira lg:ml-auto lg:items-center">
            <Info size={16} strokeWidth={2} className="mt-px shrink-0 lg:mt-0" aria-hidden />
            Narxlar ochiq. Buyurtma uchun — ro‘yxatdan o‘ting, faqat telefon raqami kerak.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
        {korinadi.map(t => <MahsulotKartasi key={t.slug} tovar={t} />)}
      </div>
    </>
  )
}
