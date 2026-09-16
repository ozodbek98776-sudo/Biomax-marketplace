'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle, Banknote, Bike, Check, CreditCard, Crosshair, Loader2, MapPin, Package, Store,
} from 'lucide-react'
import { toast } from 'sonner'
import { Narx } from '@/components/ui/Belgilar'
import { mahalliyQism, telefonniTozala } from '@/lib/domen/telefon'
import { cn } from '@/lib/cn'
import { useGidratatsiya } from '@/lib/gidratatsiya'

interface Props {
  qatorlar: { elonId: string; nomi: string; miqdor: number; birlik: string; jamiSom: number; rasm: string | null }[]
  mahsulotSumma: number
  hududlar: { nomi: string; narxSom: number; muddat: string }[]
  oraliqlar: { id: string; kun: 'bugun' | 'ertaga'; yorliq: string }[]
  manzillar: { id: string; nomi: string; hudud: string | null; manzil: string; moljal: string | null; lat: number | null; lng: number | null }[]
  standart: { ism: string; telefon: string }
  olibKetishManzili: string | null
}

type Yetkazish = 'KURYER' | 'OLIB_KETISH'
type Tolov = 'NAQD_YETKAZISHDA' | 'KARTA_YETKAZISHDA'

const YANGI = 'yangi'

/**
 * Rasmiylashtirish — bitta sahifada, qadamlarga bo'linmagan.
 *
 * Savat kichik (odatda 3–10 mahsulot) va maydonlar kam: ko'p bosqichli
 * "sehrgar" bu yerda faqat bosishlar sonini oshiradi. Bo'limlar raqamlangan,
 * xato bo'lsa sahifa aynan o'sha maydonga suriladi.
 */
export default function RasmiylashtirishFormasi(p: Props) {
  // JS ulanguncha buyurtma tugmasi o'chiq — brauzer formani o'zi yuborib ma'lumotni o'chirib yubormasin
  const tayyor = useGidratatsiya()
  const router = useRouter()
  const [yetkazish, setYetkazish] = useState<Yetkazish>('KURYER')
  const [manzilTanlov, setManzilTanlov] = useState<string>(p.manzillar[0]?.id ?? YANGI)
  const [hudud, setHudud] = useState(p.manzillar[0]?.hudud ?? p.hududlar[0]?.nomi ?? '')
  const [manzil, setManzil] = useState('')
  const [moljal, setMoljal] = useState('')
  const [nuqta, setNuqta] = useState<{ lat: number; lng: number } | null>(null)
  const [nuqtaHolati, setNuqtaHolati] = useState<'yoq' | 'kutilmoqda' | 'xato'>('yoq')
  const [manzilniSaqla, setManzilniSaqla] = useState(true)
  const [vaqt, setVaqt] = useState(p.oraliqlar[0]?.id ?? '')
  const [ism, setIsm] = useState(p.standart.ism)
  const [telefon, setTelefon] = useState(p.standart.telefon)
  const [tolov, setTolov] = useState<Tolov>('NAQD_YETKAZISHDA')
  const [izoh, setIzoh] = useState('')
  const [band, setBand] = useState(false)
  const [xato, setXato] = useState<{ matn: string; maydon?: string } | null>(null)

  const saqlangan = p.manzillar.find(m => m.id === manzilTanlov) ?? null
  const joriyHudud = yetkazish === 'KURYER' ? (saqlangan?.hudud ?? hudud) : null
  const hududNarxi = p.hududlar.find(h => h.nomi === joriyHudud)?.narxSom ?? 0
  const yetkazishNarx = yetkazish === 'KURYER' ? hududNarxi : 0
  // Saqlangan manzil hududi hozir xizmat ko'rsatilmaydigan bo'lib qolgan bo'lishi mumkin
  const saqlanganHududYaroqsiz = yetkazish === 'KURYER' && !!saqlangan && !p.hududlar.some(h => h.nomi === saqlangan.hudud)

  const jami = useMemo(() => p.mahsulotSumma + yetkazishNarx, [p.mahsulotSumma, yetkazishNarx])
  const kunlar = (['bugun', 'ertaga'] as const).map(k => ({ kun: k, oraliqlar: p.oraliqlar.filter(o => o.kun === k) }))

  function joylashuvniAniqla() {
    if (!('geolocation' in navigator)) return setNuqtaHolati('xato')
    setNuqtaHolati('kutilmoqda')
    navigator.geolocation.getCurrentPosition(
      pos => {
        setNuqta({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setNuqtaHolati('yoq')
      },
      () => setNuqtaHolati('xato'),
      { enableHighAccuracy: true, timeout: 15_000 },
    )
  }

  function maydongaSur(maydon?: string) {
    if (!maydon) return
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-maydon="${maydon}"]`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el?.querySelector<HTMLElement>('input, textarea, button')?.focus({ preventScroll: true })
    })
  }

  async function yubor(e: React.FormEvent) {
    e.preventDefault()
    setXato(null)

    // Tez mijoz tomoni tekshiruvi — server baribir hammasini qayta tekshiradi
    const tel = telefonniTozala(telefon)
    let x: { matn: string; maydon: string } | null = null
    if (yetkazish === 'KURYER' && !saqlangan && manzil.trim().length < 5) x = { matn: 'Manzilni to‘liq yozing: ko‘cha, uy, xonadon', maydon: 'manzil' }
    else if (saqlanganHududYaroqsiz) x = { matn: 'Bu manzil hududiga hozir yetkazmaymiz — boshqa manzil kiriting', maydon: 'manzil' }
    else if (!vaqt) x = { matn: 'Qulay vaqtni tanlang', maydon: 'vaqt' }
    else if (ism.trim().length < 2) x = { matn: 'Qabul qiluvchining ismini kiriting', maydon: 'aloqaIsm' }
    else if (!tel) x = { matn: 'Aloqa telefonini to‘liq kiriting', maydon: 'aloqaTel' }
    if (x) {
      setXato(x)
      maydongaSur(x.maydon)
      return
    }

    setBand(true)
    try {
      const tana = {
        yetkazish,
        hudud: joriyHudud,
        manzil: yetkazish === 'KURYER' ? (saqlangan?.manzil ?? manzil) : null,
        moljal: yetkazish === 'KURYER' ? (saqlangan ? saqlangan.moljal : moljal) : null,
        lat: yetkazish === 'KURYER' ? (saqlangan ? saqlangan.lat : nuqta?.lat) ?? null : null,
        lng: yetkazish === 'KURYER' ? (saqlangan ? saqlangan.lng : nuqta?.lng) ?? null : null,
        vaqt,
        aloqaIsm: ism,
        aloqaTel: tel,
        tolov,
        izoh,
        manzilniSaqla: !saqlangan && manzilniSaqla,
      }
      const j = await fetch('/api/buyurtma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tana),
      })
      const d: { raqam?: string; kod?: string; xato?: string; tafsilot?: { maydon?: string } } = await j.json().catch(() => ({}))
      if (!j.ok || !d.raqam) {
        if (d.kod === 'savat_bosh') {
          toast.error('Savat bo‘sh — buyurtma allaqachon yuborilgan bo‘lishi mumkin')
          router.replace('/kabinet#buyurtmalar')
          return
        }
        if (d.kod === 'vaqt_notogri') router.refresh() // eskirgan oraliqlar yangilansin
        setXato({ matn: d.xato ?? 'Buyurtma yuborilmadi', maydon: d.tafsilot?.maydon })
        maydongaSur(d.tafsilot?.maydon)
        setBand(false)
        return
      }
      router.replace(`/buyurtma/${encodeURIComponent(d.raqam)}?yangi=1`)
      router.refresh()
    } catch {
      setXato({ matn: 'Internet aloqasini tekshiring va qayta urinib ko‘ring' })
      setBand(false)
    }
  }

  const karta = 'rounded-[20px] border border-chiziq bg-yuza p-5 sm:p-6'
  const sarlavha = 'flex items-center gap-3 text-[17px] font-bold'
  const raqam = 'flex h-7 w-7 items-center justify-center rounded-full bg-siyoh font-raqam text-[13px] font-semibold text-qogoz'
  const maydonUslubi = 'w-full rounded-[13px] border border-chiziq bg-yuza px-4 text-base outline-none transition placeholder:text-xira focus:border-brend focus:ring-4 focus:ring-brend-och'

  return (
    <form onSubmit={yubor} method="post" noValidate className="mt-6 grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
      {/* Yuborilayotganda maydonlar qulflanadi — ketgan so'rov bilan ekrandagi tanlov farq qilmasin */}
      <fieldset disabled={band} className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0 disabled:opacity-70">
        {/* 1. Qabul qilish */}
        <section className={karta} data-maydon="yetkazish">
          <h2 className={sarlavha}><span className={raqam}>1</span>Qanday olasiz?</h2>
          <div role="radiogroup" aria-label="Qabul qilish usuli" className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
            <Tanlov
              tanlangan={yetkazish === 'KURYER'} onClick={() => setYetkazish('KURYER')}
              Ikonka={Bike} sarlavha="Kuryer olib keladi"
              izoh={`${p.hududlar.map(h => h.nomi).join(', ')} · ${p.hududlar[0]?.muddat ?? ''}`}
            />
            <Tanlov
              tanlangan={yetkazish === 'OLIB_KETISH'} onClick={() => setYetkazish('OLIB_KETISH')}
              Ikonka={Store} sarlavha="Do‘kondan olib ketaman" izoh="Bepul · tayyor bo‘lganda xabar beramiz"
            />
          </div>
        </section>

        {/* 2. Manzil */}
        {yetkazish === 'KURYER' ? (
          <section className={karta} data-maydon="manzil">
            <h2 className={sarlavha}><span className={raqam}>2</span>Manzil</h2>

            {p.manzillar.length > 0 && (
              <div role="radiogroup" aria-label="Saqlangan manzillar" className="mt-4 flex flex-col gap-2">
                {p.manzillar.map(m => (
                  <Tanlov
                    key={m.id} ixcham tanlangan={manzilTanlov === m.id} onClick={() => setManzilTanlov(m.id)}
                    Ikonka={MapPin} sarlavha={m.nomi} izoh={[m.hudud, m.manzil].filter(Boolean).join(', ')}
                  />
                ))}
                <Tanlov ixcham tanlangan={manzilTanlov === YANGI} onClick={() => setManzilTanlov(YANGI)} Ikonka={MapPin} sarlavha="Yangi manzil" />
              </div>
            )}

            {saqlanganHududYaroqsiz && (
              <p className="mt-3 rounded-xl bg-kam-och px-3.5 py-2.5 text-[13.5px] text-kam">
                Bu manzil hududiga hozircha yetkazmaymiz. Yangi manzil kiriting yoki do‘kondan olib keting.
              </p>
            )}

            {!saqlangan && (
              <div className="mt-4 flex flex-col gap-4">
                <div className="flex flex-col gap-[7px]" data-maydon="hudud">
                  <span className="text-sm font-semibold" id="hudud-yorliq">Tuman</span>
                  <div role="radiogroup" aria-labelledby="hudud-yorliq" className="flex flex-wrap gap-2">
                    {p.hududlar.map(h => (
                      <button
                        key={h.nomi} type="button" role="radio" aria-checked={hudud === h.nomi} onClick={() => setHudud(h.nomi)}
                        className={cn(
                          'flex h-11 items-center gap-2 rounded-xl border px-4 text-[14.5px] font-medium transition',
                          hudud === h.nomi ? 'border-siyoh bg-siyoh text-qogoz' : 'border-chiziq bg-yuza text-siyoh-2 hover:border-chiziq-2',
                        )}
                      >
                        {h.nomi}
                        <span className={cn('text-[12.5px]', hudud === h.nomi ? 'text-qogoz/70' : 'text-xira')}>
                          <Narx som={h.narxSom} className="text-[12.5px] font-medium" />
                        </span>
                      </button>
                    ))}
                  </div>
                  <span className="text-[12.5px] text-xira">Boshqa tumanlarga tez orada yetkazamiz.</span>
                </div>

                <label className="flex flex-col gap-[7px]">
                  <span className="text-sm font-semibold">Ko‘cha, uy, xonadon</span>
                  <textarea
                    value={manzil} onChange={e => setManzil(e.target.value)} rows={2} maxLength={200}
                    autoComplete="street-address" placeholder="Masalan: Qatortol ko‘chasi 12-uy, 45-xonadon, 3-qavat"
                    aria-invalid={xato?.maydon === 'manzil'}
                    className={cn(maydonUslubi, 'resize-none py-3 leading-snug', xato?.maydon === 'manzil' && 'border-brend')}
                  />
                </label>

                <label className="flex flex-col gap-[7px]">
                  <span className="text-sm font-semibold">Mo‘ljal <span className="font-normal text-xira">(ixtiyoriy)</span></span>
                  <input value={moljal} onChange={e => setMoljal(e.target.value)} maxLength={120} placeholder="Masalan: Makro yonida, qizil darvoza" className={cn(maydonUslubi, 'h-12')} />
                </label>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button" onClick={joylashuvniAniqla} disabled={nuqtaHolati === 'kutilmoqda'}
                    className={cn(
                      'flex h-11 items-center gap-2 rounded-xl border px-4 text-[14px] font-semibold transition',
                      nuqta ? 'border-bor bg-bor-och text-bor' : 'border-chiziq bg-yuza text-siyoh hover:border-chiziq-2',
                    )}
                  >
                    {nuqtaHolati === 'kutilmoqda' ? <Loader2 size={17} className="animate-spin" aria-hidden />
                      : nuqta ? <Check size={17} aria-hidden /> : <Crosshair size={17} aria-hidden />}
                    {nuqta ? 'Joylashuv belgilandi' : 'Joylashuvimni yuborish'}
                  </button>
                  <span className="text-[12.5px] text-xira">
                    {nuqtaHolati === 'xato' ? 'Joylashuv aniqlanmadi — manzil matni yetarli.' : 'Ixtiyoriy: kuryer sizni tezroq topadi.'}
                  </span>
                </div>

                <label className="flex cursor-pointer items-center gap-2.5 text-sm text-siyoh-2">
                  <input type="checkbox" checked={manzilniSaqla} onChange={e => setManzilniSaqla(e.target.checked)} className="h-[18px] w-[18px] accent-[var(--color-brend)]" />
                  Keyingi buyurtmalar uchun saqlash
                </label>
              </div>
            )}
          </section>
        ) : (
          <section className={karta}>
            <h2 className={sarlavha}><span className={raqam}>2</span>Olib ketish joyi</h2>
            <p className="mt-3 flex items-start gap-2.5 text-[15px] text-siyoh-2">
              <Store size={19} className="mt-0.5 shrink-0 text-xira" aria-hidden />
              {p.olibKetishManzili ?? 'Do‘kon manzili buyurtma tasdiqlanganda Telegram orqali yuboriladi.'}
            </p>
          </section>
        )}

        {/* 3. Vaqt */}
        <section className={karta} data-maydon="vaqt">
          <h2 className={sarlavha}><span className={raqam}>3</span>{yetkazish === 'KURYER' ? 'Qachon olib kelaylik?' : 'Qachon olib ketasiz?'}</h2>
          {p.oraliqlar.length === 0 ? (
            <p className="mt-3 text-sm text-xira">Hozir bo‘sh vaqt yo‘q — sahifani keyinroq yangilang.</p>
          ) : (
            <div className="mt-4 flex flex-col gap-4">
              {kunlar.filter(k => k.oraliqlar.length > 0).map(k => (
                <div key={k.kun} className="flex flex-col gap-2">
                  <span className="text-[13px] font-semibold uppercase tracking-[0.05em] text-xira">{k.kun === 'bugun' ? 'Bugun' : 'Ertaga'}</span>
                  <div role="radiogroup" aria-label={k.kun} className="flex flex-wrap gap-2">
                    {k.oraliqlar.map(o => (
                      <button
                        key={o.id} type="button" role="radio" aria-checked={vaqt === o.id} onClick={() => setVaqt(o.id)}
                        className={cn(
                          'flex h-11 items-center rounded-xl border px-4 text-[14.5px] font-medium tabular-nums transition',
                          vaqt === o.id ? 'border-siyoh bg-siyoh text-qogoz' : 'border-chiziq bg-yuza text-siyoh-2 hover:border-chiziq-2',
                        )}
                      >
                        {o.yorliq.replace(/^(Bugun|Ertaga), /, '')}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 4. Aloqa */}
        <section className={karta}>
          <h2 className={sarlavha}><span className={raqam}>4</span>Qabul qiluvchi</h2>
          <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-[7px]" data-maydon="aloqaIsm">
              <span className="text-sm font-semibold">Ism</span>
              <input value={ism} onChange={e => setIsm(e.target.value)} maxLength={60} autoComplete="name" className={cn(maydonUslubi, 'h-12', xato?.maydon === 'aloqaIsm' && 'border-brend')} />
            </label>
            <label className="flex flex-col gap-[7px]" data-maydon="aloqaTel">
              <span className="text-sm font-semibold">Telefon</span>
              <span className={cn('flex h-12 items-stretch overflow-hidden rounded-[13px] border border-chiziq bg-yuza transition focus-within:border-brend focus-within:ring-4 focus-within:ring-brend-och', xato?.maydon === 'aloqaTel' && 'border-brend')}>
                <span className="flex items-center border-r border-chiziq bg-qogoz px-3 font-raqam text-[15px] text-siyoh-2">+998</span>
                <input value={telefon} onChange={e => setTelefon(mahalliyQism(e.target.value))} type="tel" inputMode="tel" autoComplete="tel-national" className="min-w-0 flex-1 bg-transparent px-3 font-raqam text-base outline-none" />
              </span>
            </label>
          </div>
          <label className="mt-4 flex flex-col gap-[7px]">
            <span className="text-sm font-semibold">Izoh <span className="font-normal text-xira">(ixtiyoriy)</span></span>
            <textarea value={izoh} onChange={e => setIzoh(e.target.value)} rows={2} maxLength={300} placeholder="Masalan: qo‘ng‘iroq qilmang, eshik oldiga qoldiring" className={cn(maydonUslubi, 'resize-none py-3 leading-snug')} />
          </label>
        </section>

        {/* 5. To'lov */}
        <section className={karta} data-maydon="tolov">
          <h2 className={sarlavha}><span className={raqam}>5</span>To‘lov</h2>
          <div role="radiogroup" aria-label="To‘lov usuli" className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
            <Tanlov tanlangan={tolov === 'NAQD_YETKAZISHDA'} onClick={() => setTolov('NAQD_YETKAZISHDA')} Ikonka={Banknote} sarlavha="Naqd pul" izoh="Qabul qilganda" />
            <Tanlov tanlangan={tolov === 'KARTA_YETKAZISHDA'} onClick={() => setTolov('KARTA_YETKAZISHDA')} Ikonka={CreditCard} sarlavha="Karta" izoh="Qabul qilganda — terminal orqali" />
          </div>
        </section>
      </fieldset>

      {/* Xulosa */}
      <aside className="flex flex-col gap-4 rounded-[20px] border border-chiziq bg-yuza p-5 sm:p-6 lg:sticky lg:top-[96px]">
        <h2 className="text-lg font-bold">Buyurtmangiz</h2>
        <ul className="flex max-h-[260px] flex-col gap-3 overflow-y-auto pr-1">
          {p.qatorlar.map(q => (
            <li key={q.elonId} className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-linear-to-br from-rasm-1 to-rasm-2">
                {q.rasm
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={q.rasm} alt="" className="h-full w-full object-cover" />
                  : <Package size={20} strokeWidth={1.5} className="text-chiziq-2" aria-hidden />}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[14px] font-medium">{q.nomi}</span>
                <span className="text-[12.5px] text-xira">{q.miqdor} {q.birlik}</span>
              </span>
              <Narx som={q.jamiSom} className="text-[14px] font-semibold" />
            </li>
          ))}
        </ul>
        <dl className="flex flex-col gap-2.5 border-t border-chiziq pt-4 text-[14.5px]">
          <div className="flex justify-between gap-4">
            <dt className="text-siyoh-2">Mahsulotlar</dt>
            <dd><Narx som={p.mahsulotSumma} className="text-[14.5px] font-semibold" /></dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-siyoh-2">Yetkazish</dt>
            <dd>{yetkazishNarx > 0 ? <Narx som={yetkazishNarx} className="text-[14.5px] font-semibold" /> : <span className="font-semibold text-bor">Bepul</span>}</dd>
          </div>
        </dl>
        <div className="flex items-baseline justify-between gap-4 border-t border-chiziq pt-4">
          <span className="font-semibold">Jami</span>
          <Narx som={jami} className="text-[24px]" />
        </div>

        <div aria-live="polite">
          {xato && (
            <p role="alert" className="flex items-start gap-2.5 rounded-xl bg-brend-och px-3.5 py-3 text-[14px] leading-snug text-brend">
              <AlertCircle size={18} className="mt-px shrink-0" aria-hidden />{xato.matn}
            </p>
          )}
        </div>

        <button
          type="submit" disabled={band || !tayyor || p.oraliqlar.length === 0}
          aria-busy={band || !tayyor}
          className="flex h-[54px] items-center justify-center gap-2 rounded-[14px] bg-brend text-[16.5px] font-semibold text-white transition hover:bg-brend-quyuq disabled:opacity-70"
        >
          {(band || !tayyor) && <Loader2 size={19} className="animate-spin" aria-hidden />}
          {band ? 'Yuborilmoqda…' : !tayyor ? 'Sahifa yuklanmoqda…' : 'Buyurtma berish'}
        </button>
        <p className="-mt-1 text-center text-[12.5px] leading-snug text-xira">
          Oldindan to‘lov yo‘q. Do‘kon buyurtmani tasdiqlagach, holati Telegram’ingizga va kabinetingizga keladi.
        </p>
      </aside>
    </form>
  )
}

function Tanlov({
  tanlangan, onClick, Ikonka, sarlavha, izoh, ixcham,
}: {
  tanlangan: boolean
  onClick: () => void
  Ikonka: typeof Bike
  sarlavha: string
  izoh?: string
  ixcham?: boolean
}) {
  return (
    <button
      type="button" role="radio" aria-checked={tanlangan} onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl border text-left transition',
        ixcham ? 'px-3.5 py-3' : 'p-4',
        tanlangan ? 'border-2 border-brend bg-brend-och/40' : 'border-chiziq bg-yuza hover:border-chiziq-2',
      )}
    >
      <span className={cn('flex shrink-0 items-center justify-center rounded-xl', ixcham ? 'h-9 w-9' : 'h-11 w-11', tanlangan ? 'bg-brend text-white' : 'bg-yuza-2 text-siyoh-2')}>
        <Ikonka size={ixcham ? 18 : 21} strokeWidth={1.9} aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[15px] font-semibold">{sarlavha}</span>
        {izoh && <span className="truncate text-[13px] text-xira">{izoh}</span>}
      </span>
      <span aria-hidden className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2', tanlangan ? 'border-brend bg-brend' : 'border-chiziq-2')}>
        {tanlangan && <span className="h-2 w-2 rounded-full bg-white" />}
      </span>
    </button>
  )
}
