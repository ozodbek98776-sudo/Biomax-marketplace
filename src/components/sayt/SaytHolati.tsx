'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Package, ShoppingBag, X } from 'lucide-react'
import { Narx } from '@/components/ui/Belgilar'

// Sayt bo'ylab umumiy mijoz holati: kirganmi va mehmonga chiqadigan
// "ro'yxatdan o'ting" oynasi.
//
// Oyna BITTA — har kartada alohida emas. Yuzta karta bo'lsa ham DOM'da
// bitta <dialog> turadi.

export interface OynaTovari {
  slug: string
  nomi: string
  narxSom: number | null
  rasm: string | null
}

interface SaytHolatiQiymati {
  kirgan: boolean
  /** Savatdagi miqdor: e'lon id → miqdor. Kartochka va sahifa "− 2 +" ko'rsatadi. */
  savat: Record<string, number>
  kirishOynasiniOch: (tovar?: OynaTovari) => void
}

const Kontekst = createContext<SaytHolatiQiymati | null>(null)

export function useSaytHolati(): SaytHolatiQiymati {
  const q = useContext(Kontekst)
  if (!q) throw new Error('useSaytHolati SaytHolatiProvider ichida ishlatilishi kerak')
  return q
}

/** Kirish sahifasi manzili — mahsulot va qaytish joyi bilan. */
export function kirishManzili(rejim: 'royxat' | 'kirish', keyin: string, tovarSlug?: string): string {
  const p = new URLSearchParams({ rejim })
  if (keyin && keyin !== '/') p.set('keyin', keyin)
  if (tovarSlug) p.set('tovar', tovarSlug)
  return `/kirish?${p.toString()}`
}

export function SaytHolatiProvider({ kirgan, savat = {}, children }: { kirgan: boolean; savat?: Record<string, number>; children: React.ReactNode }) {
  const oyna = useRef<HTMLDialogElement>(null)
  const [tovar, setTovar] = useState<OynaTovari | null>(null)
  const yol = usePathname()

  const kirishOynasiniOch = useCallback((t?: OynaTovari) => {
    setTovar(t ?? null)
    // `showModal` — fokus oyna ichida qoladi, Esc yopadi, orqa fon bosilmaydi.
    oyna.current?.showModal()
  }, [])

  const yop = () => oyna.current?.close()
  const qiymat = useMemo(() => ({ kirgan, savat, kirishOynasiniOch }), [kirgan, savat, kirishOynasiniOch])

  return (
    <Kontekst.Provider value={qiymat}>
      {children}

      <dialog
        ref={oyna}
        aria-labelledby="kirish-oynasi-sarlavha"
        // Orqa fonga bosilsa yopiladi (bosish aynan <dialog> ning o'ziga tushadi)
        onClick={e => { if (e.target === e.currentTarget) yop() }}
        className="m-auto w-[calc(100%-2rem)] max-w-[460px] overflow-hidden rounded-3xl bg-yuza p-0 text-siyoh shadow-[0_40px_90px_-30px_rgba(0,0,0,.55)] backdrop:bg-[rgba(26,20,22,.52)] backdrop:backdrop-blur-[2px]"
      >
        <div className="flex justify-end px-3.5 pt-3.5">
          <button
            type="button"
            onClick={yop}
            aria-label="Yopish"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-xira transition hover:bg-yuza-2 hover:text-siyoh"
          >
            <X size={20} strokeWidth={2} aria-hidden />
          </button>
        </div>

        <div className="flex flex-col items-center gap-3.5 px-6 pb-7 text-center sm:px-9 sm:pb-8">
          <span className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-brend-och">
            <ShoppingBag size={28} strokeWidth={1.8} className="text-brend" aria-hidden />
          </span>
          <h2 id="kirish-oynasi-sarlavha" className="mt-1 text-[22px] font-extrabold leading-tight tracking-[-0.02em] sm:text-[25px]">
            Buyurtma berish uchun ro‘yxatdan o‘ting
          </h2>
          <p className="text-[15px] leading-relaxed text-siyoh-2">
            Faqat ism va telefon raqami.
            {tovar ? ' Ro‘yxatdan o‘tgach tanlagan mahsulotingiz savatingizda turadi.' : ' Bir marta o‘tasiz — keyin bir bosishda buyurtma.'}
          </p>

          {tovar && (
            <div className="mt-1 flex items-center gap-3 self-stretch rounded-[14px] border border-chiziq bg-qogoz p-3 text-left">
              <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center overflow-hidden rounded-[11px] bg-linear-to-br from-rasm-1 to-rasm-2">
                {tovar.rasm ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={tovar.rasm} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Package size={24} strokeWidth={1.5} className="text-chiziq-2" aria-hidden />
                )}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-sm font-medium">{tovar.nomi}</span>
                <Narx som={tovar.narxSom} className="text-[15px]" />
              </span>
              <span className="whitespace-nowrap rounded-full bg-bor-och px-2.5 py-1 text-[11.5px] font-semibold text-bor">
                Saqlanadi
              </span>
            </div>
          )}

          <div className="mt-2 flex flex-col gap-2.5 self-stretch">
            <Link
              href={kirishManzili('royxat', yol, tovar?.slug)}
              onClick={yop}
              className="flex h-[52px] items-center justify-center rounded-[14px] bg-brend text-base font-semibold text-white transition hover:bg-brend-quyuq"
            >
              Ro‘yxatdan o‘tish
            </Link>
            <Link
              href={kirishManzili('kirish', yol, tovar?.slug)}
              onClick={yop}
              className="flex h-[52px] items-center justify-center rounded-[14px] border border-chiziq text-base font-semibold text-siyoh transition hover:border-chiziq-2 hover:bg-yuza-2"
            >
              Hisobim bor — kirish
            </Link>
          </div>
          <span className="text-[13px] text-xira">Narxlarni ro‘yxatdan o‘tmasdan ham ko‘ra olasiz</span>
        </div>
      </dialog>
    </Kontekst.Provider>
  )
}
