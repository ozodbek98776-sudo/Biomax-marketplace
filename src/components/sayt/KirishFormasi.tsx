'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowLeft, Check, Loader2, MessageSquareText, Send, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Narx } from '@/components/ui/Belgilar'
import { mahalliyQism, telefonMatni, telefonniTozala } from '@/lib/domen/telefon'
import { cn } from '@/lib/cn'
import { useGidratatsiya } from '@/lib/gidratatsiya'

type Rejim = 'royxat' | 'kirish'

interface Props {
  boshRejim: Rejim
  keyin: string
  tovar: { slug: string; nomi: string; narxSom: number | null } | null
  /** Rivojlanish rejimi: kod Telegram'ga yuborilmaydi, ekranda ko'rsatiladi. */
  sinovRejimi: boolean
  /**
   * Kirishda Telegram kodi so'raladimi. `false` — raqam bilan darhol kiriladi
   * (sozlamada `KIRISH_KODI`; 2026-09-18 dan hozircha o'chiq).
   */
  kodBilan: boolean
}

const QAYTA_SONIYA = 60

/** Faqat hodisa ishlovchilarida chaqiriladi (render paytida emas). */
function vaqtBelgisi(): number {
  return Date.now()
}

interface XatoJavob { kod?: string; xato?: string; tafsilot?: { soniya?: number; sabab?: string } }
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
 * Ro'yxatdan o'tish / kirish.
 *
 * Kod yoqilgan bo'lsa — ikki qadam: raqam, so'ng Telegram'ga kelgan kod.
 * O'chiq bo'lsa — bitta qadam: raqam (va ro'yxatda ism) bilan darhol kiriladi.
 *
 * Parol yo'q: do'kon mijozi uchun parol eslab qolish — ortiqcha to'siq,
 * telefon raqami esa kuryer uchun baribir kerak.
 */
export default function KirishFormasi({ boshRejim, keyin, tovar, sinovRejimi, kodBilan }: Props) {
  const router = useRouter()
  const [rejim, setRejim] = useState<Rejim>(boshRejim)
  const [qadam, setQadam] = useState<1 | 2>(1)
  const [ism, setIsm] = useState('')
  const [raqam, setRaqam] = useState('')
  const [rozi, setRozi] = useState(false)
  const [kod, setKod] = useState('')
  const [xato, setXato] = useState<{ matn: string; kod?: string } | null>(null)
  const [band, setBand] = useState(false)
  const [devKod, setDevKod] = useState<string | null>(null)
  const [qaytaVaqti, setQaytaVaqti] = useState(0)
  const [hozir, setHozir] = useState(0)
  const kodMaydoni = useRef<HTMLInputElement>(null)
  // JS ulanguncha yuborish o'chiq — aks holda brauzer formani o'zi yuborib sahifani qayta yuklaydi
  const tayyor = useGidratatsiya()
  const ismMaydoni = useRef<HTMLInputElement>(null)
  const raqamMaydoni = useRef<HTMLInputElement>(null)
  const roziMaydoni = useRef<HTMLInputElement>(null)

  const telefon = telefonniTozala(raqam)
  const qoldi = Math.max(0, Math.ceil((qaytaVaqti - hozir) / 1000))

  // Qayta yuborish sanog'i
  useEffect(() => {
    if (qadam !== 2) return
    const t = setInterval(() => setHozir(vaqtBelgisi()), 500)
    return () => clearInterval(t)
  }, [qadam])

  function rejimniAlmashtir(r: Rejim) {
    setRejim(r)
    setXato(null)
  }

  async function kodSo(e?: React.FormEvent) {
    e?.preventDefault()
    setXato(null)
    // Sahifa JS'i kelmasdan yozilgan qiymatlar state'ga tushmagan bo'lishi mumkin — maydonning o'zidan olinadi
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

    if (!kodBilan) {
      setBand(true)
      const k = await yubor<Kirildi>('/api/kirish', { rejim, telefon: tel, ism: ismQiymati.trim() })
      if (!k.ok) {
        setBand(false)
        return setXato({ matn: k.x.xato ?? 'Kirib bo‘lmadi', kod: k.x.kod })
      }
      return kirildi(k.d)
    }

    setBand(true)
    const n = await yubor<{ amalQiladiSoniya: number; devKod?: string } | (Kirildi & { kodsiz: true })>('/api/kirish/kod', {
      rejim, telefon: tel, ism: ismQiymati.trim(),
    })
    setBand(false)

    if (!n.ok) {
      // Kod yaqinda yuborilgan va hali kutilyapti — 2-qadamga o'tkazamiz, yangi kod shart emas.
      // Soatlik chegarada bunday qilinmaydi: u yerda kiritsa bo'ladigan kod bo'lmasligi mumkin.
      if (n.x.kod === 'tezlik_chegarasi' && n.x.tafsilot?.sabab === 'kutish' && n.x.tafsilot.soniya && qadam === 1 && n.x.tafsilot.soniya <= QAYTA_SONIYA) {
        const t = vaqtBelgisi()
        setQaytaVaqti(t + n.x.tafsilot.soniya * 1000)
        setHozir(t)
        setQadam(2)
        setXato({ matn: 'Kod yaqinda yuborilgan — Telegram’dagi o‘sha kodni kiriting' })
        return
      }
      return setXato({ matn: n.x.xato ?? 'Kod yuborilmadi', kod: n.x.kod })
    }

    // Kodni yetkazib bo'lmadi (do'kon tizimi bilan aloqa yo'q) — server
    // mijozni kodsiz kiritdi, kod bosqichi kerak emas
    if ('kodsiz' in n.d) return kirildi(n.d)

    setDevKod(n.d.devKod ?? null)
    setKod('')
    const t = vaqtBelgisi()
    setQaytaVaqti(t + QAYTA_SONIYA * 1000)
    setHozir(t)
    setQadam(2)
    if (qadam === 2) toast.success('Yangi kod yuborildi')
    requestAnimationFrame(() => kodMaydoni.current?.focus())
  }

  async function tasdiqla(qiymat: string) {
    if (qiymat.length !== 6 || band) return
    setXato(null)
    setBand(true)
    const n = await yubor<Kirildi>('/api/kirish/tasdiq', {
      telefon, kod: qiymat, ism: ism.trim(),
    })
    if (!n.ok) {
      setBand(false)
      setKod('')
      setXato({ matn: n.x.xato ?? 'Tasdiqlanmadi', kod: n.x.kod })
      requestAnimationFrame(() => kodMaydoni.current?.focus())
      return
    }
    await kirildi(n.d)
  }

  /** Hisobga kirildi (kod bilan ham, kodsiz ham) — savat, salom, qaytish. */
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

  // ─── 2-qadam: kod ────────────────────────────────────────────────
  if (qadam === 2 && telefon) {
    return (
      <div className="flex flex-col gap-6">
        <Qadamlar joriy={2} />

        <div className="flex flex-col gap-2">
          <h1 className="text-[28px] font-extrabold leading-[1.15] tracking-[-0.025em] sm:text-[30px]">Kodni kiriting</h1>
          <p className="text-[15px] leading-relaxed text-siyoh-2">
            Kodni <span className="font-raqam font-semibold text-siyoh">{telefonMatni(telefon)}</span> raqamidagi Telegram’ingizga yubordik.{' '}
            <button
              type="button"
              onClick={() => { setQadam(1); setXato(null); setKod('') }}
              className="font-semibold text-brend hover:text-brend-quyuq"
            >
              O‘zgartirish
            </button>
          </p>
        </div>

        {sinovRejimi && devKod && (
          <div className="flex items-center gap-3 rounded-[14px] border border-dashed border-kam bg-kam-och px-4 py-3 text-[13.5px] text-kam">
            <MessageSquareText size={18} className="shrink-0" aria-hidden />
            <span>Sinov rejimi (kod Telegram’ga yuborilmadi). Kod: <strong className="font-raqam text-[15px] tracking-[0.15em]">{devKod}</strong></span>
          </div>
        )}

        {/* Bitta haqiqiy maydon, ustida 6 ta ko'rinadigan katak. Alohida 6 ta
            input bo'lsa telefonning "kodni qo'yish" taklifi va
            joylashtirish (paste) ishlamay qoladi. */}
        <label className="group relative block">
          <span className="sr-only">6 xonali kod</span>
          <input
            ref={kodMaydoni}
            value={kod}
            onChange={e => {
              const q = e.target.value.replace(/\D/g, '').slice(0, 6)
              setKod(q)
              if (q.length === 6) tasdiqla(q)
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            autoFocus
            disabled={band}
            aria-invalid={!!xato}
            aria-describedby={xato ? 'kirish-xato' : undefined}
            suppressHydrationWarning
            className="absolute inset-0 z-10 h-full w-full cursor-text bg-transparent text-transparent caret-transparent opacity-0 outline-none"
          />
          <span className="grid grid-cols-6 gap-2" aria-hidden>
            {Array.from({ length: 6 }, (_, i) => {
              const faol = i === Math.min(kod.length, 5) && !band
              return (
                <span
                  key={i}
                  className={cn(
                    'flex h-[58px] items-center justify-center rounded-[13px] border bg-yuza font-raqam text-2xl font-semibold transition',
                    xato ? 'border-brend' : 'border-chiziq',
                    faol && 'group-focus-within:border-2 group-focus-within:border-brend group-focus-within:shadow-[0_0_0_4px_var(--color-brend-och)]',
                  )}
                >
                  {kod[i] ?? (faol ? <span className="hidden h-[26px] w-0.5 animate-pulse bg-brend group-focus-within:block" /> : null)}
                </span>
              )
            })}
          </span>
        </label>

        <XatoQutisi xato={xato} onRoyxat={() => { setQadam(1); rejimniAlmashtir('royxat') }} />

        <div className="flex items-center gap-2 text-sm text-xira">
          {qoldi > 0 ? (
            <>Kodni qayta yuborish — <span className="font-raqam font-semibold text-siyoh">{Math.floor(qoldi / 60)}:{String(qoldi % 60).padStart(2, '0')}</span></>
          ) : (
            <button type="button" onClick={() => kodSo()} disabled={band} className="font-semibold text-brend hover:text-brend-quyuq disabled:opacity-60">
              Kodni qayta yuborish
            </button>
          )}
        </div>

        {!(sinovRejimi && devKod) && (
          <div className="flex gap-3 rounded-[14px] border border-chiziq bg-yuza p-3.5">
            <Send size={19} className="mt-px shrink-0 text-kok" aria-hidden />
            <span className="text-[13.5px] leading-normal text-siyoh-2">
              Telegram ilovasini oching — kod do‘konimiz akkauntidan xabar bo‘lib keladi. Ko‘rinmasa, «Arxiv» yoki
              notanish xabarlar bo‘limini tekshiring.
            </span>
          </div>
        )}

        <div className="flex gap-3 rounded-[14px] border border-chiziq bg-yuza p-3.5">
          <ShieldCheck size={19} className="mt-px shrink-0 text-bor" aria-hidden />
          <span className="text-[13.5px] leading-normal text-siyoh-2">Kodni hech kimga aytmang. BioMax xodimlari uni hech qachon so‘ramaydi.</span>
        </div>

        <button
          type="button"
          onClick={() => tasdiqla(kod)}
          disabled={band || kod.length !== 6}
          className="flex h-[54px] items-center justify-center gap-2 rounded-[14px] bg-brend text-[16.5px] font-semibold text-white transition hover:bg-brend-quyuq disabled:opacity-60"
        >
          {band && <Loader2 size={19} className="animate-spin" aria-hidden />}
          Tasdiqlash
        </button>
      </div>
    )
  }

  // ─── 1-qadam: raqam ──────────────────────────────────────────────
  return (
    // `method="post"`: sahifa hali yuklanmay turib yuborilsa ham raqam URL'ga
    // (va server jurnaliga) tushmasin
    <form onSubmit={kodSo} method="post" noValidate className="flex flex-col gap-6">
      {kodBilan && <Qadamlar joriy={1} />}

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
          {kodBilan
            ? 'Tasdiqlash kodini shu raqamdagi Telegram’ingizga yuboramiz.'
            : rejim === 'royxat'
              ? 'Ismingiz va telefon raqamingiz yetarli — kuryer shu raqamga qo‘ng‘iroq qiladi.'
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
            {/* Boshqarilmaydigan maydon (defaultValue): JS kelmasdan yozilgan ismni React ulanganda o'chirib yubormaydi */}
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
            {/* Boshqarilmaydigan maydon: sekin internetda JS kelmasdan yozilgan raqam saqlanadi.
                Formatlash (90 123 45 67) yozish paytida maydonning o'ziga qo'llanadi. */}
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
            {/* Ko'rinish CSS'dan (peer-checked) — JS kelmasdan belgilangan katak ham to'g'ri ko'rinadi */}
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
          ? (kodBilan ? 'Telegram’ga yuborilmoqda…' : 'Kirilmoqda…')
          : !tayyor
            ? 'Sahifa yuklanmoqda…'
            : kodBilan ? 'Kod yuborish' : rejim === 'royxat' ? 'Ro‘yxatdan o‘tish' : 'Kirish'}
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

function Qadamlar({ joriy }: { joriy: 1 | 2 }) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-[13.5px] text-xira">Qadam <strong className="text-siyoh">{joriy}</strong> / 2</span>
      <div className="flex gap-1.5" aria-hidden>
        <span className="h-[3px] flex-1 rounded-full bg-brend" />
        <span className={cn('h-[3px] flex-1 rounded-full', joriy === 2 ? 'bg-brend' : 'bg-chiziq')} />
      </div>
    </div>
  )
}

function XatoQutisi({ xato, onRoyxat }: { xato: { matn: string; kod?: string } | null; onRoyxat: () => void }) {
  return (
    <div aria-live="polite" id="kirish-xato">
      {xato && (
        <div role="alert" className="flex items-start gap-2.5 rounded-xl bg-brend-och px-3.5 py-3 text-[14px] leading-snug text-brend">
          <AlertCircle size={18} className="mt-px shrink-0" aria-hidden />
          <span className="flex-1">
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
