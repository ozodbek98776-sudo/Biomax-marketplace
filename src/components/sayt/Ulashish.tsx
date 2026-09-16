'use client'

import { useState } from 'react'
import { Check, Link2, Send, Share2 } from 'lucide-react'
import { toast } from 'sonner'

/**
 * Mahsulotni ulashish. Telefonda tizimning o'z oynasi (Telegram, WhatsApp...),
 * kompyuterda — Telegram va havolani nusxalash. O'zbekistonda asosiy kanal Telegram.
 */
export default function Ulashish({ nomi, yol }: { nomi: string; yol: string }) {
  const [nusxa, setNusxa] = useState(false)

  const havola = () => new URL(yol, window.location.origin).toString()

  async function ulash() {
    if (typeof navigator.share === 'function' && window.matchMedia('(pointer: coarse)').matches) {
      try {
        await navigator.share({ title: nomi, url: havola() })
      } catch { /* bekor qilindi */ }
      return
    }
    window.open(`https://t.me/share/url?url=${encodeURIComponent(havola())}&text=${encodeURIComponent(nomi)}`, '_blank', 'noopener,noreferrer')
  }

  async function nusxala() {
    try {
      await navigator.clipboard.writeText(havola())
      setNusxa(true)
      toast.success('Havola nusxalandi')
      setTimeout(() => setNusxa(false), 2000)
    } catch {
      toast.error('Nusxalab bo‘lmadi')
    }
  }

  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={ulash} className="flex h-10 items-center gap-2 rounded-xl px-3 text-[14px] font-medium text-siyoh-2 transition hover:bg-yuza-2 hover:text-siyoh">
        <Share2 size={17} className="md:hidden" aria-hidden />
        <Send size={17} className="hidden md:block" aria-hidden />
        <span className="md:hidden">Ulashish</span>
        <span className="hidden md:inline">Telegram’da ulashish</span>
      </button>
      <button type="button" onClick={nusxala} aria-label="Havolani nusxalash" className="hidden h-10 w-10 items-center justify-center rounded-xl text-siyoh-2 transition hover:bg-yuza-2 hover:text-siyoh md:flex">
        {nusxa ? <Check size={17} className="text-bor" aria-hidden /> : <Link2 size={17} aria-hidden />}
      </button>
    </div>
  )
}
