'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowLeft, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Narx } from '@/components/ui/Belgilar'
import { mahalliyQism, telefonniTozala } from '@/lib/domen/telefon'
import { cn } from '@/lib/cn'
import { useGidratatsiya } from '@/lib/gidratatsiya'

type Rejim = 'royxat' | 'kirish'

interface Props {
  boshRejim: Rejim
  keyin: string
  tovar: { slug: string; nomi: string; narxSom: number | null } | null
}

interface XatoJavob { kod?: string; xato?: string }
interface Kirildi { yangi: boolean; hisob: { ism: string | null } }

async function yubor<T>(yol: string, tana: unknown): Promise<{ ok: true; d: T } | { ok: false; x: XatoJavob }> {
  try {
    const j = await fetch(yol, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tana),
    })
    const d = await j.json().catch(() => ({}))
    return j.ok ? { ok: true, d: d as T } : { ok: false, x: d as XatoJavob }
  } catch {
    return { ok: false, x: { kod: 'tarmoq', xato: 'Internet aloqasini tekshiring' } }
  }
}

/**
 * Ro'yxatdan o'tish / kirish — bitta bosishda.
 *
 * Ism va telefon raqami yetarli: kod ham, parol ham yo'q. Do'kon mijozi uchun
 * parol eslab qolish ortiqcha to'siq, telefon raqami esa kuryer uchun
 * baribir kerak. 2026-09-25: Telegram kodi (bot, START) butunlay olib
 * tashlandi — mijozlar uni tushunmasdi.
 */
export default function KirishFormasi({ boshRejim, keyin, tovar }: Props) {
  const router = useRouter()
  const [rejim, setRejim] = useState<Rejim>(boshRejim)
  const [ism, setIsm] = useState('')
  const [raqam, setRaqam] = useState('')
  const [rozi, setRozi] = useState(false)
  const [xato, setXato] = useState<{ matn: string; kod?: string } | null>(null)
  const [band, setBand] = useState(false)

  // Sahifa to'liq yuklanmaguncha tugma bosilmasin — aks holda brauzer
  // formani oddiy POST qilib yuborib, sahifa qayta yuklanardi
  const tayyor = useGidratatsiya()
  const ismMaydoni = useRef<HTMLInputElement>(null)
  const raqamMaydoni = useRef<HTMLInputElement>(null)
  const roziMaydoni = useRef<HTMLInputElement>(null)

  const telefon = telefonniTozala(raqam)

  function rejimniAlmashtir(r: Rejim) {
    setRejim(r)
    setXato(null)
  }

  async function yuborish(e?: React.FormEvent) {
    e?.preventDefault()
    setXato(null)
    // Brauzer avtomatik to'ldirgan qiymatlar onChange'siz kelishi mumkin
    const ismQiymati = ism || ismMaydoni.current?.value || ''
    const raqamQiymati = raqam || mahalliyQism(raqamMaydoni.current?.value ?? '')
    const roziQiymati = rozi || !!roziMaydoni.current?.checked
    if (ismQiymati !== ism) setIsm(ismQiymati)
    if (raqamQiymati !== raqam) setRaqam(raqamQiymati)
    if (roziQiymati !== rozi) setRozi(roziQiymati)
    const tel = telefonniTozala(raqamQiymati)

    if (rejim === 'royxat' && ismQiymati.trim().length < 2) return setXato({ matn: 'Ismingizni kiriting' })
    if (!tel) return setXato({ matn: 'Telefon raqamini to‘liq kiriting: 90 123 45 67' })
    if (rejim === 'royxat' && !roziQiymati) return setXato({ matn: 'Davom etish uchun shartlarga rozilik bering' })

    setBand(true)
    const n = await yubor<Kirildi>('/api/kirish', { rejim, telefon: tel, ism: ismQiymati.trim() })
    if (!n.ok) {
      setBand(false)
      return setXato({ matn: n.x.xato ?? 'Kirib bo‘lmadi', kod: n.x.kod })
    }
    await kirildi(n.d)
  }

  /** Hisobga kirildi — savat, salom, qaytish. */
  async function kirildi(d: Kirildi) {
    // Mehmon tanlab qo'ygan mahsulot — endi savatga
    if (tovar) {
      const s = await yubor('/api/savat', { slug: tovar.slug })
      if (s.ok) toast.success(`«${tovar.nomi}» savatga qo‘shildi`)
      else toast.error(s.x.xato ?? 'Mahsulot savatga qo‘shilmadi')
    }
    const salom = d.hisob.ism ? `, ${d.hisob.ism}` : ''
    toast.success(d.yangi ? `Xush kelibsiz${salom}! Hisobingiz ochildi.` : `Qaytganingizdan xursandmiz${salom}!`)

    router.replace(keyin)
    router.refresh()
  }

  return (
    // `method="post"`: sahifa hali yuklanmay turib yuborilsa ham raqam URL'ga
    // (va server jurnaliga) tushmasin
    <form onSubmit={yuborish} method="post" noValidate className="flex flex-col gap-6">
      <div role="tablist" aria-label="Kirish usuli" className="grid grid-cols-2 gap-1 rounded-[14px] bg-yuza-2 p-1">
        {([['royxat', 'Ro‘yxatdan o‘tish'], ['kirish', 'Kirish']] as const).map(([r, nomi]) => (
          <button
            key={r}
            type="button"
            role="tab"
            aria-selected={rejim === r}
            onClick={() => rejimniAlmashtir(r)}
            className={cn(
              'h-11 rounded-[11px] text-[15px] transition',
              rejim === r ? 'bg-yuza font-semibold text-siyoh shadow-[0_1px_3px_rgba(26,20,22,.1)]' : 'font-medium text-xira hover:text-siyoh',
            )}
          >
            {nomi}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <h1 className="text-[28px] font-extrabold leading-[1.15] tracking-[-0.025em] sm:text-[30px]">
          {rejim === 'royxat' ? 'Hisob ochish' : 'Hisobga kirish'}
        </h1>
        <p className="text-[15px] text-xira">
          {rejim === 'royxat'
            ? 'Ismingiz va telefon raqamingiz yetarli — parol ham, kod ham kerak emas.'
            : 'Ro‘yxatdan o‘tgan telefon raqamingizni kiriting.'}
        </p>
      </div>

      {tovar && (
        <div className="flex items-center gap-3 rounded-[14px] border border-chiziq bg-yuza p-3">
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[12.5px] text-xira">Tanlagan mahsulotingiz</span>
            <span className="truncate text-sm font-medium">{tovar.nomi}</span>
            <Narx som={tovar.narxSom} className="text-[14.5px]" />
          </span>
          <span className="whitespace-nowrap rounded-full bg-bor-och px-2.5 py-1 text-[11.5px] font-semibold text-bor">Saqlanadi</span>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {rejim === 'royxat' && (
          <label className="flex flex-col gap-[7px]">
            <span className="text-sm font-semibold">Ismingiz</span>
            <input
              ref={ismMaydoni}
              name="ism"
              defaultValue={ism}
              onChange={e => setIsm(e.target.value)}
              autoComplete="name"
              maxLength={60}
              placeholder="Masalan, Dilnoza"
              suppressHydrationWarning
              className="h-[52px] rounded-[13px] border border-chiziq bg-yuza px-4 text-base outline-none transition placeholder:text-xira focus:border-2 focus:border-brend focus:px-[15px] focus:shadow-[0_0_0_4px_var(--color-brend-och)]"
            />
          </label>
        )}

        <label className="flex flex-col gap-[7px]">
          <span className="text-sm font-semibold">Telefon raqami</span>
          <span className="flex h-[52px] items-stretch overflow-hidden rounded-[13px] border border-chiziq bg-yuza transition focus-within:border-2 focus-within:border-brend focus-within:shadow-[0_0_0_4px_var(--color-brend-och)]">
            <span className="flex items-center border-r border-chiziq bg-qogoz px-3.5 font-raqam text-[15px] font-medium text-siyoh-2">+998</span>
            <input
              ref={raqamMaydoni}
              name="telefon"
              defaultValue={raqam}
              onChange={e => {
                const f = mahalliyQism(e.target.value)
                if (e.target.value !== f) e.target.value = f
                setRaqam(f)
              }}
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="90 123 45 67"
              suppressHydrationWarning
              className="min-w-0 flex-1 bg-transparent px-3.5 font-raqam text-base font-medium outline-none placeholder:text-chiziq-2"
            />
            {telefon && <Check size={18} className="mr-3.5 self-center text-bor" aria-label="Raqam to‘g‘ri" />}
          </span>
        </label>

        {rejim === 'royxat' && (
          <label className="flex cursor-pointer items-start gap-[11px] text-sm leading-normal text-siyoh-2">
            <input ref={roziMaydoni} name="rozi" type="checkbox" defaultChecked={rozi} onChange={e => setRozi(e.target.checked)} className="peer sr-only" />
            <span
              aria-hidden
              className="mt-px flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] border border-chiziq-2 bg-yuza text-white transition peer-checked:border-brend peer-checked:bg-brend peer-focus-visible:ring-2 peer-focus-visible:ring-brend peer-focus-visible:ring-offset-2 [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100"
            >
              <Check size={15} strokeWidth={3} />
            </span>
            <span>Foydalanish shartlari va maxfiylik siyosatiga roziman</span>
          </label>
        )}
      </div>

      <XatoQutisi xato={xato} onRoyxat={() => rejimniAlmashtir('royxat')} />

      <button
        type="submit"
        disabled={band || !tayyor}
        aria-busy={!tayyor || band}
        className="flex h-[54px] items-center justify-center gap-2 rounded-[14px] bg-brend text-[16.5px] font-semibold text-white transition hover:bg-brend-quyuq disabled:opacity-70"
      >
        {(band || !tayyor) && <Loader2 size={19} className="animate-spin" aria-hidden />}
        {band
          ? (rejim === 'royxat' ? 'Hisob ochilmoqda…' : 'Kirilmoqda…')
          : !tayyor
            ? 'Sahifa yuklanmoqda…'
            : rejim === 'royxat' ? 'Ro‘yxatdan o‘tish' : 'Kirish'}
      </button>

      <p className="text-center text-sm text-xira">
        {rejim === 'royxat' ? 'Hisobingiz bormi? ' : 'Hisobingiz yo‘qmi? '}
        <button type="button" onClick={() => rejimniAlmashtir(rejim === 'royxat' ? 'kirish' : 'royxat')} className="font-semibold text-brend hover:text-brend-quyuq">
          {rejim === 'royxat' ? 'Kirish' : 'Ro‘yxatdan o‘tish'}
        </button>
      </p>
    </form>
  )
}

function XatoQutisi({ xato, onRoyxat }: { xato: { matn: string; kod?: string } | null; onRoyxat: () => void }) {
  return (
    <div aria-live="polite" id="kirish-xato">
      {xato && (
        <div role="alert" className="flex items-start gap-2.5 rounded-xl bg-brend-och px-3.5 py-3 text-[14px] leading-snug text-brend">
          <AlertCircle size={18} className="mt-px shrink-0" aria-hidden />
          <span className="flex-1 whitespace-pre-line">
            {xato.matn}
            {xato.kod === 'hisob_yoq' && (
              <>
                {' '}
                <button type="button" onClick={onRoyxat} className="inline-flex items-center gap-1 font-semibold underline underline-offset-2">
                  Ro‘yxatdan o‘tish <ArrowLeft size={14} className="rotate-180" aria-hidden />
                </button>
              </>
            )}
          </span>
        </div>
      )}
    </div>
  )
}
