'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, LogOut } from 'lucide-react'
import { toast } from 'sonner'

export default function ChiqishTugmasi() {
  const router = useRouter()
  const [band, setBand] = useState(false)

  async function chiq() {
    setBand(true)
    try {
      const j = await fetch('/api/chiqish', { method: 'POST' })
      if (!j.ok) throw new Error()
      router.replace('/')
      router.refresh()
    } catch {
      toast.error('Chiqib bo‘lmadi — qayta urinib ko‘ring')
      setBand(false)
    }
  }

  return (
    <button
      type="button"
      onClick={chiq}
      disabled={band}
      className="flex h-11 items-center justify-center gap-2 rounded-xl border border-chiziq bg-yuza px-4 text-[14.5px] font-semibold text-siyoh-2 transition hover:border-brend hover:text-brend disabled:opacity-60"
    >
      {band ? <Loader2 size={17} className="animate-spin" aria-hidden /> : <LogOut size={17} aria-hidden />}
      Chiqish
    </button>
  )
}
