'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Expand, Package, X } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Mahsulot rasmlari galereyasi.
 *
 *  · Kompyuterda: chapda kichik rasmlar, o'ngda katta rasm; ustiga bosilsa to'liq ekran.
 *  · Telefonda: barmoq bilan suriladigan lenta (CSS scroll-snap — kutubxonasiz,
 *    brauzerning o'z inertsiyasi bilan) va pastda nuqtalar.
 *  · To'liq ekranda: strelkalar, klaviatura (← → Esc), surish.
 */
export default function Galereya({ rasmlar, nomi, belgilar }: { rasmlar: string[]; nomi: string; belgilar?: React.ReactNode }) {
  const [joriy, setJoriy] = useState(0)
  const [ochiq, setOchiq] = useState(false)
  const lenta = useRef<HTMLDivElement>(null)
  const oyna = useRef<HTMLDialogElement>(null)
  const oynaLenta = useRef<HTMLDivElement>(null)
  const soni = rasmlar.length

  const borish = useCallback((i: number, lentaEl: HTMLDivElement | null = lenta.current) => {
    const n = (i + soni) % soni
    setJoriy(n)
    lentaEl?.scrollTo({ left: lentaEl.clientWidth * n, behavior: 'smooth' })
  }, [soni])

  // Surilganda joriy rasm raqamini yangilash
  function surildi(el: HTMLDivElement) {
    const n = Math.round(el.scrollLeft / Math.max(1, el.clientWidth))
    if (n !== joriy) setJoriy(n)
  }

  function toliqEkran(i: number) {
    setJoriy(i)
    setOchiq(true)
    oyna.current?.showModal()
    requestAnimationFrame(() => {
      const el = oynaLenta.current
      if (el) el.scrollTo({ left: el.clientWidth * i })
    })
  }

  useEffect(() => {
    if (!ochiq) return
    const t = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') borish(joriy + 1, oynaLenta.current)
      if (e.key === 'ArrowLeft') borish(joriy - 1, oynaLenta.current)
    }
    window.addEventListener('keydown', t)
    return () => window.removeEventListener('keydown', t)
  }, [ochiq, joriy, borish])

  if (soni === 0) {
    return (
      <div className="relative flex aspect-square items-center justify-center self-start overflow-hidden rounded-3xl border border-chiziq bg-linear-to-br from-rasm-1 to-rasm-2">
        <Package size={96} strokeWidth={1.1} className="text-chiziq-2" aria-hidden />
        {belgilar && <div className="absolute left-4 top-4 flex gap-2">{belgilar}</div>}
      </div>
    )
  }

  return (
    // `self-start`: panjara qatori ma'lumot ustuni bo'yicha baland bo'lganda galereya cho'zilmasin
    <div className="flex gap-3 self-start lg:gap-4">
      {soni > 1 && (
        <div className="hidden w-[72px] shrink-0 flex-col gap-2.5 md:flex" role="tablist" aria-label="Rasmlar">
          {rasmlar.map((r, i) => (
            <button
              key={r} type="button" role="tab" aria-selected={i === joriy} aria-label={`${i + 1}-rasm`}
              onClick={() => borish(i)}
              className={cn('aspect-square overflow-hidden rounded-xl border-2 bg-yuza transition', i === joriy ? 'border-brend' : 'border-chiziq hover:border-chiziq-2')}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r} alt="" className="h-full w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      <div className="relative min-w-0 flex-1">
        <div
          ref={lenta}
          onScroll={e => surildi(e.currentTarget)}
          className="flex aspect-square snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-3xl border border-chiziq bg-yuza [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {rasmlar.map((r, i) => (
            <button key={r} type="button" onClick={() => toliqEkran(i)} className="relative h-full w-full shrink-0 snap-center cursor-zoom-in" aria-label={`${nomi} — ${i + 1}-rasmni kattalashtirish`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r} alt={i === 0 ? nomi : `${nomi}, ${i + 1}-rasm`} className="h-full w-full object-contain" loading={i === 0 ? 'eager' : 'lazy'} fetchPriority={i === 0 ? 'high' : undefined} />
            </button>
          ))}
        </div>

        {belgilar && <div className="pointer-events-none absolute left-4 top-4 flex gap-2">{belgilar}</div>}
        <span className="pointer-events-none absolute right-3 top-3 hidden h-9 w-9 items-center justify-center rounded-full bg-yuza/85 text-siyoh-2 md:flex" aria-hidden>
          <Expand size={16} />
        </span>

        {soni > 1 && (
          <>
            <button type="button" onClick={() => borish(joriy - 1)} aria-label="Oldingi rasm" className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-yuza/90 text-siyoh shadow md:flex">
              <ChevronLeft size={20} aria-hidden />
            </button>
            <button type="button" onClick={() => borish(joriy + 1)} aria-label="Keyingi rasm" className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-yuza/90 text-siyoh shadow md:flex">
              <ChevronRight size={20} aria-hidden />
            </button>
            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5" aria-hidden>
              {rasmlar.map((r, i) => (
                <span key={r} className={cn('h-1.5 rounded-full transition-all', i === joriy ? 'w-5 bg-siyoh' : 'w-1.5 bg-chiziq-2')} />
              ))}
            </div>
          </>
        )}
      </div>

      <dialog
        ref={oyna}
        onClose={() => setOchiq(false)}
        aria-label={`${nomi} — rasmlar`}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-black p-0 text-white backdrop:bg-black"
      >
        <div className="relative flex h-full flex-col">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="font-raqam text-sm tabular-nums text-white/80">{joriy + 1} / {soni}</span>
            <button type="button" onClick={() => oyna.current?.close()} aria-label="Yopish" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
              <X size={22} aria-hidden />
            </button>
          </div>
          <div
            ref={oynaLenta}
            onScroll={e => surildi(e.currentTarget)}
            className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {rasmlar.map((r, i) => (
              <div key={r} className="flex h-full w-full shrink-0 snap-center items-center justify-center p-2 sm:p-8">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r} alt={`${nomi}, ${i + 1}-rasm`} className="max-h-full max-w-full object-contain" />
              </div>
            ))}
          </div>
          {soni > 1 && (
            <>
              <button type="button" onClick={() => borish(joriy - 1, oynaLenta.current)} aria-label="Oldingi rasm" className="absolute left-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 sm:flex">
                <ChevronLeft size={24} aria-hidden />
              </button>
              <button type="button" onClick={() => borish(joriy + 1, oynaLenta.current)} aria-label="Keyingi rasm" className="absolute right-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 sm:flex">
                <ChevronRight size={24} aria-hidden />
              </button>
            </>
          )}
        </div>
      </dialog>
    </div>
  )
}
