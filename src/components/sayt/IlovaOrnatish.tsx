'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowUpFromLine, Check, Download, Loader2, MoreVertical, Share } from 'lucide-react'
import { BRAUZER_QADAMLAR, IOS_QADAMLAR, ornatishYoli, type OrnatishYoli } from '@/lib/ilova'

// "Ilovani o'rnatish" tugmasi.
//
// Chrome o'rnatish oynasini faqat foydalanuvchi biror narsani bosganda
// chiqarishga ruxsat beradi, shuning uchun taklif hodisasi ushlab turiladi
// (layout'dagi kichik skript) va tugma bosilganda ishga tushiriladi.
// iPhone'da bunday oyna yo'q — qadamlar ko'rsatiladi.

interface OrnatishHodisasi extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

declare global {
  interface Window {
    __ilovaTaklifi?: OrnatishHodisasi | null
  }
}

export default function IlovaOrnatish({ ixcham = false }: { ixcham?: boolean }) {
  const [yol, setYol] = useState<OrnatishYoli | null>(null)
  const [band, setBand] = useState(false)
  const [xabar, setXabar] = useState<string | null>(null)

  const holatniHisobla = useCallback(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    setYol(ornatishYoli({
      ua: navigator.userAgent,
      standalone,
      taklifBor: !!window.__ilovaTaklifi,
      maxTouchPoints: navigator.maxTouchPoints,
      platform: navigator.platform,
    }))
  }, [])

  useEffect(() => {
    // Birinchi hisoblash chizishdan keyin: qurilma belgilarini o'qish uchun
    // brauzer kerak, server esa bir xil bo'sh joyni chizadi
    const t = setTimeout(holatniHisobla, 0)
    const taklif = () => holatniHisobla()
    const ornatildi = () => { setXabar('Ilova o‘rnatildi — bosh ekraningizda «BioMax» belgisi paydo bo‘ldi.'); holatniHisobla() }
    window.addEventListener('beforeinstallprompt', taklif)
    window.addEventListener('appinstalled', ornatildi)
    return () => {
      clearTimeout(t)
      window.removeEventListener('beforeinstallprompt', taklif)
      window.removeEventListener('appinstalled', ornatildi)
    }
  }, [holatniHisobla])

  async function ornat() {
    const taklif = window.__ilovaTaklifi
    if (!taklif) { holatniHisobla(); return }
    setBand(true)
    try {
      await taklif.prompt()
      const { outcome } = await taklif.userChoice
      window.__ilovaTaklifi = null
      if (outcome === 'dismissed') setXabar('O‘rnatish bekor qilindi. Xohlagan paytda qayta urinib ko‘rishingiz mumkin.')
      holatniHisobla()
    } catch {
      setXabar('O‘rnatish oynasi ochilmadi. Brauzer menyusidan «Ilovani o‘rnatish» ni tanlang.')
    } finally {
      setBand(false)
    }
  }

  // Server va mijoz bir xil chizsin: qurilma aniqlanmaguncha joy band qilib turadi
  if (!yol) return <div className={ixcham ? 'h-12' : 'h-14'} aria-hidden />

  if (yol === 'ornatilgan') {
    return (
      <p className="flex items-center justify-center gap-2 rounded-2xl bg-bor-och px-4 py-3.5 text-[15px] font-semibold text-bor">
        <Check size={18} aria-hidden /> Ilova o‘rnatilgan — shundan foydalanyapsiz
      </p>
    )
  }

  if (yol === 'tugma') {
    return (
      <div className="flex flex-col gap-2">
        <button
          onClick={() => void ornat()}
          disabled={band}
          className="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-brend text-[16px] font-bold text-white transition hover:bg-brend-quyuq disabled:opacity-60"
        >
          {band ? <Loader2 size={20} className="animate-spin" aria-hidden /> : <Download size={20} aria-hidden />}
          Ilovani o‘rnatish
        </button>
        <p className="text-center text-[13px] text-xira">Telefoningiz ruxsat so‘raydi — «O‘rnatish» ni bosing.</p>
        {xabar && <p className="text-center text-[13.5px] text-siyoh-2" role="status">{xabar}</p>}
      </div>
    )
  }

  if (yol === 'brauzerda-oching') {
    return (
      <Yolqoma sarlavha="Avval brauzerda oching">
        <p className="text-[14.5px] text-siyoh-2">
          Siz sahifani Telegram yoki shunga o‘xshash ilova ichida ochdingiz — u yerdan o‘rnatib bo‘lmaydi.
          O‘ng yuqoridagi <b>⋮</b> menyudan <b>«Brauzerda ochish»</b> ni tanlang, so‘ng shu sahifaga qayting.
        </p>
      </Yolqoma>
    )
  }

  const qadamlar = yol === 'ios-qadamlar' ? IOS_QADAMLAR : BRAUZER_QADAMLAR
  const Belgi = yol === 'ios-qadamlar' ? Share : MoreVertical

  return (
    <Yolqoma sarlavha={yol === 'ios-qadamlar' ? 'iPhone’da o‘rnatish' : 'Brauzer menyusidan o‘rnatish'}>
      <ol className="flex flex-col gap-2.5">
        {qadamlar.map((q, i) => (
          <li key={q} className="flex gap-3 text-[14.5px] text-siyoh-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brend-och text-[12.5px] font-bold text-brend">{i + 1}</span>
            <span>{q}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 flex items-center gap-2 text-[13px] text-xira">
        <Belgi size={15} aria-hidden />
        {yol === 'ios-qadamlar'
          ? <>Safari’da: <ArrowUpFromLine size={13} className="inline" aria-hidden /> belgisi pastda turadi.</>
          : 'Chrome, Edge va Opera bu imkoniyatni qo‘llab-quvvatlaydi.'}
      </p>
    </Yolqoma>
  )
}

function Yolqoma({ sarlavha, children }: { sarlavha: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-chiziq bg-yuza p-5">
      <p className="mb-2.5 text-[15.5px] font-bold">{sarlavha}</p>
      {children}
    </div>
  )
}
