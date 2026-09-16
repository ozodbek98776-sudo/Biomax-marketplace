import Link from 'next/link'
import { Package } from 'lucide-react'
import { MavjudlikBelgisi, Narx } from '@/components/ui/Belgilar'
import SavatgaTugma from '@/components/sayt/SavatgaTugma'
import type { KartaTovari } from '@/lib/domen/karta'

export type { KartaTovari }

/**
 * Vitrinadagi mahsulot kartasi.
 *
 * Havola va tugma ALOHIDA: `<a>` ichida `<button>` bo'lsa HTML buziladi
 * va ekran o'quvchi ikkalasini bitta narsa deb o'qiydi. Rasm va nom
 * mahsulot sahifasiga olib boradi, "Savatga" esa o'z ishini qiladi.
 */
export default function MahsulotKartasi({ tovar }: { tovar: KartaTovari }) {
  const havola = `/mahsulot/${tovar.slug}`

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-chiziq bg-yuza transition hover:border-chiziq-2 hover:shadow-[0_18px_40px_-28px_rgba(26,20,22,.45)] sm:rounded-[20px]">
      <Link
        href={havola}
        tabIndex={-1}
        aria-hidden
        className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-linear-to-br from-rasm-1 to-rasm-2"
      >
        {tovar.rasm ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tovar.rasm} alt="" loading="lazy" decoding="async" className="h-full w-full bg-white object-contain transition duration-300 group-hover:scale-[1.03]" />
        ) : (
          <Package size={48} strokeWidth={1.3} className="text-chiziq-2 transition duration-300 group-hover:scale-105" aria-hidden />
        )}
        <span className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5 sm:left-3 sm:top-3">
          {tovar.chegirmaFoiz !== null && (
            <span className="rounded-full bg-brend px-2 py-1 text-[11px] font-bold leading-none text-white sm:text-[11.5px]">−{tovar.chegirmaFoiz}%</span>
          )}
          <MavjudlikBelgisi holat={tovar.mavjudlik} />
        </span>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-3 sm:gap-2.5 sm:p-4">
        {tovar.kategoriya && (
          <span className="truncate text-[11.5px] text-xira sm:text-[12.5px]">{tovar.kategoriya}</span>
        )}
        {/* Ikki qatorga joy ajratiladi — kartalar bir xil balandlikda tursin */}
        <Link
          href={havola}
          className="line-clamp-2 min-h-[2.8em] text-[13.5px] font-medium leading-[1.4] text-siyoh hover:text-brend sm:text-[15px]"
        >
          {tovar.nomi}
        </Link>
        <div className="mt-auto flex flex-col gap-0.5">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <Narx som={tovar.narxSom} className={`text-[16px] tracking-[-0.01em] sm:text-[19px] ${tovar.eskiNarxSom ? 'text-brend' : ''}`} />
            {tovar.eskiNarxSom !== null && (
              <s className="text-[12px] text-xira tabular-nums sm:text-[13px]">{Math.round(tovar.eskiNarxSom).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}</s>
            )}
          </div>
          {tovar.birlikNarxi && <span className="font-raqam text-[10.5px] text-xira sm:text-[11px]">{tovar.birlikNarxi}</span>}
        </div>
        <SavatgaTugma
          tovar={{ slug: tovar.slug, nomi: tovar.nomi, narxSom: tovar.narxSom, rasm: tovar.rasm }}
          elonId={tovar.elonId}
          mavjudlik={tovar.mavjudlik}
        />
      </div>
    </article>
  )
}
