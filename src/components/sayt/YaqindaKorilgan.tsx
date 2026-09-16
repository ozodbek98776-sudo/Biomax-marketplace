'use client'

import { useEffect, useState } from 'react'
import MahsulotKartasi, { type KartaTovari } from '@/components/MahsulotKartasi'

const KALIT = 'biomax-korilgan'
const MAKS = 12

function oqi(): string[] {
  try {
    const q: unknown = JSON.parse(localStorage.getItem(KALIT) ?? '[]')
    return Array.isArray(q) ? q.filter((x): x is string => typeof x === 'string').slice(0, MAKS) : []
  } catch {
    return []
  }
}

/**
 * "Yaqinda ko'rilganlar" — shu qurilmada (hisobga kirmasdan ham).
 * Joriy mahsulot ro'yxat boshiga yoziladi, lekin o'zi ko'rsatilmaydi.
 * Ma'lumot faqat brauzerda saqlanadi — serverga hech narsa yuborilmaydi.
 */
export default function YaqindaKorilgan({ joriySlug }: { joriySlug: string }) {
  const [tovarlar, setTovarlar] = useState<KartaTovari[]>([])

  useEffect(() => {
    const oldingi = oqi().filter(s => s !== joriySlug)
    try {
      localStorage.setItem(KALIT, JSON.stringify([joriySlug, ...oldingi].slice(0, MAKS)))
    } catch { /* shaxsiy rejim — saqlanmasa ham sahifa ishlaydi */ }
    if (oldingi.length === 0) return

    const boshqaruv = new AbortController()
    fetch(`/api/mahsulotlar?slug=${encodeURIComponent(oldingi.slice(0, 8).join(','))}`, { signal: boshqaruv.signal })
      .then(r => (r.ok ? r.json() : { tovarlar: [] }))
      .then((d: { tovarlar: KartaTovari[] }) => setTovarlar(d.tovarlar))
      .catch(() => {})
    return () => boshqaruv.abort()
  }, [joriySlug])

  if (tovarlar.length === 0) return null
  return (
    <section className="mt-14 sm:mt-16" aria-labelledby="yaqinda-sarlavha">
      <h2 id="yaqinda-sarlavha" className="mb-5 text-[22px] font-extrabold tracking-[-0.02em] sm:text-[26px]">Yaqinda ko‘rganlaringiz</h2>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
        {tovarlar.slice(0, 4).map(t => <MahsulotKartasi key={t.slug} tovar={t} />)}
      </div>
    </section>
  )
}
