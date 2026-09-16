'use client'

import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import {
  MAVZULAR, QORONGI_SINF, SAQLASH_KALITI,
  amaldagiKorinish, mavzuTogrimi, type Mavzu,
} from '@/lib/mavzu'
import { cn } from '@/lib/cn'

const YORLIQ: Record<Mavzu, string> = {
  tizim: 'Tizim',
  yorug: "Yorug'",
  qorongi: "Qorong'i",
}

const IKONKA: Record<Mavzu, typeof Sun> = {
  tizim: Monitor,
  yorug: Sun,
  qorongi: Moon,
}

// ─── Tashqi manba: localStorage ──────────────────────────────────────
//
// Mavzu React holatida emas, `localStorage` da yashaydi — u sahifadan
// tashqarida, boshqa tablarda ham o'zgarishi mumkin. Shuning uchun
// `useState` + `useEffect` emas, `useSyncExternalStore`: u aynan shunday
// tashqi manbaga obuna bo'lish uchun ishlangan va serverdagi qiymat
// bilan farqni hidratsiya xatosisiz hal qiladi.

/** O'zimiz o'zgartirganda xabar berish uchun — `storage` faqat BOSHQA tabda ishlaydi. */
const OZGARDI = 'biomax-mavzu-ozgardi'

function obuna(qayta: () => void) {
  window.addEventListener('storage', qayta)
  window.addEventListener(OZGARDI, qayta)
  return () => {
    window.removeEventListener('storage', qayta)
    window.removeEventListener(OZGARDI, qayta)
  }
}

function oqi(): Mavzu {
  try {
    const q = localStorage.getItem(SAQLASH_KALITI)
    return mavzuTogrimi(q) ? q : 'tizim'
  } catch {
    // Shaxsiy rejimda localStorage taqiqlangan bo'lishi mumkin
    return 'tizim'
  }
}

/** Serverda `localStorage` yo'q — har doim "tizim" deb chizamiz. */
function serverdaOqi(): Mavzu {
  return 'tizim'
}

export default function MavzuTugmasi({ className }: { className?: string }) {
  const mavzu = useSyncExternalStore(obuna, oqi, serverdaOqi)

  const qoy = useCallback((yangi: Mavzu) => {
    try {
      localStorage.setItem(SAQLASH_KALITI, yangi)
    } catch { /* saqlanmasa ham joriy sahifada ishlaydi */ }
    window.dispatchEvent(new Event(OZGARDI))

    const tizimQorongi = window.matchMedia('(prefers-color-scheme: dark)').matches
    const korinish = amaldagiKorinish(yangi, tizimQorongi)
    document.documentElement.classList.toggle(QORONGI_SINF, korinish === 'qorongi')
    // Brauzerning o'z elementlari (skrollbar, forma maydonlari) ham mos kelsin
    document.documentElement.style.colorScheme = korinish === 'qorongi' ? 'dark' : 'light'
  }, [])

  // "Tizim" tanlangan bo'lsa telefon sozlamasi o'zgarganda ergashamiz
  useEffect(() => {
    if (mavzu !== 'tizim') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const ozgardi = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle(QORONGI_SINF, e.matches)
      document.documentElement.style.colorScheme = e.matches ? 'dark' : 'light'
    }
    media.addEventListener('change', ozgardi)
    return () => media.removeEventListener('change', ozgardi)
  }, [mavzu])

  return (
    <div
      role="radiogroup"
      aria-label="Sayt ko‘rinishi"
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full border border-chiziq bg-yuza p-0.5',
        className,
      )}
    >
      {MAVZULAR.map(m => {
        const Ikonka = IKONKA[m]
        const tanlangan = mavzu === m
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={tanlangan}
            aria-label={YORLIQ[m]}
            title={YORLIQ[m]}
            onClick={() => qoy(m)}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full transition',
              tanlangan ? 'bg-siyoh text-qogoz' : 'text-xira hover:text-siyoh',
            )}
          >
            <Ikonka size={15} strokeWidth={2} aria-hidden />
          </button>
        )
      })}
    </div>
  )
}
