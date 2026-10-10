'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, Minus, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/cn'
import { MAKS_MIQDOR, chegarala, raqamlar } from '@/lib/domen/miqdor'

/**
 * Miqdor boshqaruvi: «− [maydon] +».
 *
 * O'rtadagi son — haqiqiy kiritish maydoni: xaridor ustiga bosib, 12 tani
 * «+» ni 11 marta bosmasdan yozadi. Bosilganda butun qiymat belgilanadi,
 * shuning uchun darhol yangisini yozaveradi; telefonda raqamli klaviatura
 * ochiladi.
 *
 * Serverga har bosilgan tugmadan keyin emas, yozish TUGAGACH yuboriladi
 * (yoki Enter/maydondan chiqishda) — «12» yozilganda oraliqdagi «1» savatga
 * tushib qolmaydi va tarmoqqa ortiqcha so'rov ketmaydi.
 */

/** Yozishdan keyin shuncha jim turilsa serverga yoziladi. */
const KUTISH_MS = 700

export default function MiqdorKiritgich({
  qiymat, onOzgardi, nomi, min = 1, maks = MAKS_MIQDOR,
  band = false, qulf = false, oshirishMumkin = true, korinish = 'quti', katta = false, className,
}: {
  qiymat: number
  /** Yangi miqdor tayyor bo'lganda — serverga yozish chaqiruvchi zimmasida */
  onOzgardi: (yangi: number) => void
  /** Ekran o'qigichlar uchun mahsulot nomi */
  nomi: string
  /** 0 — nol yozilsa savatdan olib tashlanadi; 1 — eng kami bitta */
  min?: 0 | 1
  maks?: number
  /** Shu qator serverga yozilmoqda — maydon ustida kichik aylana ko'rinadi */
  band?: boolean
  /** Boshqa qator yangilanmoqda: eskirgan qiymat ustiga bosilmasin (aylanasiz) */
  qulf?: boolean
  /** Mahsulot tugagan bo'lsa «+» ishlamaydi */
  oshirishMumkin?: boolean
  /** `quti` — savat qatoridagi oq quti; `tasma` — kartadagi rangli tasma */
  korinish?: 'quti' | 'tasma'
  /** Mahsulot sahifasidagi yirik o'lcham */
  katta?: boolean
  className?: string
}) {
  const [matn, setMatn] = useState(() => String(qiymat))
  const ishlamaydi = band || qulf
  const fokusda = useRef(false)
  const taymer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  // Kechikkan yuborish eski qiymat bilan ishlamasin — har renderdan keyin yangilanadi
  const oxirgi = useRef({ qiymat, onOzgardi, min, maks })
  useEffect(() => { oxirgi.current = { qiymat, onOzgardi, min, maks } })

  // Server qiymati yangilandi (yoki yozuv tugadi) — maydonni moslaymiz.
  // Xaridor yozayotgan paytda tegilmaydi: yozuvi o'rtasida almashib ketmasin.
  useEffect(() => {
    if (!fokusda.current && !band) setMatn(String(qiymat))
  }, [qiymat, band])

  useEffect(() => () => clearTimeout(taymer.current), [])

  function yubor(xom: string) {
    clearTimeout(taymer.current)
    const o = oxirgi.current
    const tozalangan = raqamlar(xom)
    // Bo'sh qoldirildi — o'zgarish yo'q, eski qiymat qaytadi
    if (tozalangan === '') { setMatn(String(o.qiymat)); return }
    const son = Number(tozalangan)
    const yangi = chegarala(son, o.min, o.maks)
    setMatn(String(yangi))
    if (son > o.maks) toast.info(`Ko‘pi bilan ${o.maks} ta buyurtma qilish mumkin`)
    else if (son < o.min && o.min === 1) toast.info('Olib tashlash uchun savat belgisini bosing')
    if (yangi !== o.qiymat) o.onOzgardi(yangi)
  }

  function yozildi(xom: string) {
    const tozalangan = raqamlar(xom)
    setMatn(tozalangan)
    clearTimeout(taymer.current)
    // Bo'sh maydon hali tugallanmagan yozuv — kutamiz
    if (tozalangan !== '') taymer.current = setTimeout(() => yubor(tozalangan), KUTISH_MS)
  }

  /** Tugma — darhol yuboriladi va maydon ham shu zahoti yangilanadi. */
  function tugma(yangi: number) {
    clearTimeout(taymer.current)
    setMatn(String(yangi))
    onOzgardi(yangi)
  }

  const t = korinish === 'tasma'
    ? {
        idish: 'flex w-full items-stretch overflow-hidden',
        tugma: 'flex w-11 shrink-0 items-center justify-center transition hover:bg-brend hover:text-white disabled:opacity-60 sm:w-12',
        maydon: 'h-full w-full bg-transparent text-center font-raqam font-semibold tabular-nums outline-none placeholder:text-current focus:bg-white/45',
        belgi: katta ? 20 : 17,
      }
    : {
        idish: 'flex h-10 items-center rounded-xl border border-chiziq bg-yuza',
        tugma: 'flex h-10 w-10 shrink-0 items-center justify-center text-siyoh-2 transition hover:bg-yuza-2 disabled:text-chiziq-2 disabled:hover:bg-transparent',
        maydon: 'h-10 w-11 rounded-md bg-transparent text-center font-raqam text-[15px] font-semibold tabular-nums outline-none focus:bg-yuza-2 focus:ring-2 focus:ring-brend/40',
        belgi: 16,
      }

  return (
    <div className={cn(t.idish, className)} role="group" aria-label={`${nomi} — miqdor`}>
      <button
        type="button"
        onClick={() => tugma(qiymat - 1)}
        disabled={ishlamaydi || qiymat <= min}
        aria-label={qiymat === 1 && min === 0 ? 'Savatdan olib tashlash' : 'Kamaytirish'}
        className={cn(t.tugma, korinish === 'tasma' && 'rounded-none', korinish === 'quti' && 'rounded-l-xl')}
      >
        <Minus size={t.belgi} strokeWidth={korinish === 'tasma' ? 2.4 : 2.2} aria-hidden />
      </button>

      <span className={cn('relative flex items-center justify-center', korinish === 'tasma' ? 'flex-1 flex-col leading-none' : 'shrink-0')}>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          enterKeyHint="done"
          autoComplete="off"
          value={matn}
          aria-label={`${nomi} — miqdorni yozing`}
          // Bosilganda butun qiymat belgilanadi: darhol yangisini yozish uchun
          onFocus={e => { fokusda.current = true; e.currentTarget.select() }}
          onBlur={() => { fokusda.current = false; yubor(matn) }}
          onChange={e => yozildi(e.currentTarget.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur() }
            if (e.key === 'Escape') { setMatn(String(qiymat)); e.currentTarget.blur() }
            // Yuqoriga/pastga — klaviaturadan ham boshqarish
            if (e.key === 'ArrowUp' && qiymat < maks && oshirishMumkin) { e.preventDefault(); tugma(qiymat + 1) }
            if (e.key === 'ArrowDown' && qiymat > min) { e.preventDefault(); tugma(qiymat - 1) }
          }}
          disabled={qulf}
          className={cn(t.maydon, band && 'opacity-0', qulf && 'cursor-not-allowed')}
        />
        {band && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <Loader2 size={korinish === 'tasma' ? 16 : 15} className="animate-spin" aria-label="Saqlanmoqda" />
          </span>
        )}
        {korinish === 'tasma' && katta && !band && (
          <span className="pointer-events-none mt-1 text-[11px] font-medium">savatda</span>
        )}
      </span>

      <button
        type="button"
        onClick={() => tugma(qiymat + 1)}
        disabled={ishlamaydi || !oshirishMumkin || qiymat >= maks}
        aria-label="Ko‘paytirish"
        className={cn(t.tugma, korinish === 'tasma' && 'rounded-none', korinish === 'quti' && 'rounded-r-xl')}
      >
        <Plus size={t.belgi} strokeWidth={korinish === 'tasma' ? 2.4 : 2.2} aria-hidden />
      </button>
    </div>
  )
}
