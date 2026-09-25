'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowLeft, Check, Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Narx } from '@/components/ui/Belgilar'
import { mahalliyQism, telefonMatni, telefonniTozala } from '@/lib/domen/telefon'
import { cn } from '@/lib/cn'
import { useGidratatsiya } from '@/lib/gidratatsiya'

type Rejim = 'royxat' | 'kirish'
type Bosqich = 'telefon' | 'kod'

interface Props {
  boshRejim: Rejim
  keyin: string
  tovar: { slug: string; nomi: string; narxSom: number | null } | null
}

interface XatoJavob { kod?: string; xato?: string; tafsilot?: { soniya?: number; sabab?: string; bot?: string } }

/** Kod qaysi yo'l bilan ketdi — mijozga qayerdan qidirishni aytish uchun. */
type Kanal = 'gateway' | 'telegram' | 'konsol' | 'bot_ulash'
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
 * Royxatdan otish / kirish.
 *
 * Ism va telefon raqami bilan darhol kiriladi - kod soralmayd i.
 * Parol yoq: dokon mijozi uchun parol eslab qolish — ortiqcha tosiq,
 * telefon raqami esa kuryer uchun baribir kerak.
 */
export default function KirishFormasi({ boshRejim, keyin, tovar }: Props) {
  const router = useRouter()
  const [rejim, setRejim] = useState<Rejim>(boshRejim)
  const [bosqich, setBosqich] = useState<Bosqich>('telefon')
  const [ism, setIsm] = useState('')
  const [raqam, setRaqam] = useState('')
  const [kod, setKod] = useState('')
  const [rozi, setRozi] = useState(false)
  const [xato, setXato] = useState<{ matn: string; kod?: string } | null>(null)
  const [band, setBand] = useState(false)
  const [qaytaYuborish, setQaytaYuborish] = useState(60)
  const [kanal, setKanal] = useState<Kanal>('telegram')
  /** Botga hali ulanmagan mijoz uchun: t.me/<bot>?start=kirish */
  const [botHavola, setBotHavola] = useState<string | null>(null)
  // JS ulanguncha yuborish o'chiq — aks holda brauzer formani o'zi yuborib sahifani qayta yuklaydi
  const tayyor = useGidratatsiya()
  const ismMaydoni = useRef<HTMLInputElement>(null)
  const raqamMaydoni = useRef<HTMLInputElement>(null)
  const kodMaydoni = useRef<HTMLInputElement>(null)
  const roziMaydoni = useRef<HTMLInputElement>(null)

  const telefon = telefonniTozala(raqam)

  function rejimniAlmashtir(r: Rejim) {
    setRejim(r)
    setBosqich('telefon')
    setKod('')
    setXato(null)
  }

  async function kodYubor(e?: React.FormEvent) {
    e?.preventDefault()
    setXato(null)
    const ismQiymati = ism || ismMaydoni.current?.value || ''
    const raqamQiymati = raqam || mahalliyQism(raqamMaydoni.current?.value ?? '')
    const roziQiymati = rozi || !!roziMaydoni.current?.checked
    if (ismQiymati !== ism) setIsm(ismQiymati)
    if (raqamQiymati !== raqam) setRaqam(raqamQiymati)
    if (roziQiymati !== rozi) setRozi(roziQiymati)
    const tel = telefonniTozala(raqamQiymati)

    if (rejim === 'royxat' && ismQiymati.trim().length < 2) return setXato({ matn: 'Ismingizni kiriting' })
    if (!tel) return setXato({ matn: 'Telefon raqamini toliq kiriting: 90 123 45 67' })
    if (rejim === 'royxat' && !roziQiymati) return setXato({ matn: 'Davom etish uchun shartlarga rozilik bering' })

    setBand(true)
    const k = await yubor<{ kanal: Kanal }>('/api/kirish/kod', { telefon: tel })
    setBand(false)

    if (!k.ok) {
      // Botga ulanmagan: ko'rsatma devori o'rniga bitta tugma. Mijoz botda
      // «START» va «Raqamni yuborish» ni bosadi — kod o'sha zahoti keladi,
      // shuning uchun kod maydonini darhol ko'rsatamiz.
      if (k.x.kod === 'telegram_ulangmagan' && k.x.tafsilot?.bot) {
        setBotHavola(`https://t.me/${k.x.tafsilot.bot}?start=kirish`)
        setKanal('bot_ulash')
        setBosqich('kod')
        setQaytaYuborish(0)
        return
      }
      return setXato({ matn: k.x.xato ?? 'Kod yuborib bolmadi', kod: k.x.kod })
    }

    setKanal(k.d.kanal)
    setBotHavola(null)
    setBosqich('kod')
    setQaytaYuborish(60)
    const timer = setInterval(() => {
      setQaytaYuborish(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  async function kodTasdiq(e?: React.FormEvent) {
    e?.preventDefault()
    setXato(null)
    const kodQiymati = kod || kodMaydoni.current?.value || ''
    if (kodQiymati !== kod) setKod(kodQiymati)

    if (kodQiymati.length !== 6) return setXato({ matn: 'Kodni toliq kiriting' })

    setBand(true)
    const k = await yubor<Kirildi>('/api/kirish/tasdiq', {
      telefon: telefonniTozala(raqam),
      kod: kodQiymati,
      ...(rejim === 'royxat' && ism.trim().length >= 2 ? { ism: ism.trim() } : {}),
    })
    setBand(false)

    if (!k.ok) {
      return setXato({ matn: k.x.xato ?? 'Kod notogri', kod: k.x.kod })
    }
    return kirildi(k.d)
  }

  /** Hisobga kirildi — savat, salom, qaytish. */
  async function kirildi(d: Kirildi) {
    // Mehmon tanlab qoygan mahsulot — endi savatga
    if (tovar) {
      const s = await yubor('/api/savat', { slug: tovar.slug })
      if (s.ok) toast.success(`«${tovar.nomi}» savatga qoshildi`)
      else toast.error(s.x.xato ?? 'Mahsulot savatga qoshilmadi')
    }
    const salom = d.hisob.ism ? `, ${d.hisob.ism}` : ''
    toast.success(d.yangi ? `Xush kelibsiz${salom}! Hisobingiz ochildi.` : `Qaytganingizdan xursandmiz${salom}!`)

    router.replace(keyin)
    router.refresh()
  }

  return (
    // `method="post"`: sahifa hali yuklanmay turib yuborilsa ham raqam URL'ga
    // (va server jurnaliga) tushmasin
    <form onSubmit={bosqich === 'telefon' ? kodYubor : kodTasdiq} method="post" noValidate className="flex flex-col gap-6">
      {bosqich === 'telefon' ? (
        <>
          <div role="tablist" aria-label="Kirish usuli" className="grid grid-cols-2 gap-1 rounded-[14px] bg-yuza-2 p-1">
            {([['royxat', 'Royxatdan otish'], ['kirish', 'Kirish']] as const).map(([r, nomi]) => (
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
                ? 'Ismingiz va telefon raqamingiz — Telegram orqali kod yuboramiz.'
                : 'Royxatdan otgan telefon raqamingizni kiriting.'}
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
                {telefon && <Check size={18} className="mr-3.5 self-center text-bor" aria-label="Raqam to'g'ri" />}
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
            {band ? 'Kod yuborilmoqda…' : !tayyor ? 'Sahifa yuklanmoqda…' : 'Davom etish'}
          </button>

          <p className="text-center text-sm text-xira">
            {rejim === 'royxat' ? 'Hisobingiz bormi? ' : 'Hisobingiz yoqmi? '}
            <button type="button" onClick={() => rejimniAlmashtir(rejim === 'royxat' ? 'kirish' : 'royxat')} className="font-semibold text-brend hover:text-brend-quyuq">
              {rejim === 'royxat' ? 'Kirish' : 'Royxatdan otish'}
            </button>
          </p>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[28px] font-extrabold leading-[1.15] tracking-[-0.025em] sm:text-[30px]">
              Kodni kiriting
            </h1>
            <p className="text-[15px] text-xira">
              {kanal === 'bot_ulash' ? (
                <>Kod <span className="font-raqam font-semibold text-siyoh">{telefonMatni(raqam)}</span> uchun Telegram botimizga keladi.</>
              ) : kanal === 'gateway' ? (
                <><span className="font-raqam font-semibold text-siyoh">{telefonMatni(raqam)}</span> raqamiga kod yubordik — Telegram&apos;dagi «Verification Codes» xabarini oching.</>
              ) : (
                <><span className="font-raqam font-semibold text-siyoh">{telefonMatni(raqam)}</span> raqamiga kod yubordik — Telegram botimiz xabarida.</>
              )}
              {' '}
              <button
                type="button"
                onClick={() => {
                  setBosqich('telefon')
                  setXato(null)
                  setBotHavola(null)
                }}
                className="font-semibold text-brend hover:text-brend-quyuq"
              >
                Tahrirlash
              </button>
            </p>
          </div>

          {botHavola && (
            <div className="flex flex-col gap-3 rounded-[16px] border border-chiziq bg-yuza p-4">
              <a
                href={botHavola}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-[52px] items-center justify-center gap-2 rounded-[13px] bg-[#229ED9] text-[16px] font-semibold text-white transition hover:bg-[#1c8fc4]"
              >
                <Send size={19} aria-hidden />
                Telegram&apos;da ochish
              </a>
              <ol className="flex flex-col gap-1.5 text-[14px] text-siyoh-2">
                <li><span className="font-semibold text-siyoh">1.</span> Telegram ochilgach, pastdagi <b>START</b> tugmasini bosing</li>
                <li><span className="font-semibold text-siyoh">2.</span> «📱 Telefon raqamni yuborish» ni bosing</li>
                <li><span className="font-semibold text-siyoh">3.</span> Kelgan 6 raqamli kodni shu yerga kiriting</li>
              </ol>
              <p className="text-[13px] text-xira">Bu faqat birinchi marta — keyingi safar kod o‘zi keladi.</p>
            </div>
          )}

          <label className="flex flex-col gap-[7px]">
            <span className="text-sm font-semibold">6 raqamli kod</span>
            <input
              ref={kodMaydoni}
              name="kod"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoComplete="one-time-code"
              placeholder="000000"
              defaultValue={kod}
              onChange={e => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 6)
                if (e.target.value !== v) e.target.value = v
                setKod(v)
              }}
              autoFocus={!botHavola}
              suppressHydrationWarning
              className="h-[52px] rounded-[13px] border border-chiziq bg-yuza px-4 text-center font-raqam text-[22px] font-semibold tracking-[0.3em] outline-none transition placeholder:text-chiziq-2 focus:border-2 focus:border-brend focus:px-[15px] focus:shadow-[0_0_0_4px_var(--color-brend-och)]"
            />
          </label>

          <XatoQutisi xato={xato} onRoyxat={() => rejimniAlmashtir('royxat')} />

          <button
            type="submit"
            disabled={band || !tayyor}
            aria-busy={!tayyor || band}
            className="flex h-[54px] items-center justify-center gap-2 rounded-[14px] bg-brend text-[16.5px] font-semibold text-white transition hover:bg-brend-quyuq disabled:opacity-70"
          >
            {(band || !tayyor) && <Loader2 size={19} className="animate-spin" aria-hidden />}
            {band ? 'Tekshirilmoqda…' : !tayyor ? 'Sahifa yuklanmoqda…' : 'Tasdiqlash'}
          </button>

          <p className="text-center text-sm text-xira">
            {qaytaYuborish > 0 ? (
              `Kodni ${qaytaYuborish} soniyadan keyin qayta yuborishingiz mumkin`
            ) : (
              <button type="button" onClick={() => kodYubor()} disabled={band} className="font-semibold text-brend hover:text-brend-quyuq disabled:opacity-70">
                Kodni qayta yuborish
              </button>
            )}
          </p>

          <button
            type="button"
            onClick={() => {
              setBosqich('telefon')
              setXato(null)
            }}
            className="flex items-center justify-center gap-1.5 text-sm font-semibold text-siyoh-2 hover:text-siyoh"
          >
            <ArrowLeft size={16} />
            Orqaga
          </button>
        </>
      )}
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
                  Royxatdan otish <ArrowLeft size={14} className="rotate-180" aria-hidden />
                </button>
              </>
            )}
          </span>
        </div>
      )}
    </div>
  )
}
