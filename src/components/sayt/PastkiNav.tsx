'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, LayoutGrid, ShoppingCart, User } from 'lucide-react'
import { cn } from '@/lib/cn'

const BANDLAR = [
  { yol: '/', nomi: 'Bosh', Ikonka: Home },
  { yol: '/katalog', nomi: 'Katalog', Ikonka: LayoutGrid },
  { yol: '/savat', nomi: 'Savat', Ikonka: ShoppingCart },
  { yol: '/kabinet', nomi: 'Kabinet', Ikonka: User },
] as const

/**
 * Telefonda kirgan xaridor uchun pastki panel — barmoq yetadigan joyda.
 * Planshet va kompyuterda yashiriladi: u yerda sarlavha yetarli.
 */
export default function PastkiNav({ savatSoni }: { savatSoni: number }) {
  const yol = usePathname()

  return (
    <nav
      aria-label="Tezkor"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-chiziq bg-yuza/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <div className="grid grid-cols-4">
        {BANDLAR.map(({ yol: y, nomi, Ikonka }) => {
          const tanlangan = y === '/' ? yol === '/' : yol.startsWith(y)
          return (
            <Link
              key={y}
              href={y}
              aria-current={tanlangan ? 'page' : undefined}
              className="flex h-[58px] flex-col items-center justify-center gap-1"
            >
              <span className="relative">
                <Ikonka size={21} strokeWidth={2} className={tanlangan ? 'text-brend' : 'text-xira'} aria-hidden />
                {y === '/savat' && savatSoni > 0 && (
                  <span className="absolute -right-2.5 -top-1.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-brend px-1 text-[10px] font-bold text-white tabular-nums">
                    {savatSoni > 99 ? '99+' : savatSoni}
                  </span>
                )}
              </span>
              <span className={cn('text-[10.5px]', tanlangan ? 'font-semibold text-brend' : 'text-xira')}>{nomi}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
