'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import MavzuTugmasi from '@/components/MavzuTugmasi'
import { SAYT_NAV } from '@/components/sayt/nav'

/**
 * Tor ekranlar uchun menyu (lg dan kichik).
 *
 * Havola bosilganda yopiladi — sahifa langarga (/#yetkazish) o'tganda
 * menyu ekranni to'sib qolmasin.
 */
export default function MobilMenyu({
  kirgan, ism,
}: {
  kirgan: boolean
  ism: string | null
}) {
  const [ochiq, setOchiq] = useState(false)

  useEffect(() => {
    if (!ochiq) return
    const tugma = (e: KeyboardEvent) => { if (e.key === 'Escape') setOchiq(false) }
    window.addEventListener('keydown', tugma)
    // Menyu ochiqligida orqa sahifa aylanmasin
    const avval = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', tugma)
      document.body.style.overflow = avval
    }
  }, [ochiq])

  const yop = () => setOchiq(false)

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOchiq(o => !o)}
        aria-expanded={ochiq}
        aria-controls="mobil-menyu"
        aria-label={ochiq ? 'Menyuni yopish' : 'Menyuni ochish'}
        className="-mr-2 flex h-11 w-11 items-center justify-center rounded-xl text-siyoh transition hover:bg-yuza-2"
      >
        {ochiq ? <X size={22} strokeWidth={2} aria-hidden /> : <Menu size={22} strokeWidth={2} aria-hidden />}
      </button>

      {ochiq && (
        <div
          id="mobil-menyu"
          className="fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto border-t border-chiziq bg-qogoz"
        >
          <nav aria-label="Mobil" className="mx-auto flex max-w-2xl flex-col px-4 py-3 sm:px-6">
            {SAYT_NAV.map(n => (
              <Link
                key={n.yol}
                href={n.yol}
                onClick={yop}
                className="flex min-h-[52px] items-center border-b border-chiziq text-[17px] font-semibold text-siyoh"
              >
                {n.nomi}
              </Link>
            ))}

            <div className="flex items-center justify-between py-4">
              <span className="text-[15px] font-medium text-siyoh-2">Ko‘rinish</span>
              <MavzuTugmasi />
            </div>

            <div className="mt-2 flex flex-col gap-2.5">
              {kirgan ? (
                <>
                  <Link href="/kabinet" onClick={yop} className="flex h-[52px] items-center justify-center rounded-[14px] bg-siyoh text-base font-semibold text-qogoz">
                    {ism ? `${ism} — kabinet` : 'Kabinet'}
                  </Link>
                  <Link href="/savat" onClick={yop} className="flex h-[52px] items-center justify-center rounded-[14px] border border-chiziq bg-yuza text-base font-semibold">
                    Savat
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/kirish?rejim=royxat" onClick={yop} className="flex h-[52px] items-center justify-center rounded-[14px] bg-brend text-base font-semibold text-white">
                    Ro‘yxatdan o‘tish
                  </Link>
                  <Link href="/kirish?rejim=kirish" onClick={yop} className="flex h-[52px] items-center justify-center rounded-[14px] border border-chiziq bg-yuza text-base font-semibold">
                    Kirish
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </div>
  )
}
