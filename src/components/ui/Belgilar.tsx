import { cn } from '@/lib/cn'
import type { Mavjudlik } from '@/lib/erp/turlar'

// Dizayn tizimidagi asosiy belgilar. Ranglar `globals.css` tokenlaridan —
// hech qayerda to'g'ridan-to'g'ri hex yozilmaydi, aks holda qorong'i
// rejim faqat ba'zi joylarda ishlaydi.

const MAVJUDLIK_YORLIQ: Record<Mavjudlik, string> = {
  BOR: 'Bor',
  KAM: 'Kam qoldi',
  YOQ: "Yo'q",
}

const MAVJUDLIK_USLUB: Record<Mavjudlik, string> = {
  BOR: 'text-bor bg-bor-och',
  KAM: 'text-kam bg-kam-och',
  YOQ: 'text-yoq bg-yoq-och',
}

/**
 * Mavjudlik belgisi.
 *
 * ATAYLAB uch holat — aniq son hech qachon ko'rsatilmaydi. Sabab
 * TZ 12.3 da: raqam raqobatchiga ombor hajmini ochib beradi va
 * "kam qoldi" bosimini yo'qotadi.
 */
export function MavjudlikBelgisi({ holat, className }: { holat: Mavjudlik; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none sm:text-[11.5px]',
        MAVJUDLIK_USLUB[holat],
        className,
      )}
    >
      {MAVJUDLIK_YORLIQ[holat]}
    </span>
  )
}

/** Narx. Raqamlar `tabular-nums` bilan — ro'yxatda bir-birining tagiga tushsin. */
export function Narx({
  som, olcham = 'orta', className,
}: {
  som: number | null
  olcham?: 'kichik' | 'orta' | 'katta'
  className?: string
}) {
  const olchamlar = {
    kichik: 'text-[13.5px] font-semibold',
    orta: 'text-[15.5px] font-bold',
    katta: 'text-[26px] font-bold tracking-[-0.02em]',
  }
  // `null` — dollarli tovar, kurs olinmagan. Taxminiy narx ko'rsatish
  // mijozdan noto'g'ri pul olishga olib keladi, shuning uchun aytamiz.
  if (som === null) {
    return <span className={cn('text-xira', olchamlar[olcham], className)}>Narx aniqlanmadi</span>
  }
  const raqam = Math.round(som).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return (
    <span className={cn('tabular-nums', olchamlar[olcham], className)}>
      {raqam}&nbsp;so&rsquo;m
    </span>
  )
}

/** Bo'lim sarlavhasi ustidagi kichik yorliq. */
export function Yorliq({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('font-raqam text-[11px] uppercase tracking-[0.08em] text-xira', className)}>
      {children}
    </span>
  )
}
