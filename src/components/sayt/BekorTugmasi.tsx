'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, X } from 'lucide-react'
import { toast } from 'sonner'

const SABABLAR = ['Fikrimni o‘zgartirdim', 'Boshqa vaqtda buyurtma beraman', 'Noto‘g‘ri mahsulot tanladim', 'Boshqa sabab']

/** Buyurtmani bekor qilish — tasdiq oynasi bilan (tasodifiy bosishdan himoya). */
export default function BekorTugmasi({ raqam }: { raqam: string }) {
  const router = useRouter()
  const oyna = useRef<HTMLDialogElement>(null)
  const [sabab, setSabab] = useState(SABABLAR[0]!)
  const [band, setBand] = useState(false)

  async function bekorQil() {
    setBand(true)
    try {
      const j = await fetch(`/api/buyurtma/${encodeURIComponent(raqam)}/bekor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sabab }),
      })
      const d: { xato?: string } = await j.json().catch(() => ({}))
      if (!j.ok) {
        toast.error(d.xato ?? 'Bekor qilinmadi')
        return
      }
      oyna.current?.close()
      toast.success('Buyurtma bekor qilindi')
      router.refresh()
    } catch {
      toast.error('Internet aloqasini tekshiring')
    } finally {
      setBand(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => oyna.current?.showModal()}
        className="flex h-11 items-center justify-center rounded-xl border border-chiziq bg-yuza px-4 text-[14.5px] font-semibold text-siyoh-2 transition hover:border-brend hover:text-brend"
      >
        Buyurtmani bekor qilish
      </button>

      <dialog
        ref={oyna}
        aria-labelledby="bekor-sarlavha"
        onClick={e => { if (e.target === e.currentTarget && !band) oyna.current?.close() }}
        className="m-auto w-[calc(100%-2rem)] max-w-[420px] rounded-3xl bg-yuza p-0 text-siyoh shadow-[0_40px_90px_-30px_rgba(0,0,0,.55)] backdrop:bg-[rgba(26,20,22,.52)]"
      >
        <div className="flex flex-col gap-4 p-6">
          <div className="flex items-start justify-between gap-3">
            <h2 id="bekor-sarlavha" className="text-[20px] font-extrabold tracking-[-0.02em]">Buyurtmani bekor qilasizmi?</h2>
            <button type="button" onClick={() => oyna.current?.close()} aria-label="Yopish" className="-mr-2 -mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xira hover:bg-yuza-2">
              <X size={20} aria-hidden />
            </button>
          </div>
          <p className="text-[14.5px] text-siyoh-2">Sababini tanlang — xizmatimizni yaxshilashga yordam beradi.</p>
          <div role="radiogroup" aria-label="Sabab" className="flex flex-col gap-2">
            {SABABLAR.map(s => (
              <label key={s} className="flex cursor-pointer items-center gap-3 rounded-xl border border-chiziq px-3.5 py-3 text-[14.5px] has-[:checked]:border-brend has-[:checked]:bg-brend-och/40">
                <input type="radio" name="sabab" checked={sabab === s} onChange={() => setSabab(s)} className="h-[18px] w-[18px] accent-[var(--color-brend)]" />
                {s}
              </label>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-2 gap-2.5">
            <button type="button" onClick={() => oyna.current?.close()} className="flex h-12 items-center justify-center rounded-[14px] border border-chiziq font-semibold hover:bg-yuza-2">
              Qoldirish
            </button>
            <button type="button" onClick={bekorQil} disabled={band} className="flex h-12 items-center justify-center gap-2 rounded-[14px] bg-brend font-semibold text-white hover:bg-brend-quyuq disabled:opacity-70">
              {band && <Loader2 size={17} className="animate-spin" aria-hidden />}
              Bekor qilish
            </button>
          </div>
        </div>
      </dialog>
    </>
  )
}
