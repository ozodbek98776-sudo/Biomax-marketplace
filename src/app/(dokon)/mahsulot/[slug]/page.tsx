import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { AlertTriangle, Banknote, ChevronRight, Clock, RotateCcw, ShieldCheck, Store, Truck } from 'lucide-react'
import Qobiq, { KONTEYNER } from '@/components/Qobiq'
import MahsulotKartasi from '@/components/MahsulotKartasi'
import SavatgaTugma from '@/components/sayt/SavatgaTugma'
import Galereya from '@/components/sayt/Galereya'
import Ulashish from '@/components/sayt/Ulashish'
import YaqindaKorilgan from '@/components/sayt/YaqindaKorilgan'
import { MavjudlikBelgisi, Narx } from '@/components/ui/Belgilar'
import { vitrina, type VitrinaTovari } from '@/lib/domen/vitrina'
import { kartaga } from '@/lib/domen/karta'
import { aksiyaQoldi, hajmMatni } from '@/lib/domen/mahsulot'
import { vaqtOraliqlari } from '@/lib/domen/buyurtma'
import { joriyHisob } from '@/lib/hisob'
import { dokonAloqa } from '@/lib/dokon-server'
import { DOKON, faolHududlarMatni } from '@/lib/dokon'
import { narxMatni } from '@/lib/domen/narx'
import { sozlama } from '@/lib/sozlama'
import { cn } from '@/lib/cn'

type Parametrlar = Promise<{ slug: string }>

/**
 * Slug kirill harflarida bo'lishi mumkin ("шампун-каварик") va parametr
 * foiz-kodlangan holda keladi. Dekodlanmasa topilmaydi va 404.
 */
function slugOqi(xom: string): string {
  try {
    return decodeURIComponent(xom)
  } catch {
    return xom
  }
}

async function topish(slug: string) {
  const v = await vitrina()
  if (!v.ok) return { xato: v.xato.xabar } as const
  const t = v.qiymat.find(x => x.slug === slug) ?? null
  return { t, hammasi: v.qiymat } as const
}

export async function generateMetadata({ params }: { params: Parametrlar }): Promise<Metadata> {
  const n = await topish(slugOqi((await params).slug))
  const t = 'xato' in n ? null : n.t
  if (!t) return { title: 'Mahsulot' }
  const tavsif = t.tavsif?.replace(/\s+/g, ' ').slice(0, 160)
    ?? `${t.nomi} — ${narxMatni(t.narxSom ?? 0)}. BioMax do‘konidan ${faolHududlarMatni}ga 2 soatda yetkazamiz.`
  return {
    title: t.nomi,
    description: tavsif,
    alternates: { canonical: `/mahsulot/${t.slug}` },
    openGraph: {
      title: t.nomi,
      description: tavsif,
      type: 'website',
      images: t.rasmlar[0] ? [{ url: t.rasmlar[0], alt: t.nomi }] : undefined,
    },
  }
}

const MAVJUDLIK_IZOH = {
  BOR: 'Omborda bor',
  KAM: 'Kam qoldi — tezroq buyurtma bering',
  YOQ: 'Hozir mavjud emas',
} as const

export default async function MahsulotSahifasi({ params }: { params: Parametrlar }) {
  const slug = slugOqi((await params).slug)
  const [n, hisob, aloqa] = await Promise.all([topish(slug), joriyHisob(), dokonAloqa()])

  if ('xato' in n) {
    return (
      <Qobiq>
        <div className={cn(KONTEYNER, 'py-10')}>
          <div className="rounded-[20px] border border-chiziq bg-yuza px-6 py-14 text-center">
            <AlertTriangle size={32} strokeWidth={1.5} className="mx-auto text-chiziq-2" aria-hidden />
            <p className="mt-3 text-[15px] font-semibold">Mahsulot vaqtincha ochilmadi</p>
            <p className="mt-1 text-[13.5px] text-xira">{n.xato}</p>
          </div>
        </div>
      </Qobiq>
    )
  }
  const t = n.t
  if (!t) notFound()

  // O'xshash: shu turkumdan, avval mavjudlari
  const oxshash = n.hammasi
    .filter(x => x.elonId !== t.elonId && x.kategoriya?.id === t.kategoriya?.id)
    .sort((a, b) => Number(a.mavjudlik === 'YOQ') - Number(b.mavjudlik === 'YOQ'))
    .slice(0, 4)
  const hududlar = DOKON.hududlar.filter(h => h.faol)
  const minNarx = Math.min(...hududlar.map(h => h.narxSom))
  const eng = vaqtOraliqlari()[0] ?? null
  const yetkazishVaqti = eng
    ? eng.id === 'tez' ? 'Bugun, 2 soat ichida' : eng.yorliq
    : null
  const qoldi = aksiyaQoldi(t.aksiyaOxiri)
  const oynaTovari = { slug: t.slug, nomi: t.nomi, narxSom: t.narxSom, rasm: t.rasmlar[0] ?? null }
  const hajm = t.hajm ? hajmMatni(t.hajm.miqdor, t.hajm.birlik) : null

  // Qidiruv tizimlari va Telegram uchun tuzilgan ma'lumot (schema.org/Product)
  const sayt = sozlama.SAYT_URL.replace(/\/$/, '')
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: t.nomi,
    ...(t.tavsif ? { description: t.tavsif.slice(0, 5000) } : {}),
    ...(t.rasmlar.length ? { image: t.rasmlar.map(r => sayt + r) } : {}),
    ...(t.brend ? { brand: { '@type': 'Brand', name: t.brend } } : {}),
    ...(t.kategoriya ? { category: t.kategoriya.nomi } : {}),
    ...(t.narxSom !== null ? {
      offers: {
        '@type': 'Offer',
        url: `${sayt}/mahsulot/${encodeURIComponent(t.slug)}`,
        priceCurrency: 'UZS',
        price: Math.round(t.narxSom),
        availability: t.mavjudlik === 'YOQ' ? 'https://schema.org/OutOfStock' : t.mavjudlik === 'KAM' ? 'https://schema.org/LimitedAvailability' : 'https://schema.org/InStock',
        ...(t.aksiyaOxiri ? { priceValidUntil: t.aksiyaOxiri.slice(0, 10) } : {}),
      },
    } : {}),
  }

  return (
    <Qobiq>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />

      <div className={cn(KONTEYNER, 'pb-28 pt-5 sm:pt-7 md:pb-16')}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2 sm:mb-6">
          <nav aria-label="Yo‘l" className="flex min-w-0 items-center gap-1 text-[13.5px] text-xira">
            <Link href="/" className="shrink-0 hover:text-siyoh">Bosh sahifa</Link>
            <ChevronRight size={14} className="shrink-0" aria-hidden />
            <Link href="/katalog" className="shrink-0 hover:text-siyoh">Mahsulotlar</Link>
            {t.kategoriya && (
              <>
                <ChevronRight size={14} className="shrink-0" aria-hidden />
                <Link href={`/katalog?kategoriya=${encodeURIComponent(t.kategoriya.id)}`} className="truncate hover:text-siyoh">{t.kategoriya.nomi}</Link>
              </>
            )}
          </nav>
          <Ulashish nomi={t.nomi} yol={`/mahsulot/${t.slug}`} />
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] md:gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)_340px] lg:gap-8">
          {/* Galereya */}
          <Galereya
            rasmlar={t.rasmlar}
            nomi={t.nomi}
            belgilar={<>
              {t.chegirmaFoiz !== null && <span className="rounded-full bg-brend px-2.5 py-1.5 text-[13px] font-bold leading-none text-white">−{t.chegirmaFoiz}%</span>}
              <MavjudlikBelgisi holat={t.mavjudlik} className="px-3 py-1.5 text-[13px]" />
            </>}
          />

          {/* Ma'lumot */}
          <div className="flex min-w-0 flex-col gap-5">
            <div className="flex flex-col gap-2">
              {(t.brend || hajm) && (
                <span className="text-sm text-xira">{[t.brend, hajm].filter(Boolean).join(' · ')}</span>
              )}
              <h1 className="text-[24px] font-extrabold leading-[1.18] tracking-[-0.025em] sm:text-[30px]">{t.nomi}</h1>
              <span className={cn('flex items-center gap-2 text-sm font-medium', t.mavjudlik === 'BOR' ? 'text-bor' : t.mavjudlik === 'KAM' ? 'text-kam' : 'text-xira')}>
                <span className="h-2 w-2 rounded-full bg-current" aria-hidden />
                {MAVJUDLIK_IZOH[t.mavjudlik]}
              </span>
            </div>

            {t.xususiyatlar.length > 0 && (
              <section aria-labelledby="qisqa-xus" className="flex flex-col gap-2">
                <h2 id="qisqa-xus" className="sr-only">Asosiy xususiyatlar</h2>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[14.5px]">
                  {t.xususiyatlar.slice(0, 5).map(x => (
                    <div key={x.nomi} className="contents">
                      <dt className="text-xira">{x.nomi}</dt>
                      <dd className="min-w-0 break-words">{x.qiymat}</dd>
                    </div>
                  ))}
                </dl>
                {t.xususiyatlar.length > 5 && <a href="#xususiyatlar" className="self-start text-sm font-semibold text-brend">Barcha xususiyatlar</a>}
              </section>
            )}

            {/* Telefon va planshetda narx bloki shu yerda; kompyuterda o'ng ustunda */}
            <div className="lg:hidden">
              <NarxBloki t={t} oynaTovari={oynaTovari} qoldi={qoldi} />
            </div>

            <YetkazishBloki yetkazishVaqti={yetkazishVaqti} hududlar={faolHududlarMatni} minNarx={minNarx} manzil={aloqa.manzil} />
          </div>

          {/* Kompyuter: yopishqoq xarid ustuni */}
          <aside className="hidden lg:block">
            <div className="sticky top-[96px] flex flex-col gap-4">
              <NarxBloki t={t} oynaTovari={oynaTovari} qoldi={qoldi} />
              {!hisob && <p className="text-center text-[13px] text-xira">Buyurtma uchun ro‘yxatdan o‘tish kerak — faqat telefon raqami</p>}
            </div>
          </aside>
        </div>

        {/* Tavsif va xususiyatlar */}
        {(t.tavsif || t.xususiyatlar.length > 0) && (
          <div className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-10">
            {t.tavsif && (
              <section aria-labelledby="tavsif" className="flex flex-col gap-3">
                <h2 id="tavsif" className="text-[22px] font-extrabold tracking-[-0.02em]">Tavsif</h2>
                <div className="max-w-[70ch] whitespace-pre-line text-[15.5px] leading-[1.7] text-siyoh-2">{t.tavsif}</div>
              </section>
            )}
            {t.xususiyatlar.length > 0 && (
              <section id="xususiyatlar" aria-labelledby="xus" className="flex scroll-mt-28 flex-col gap-3">
                <h2 id="xus" className="text-[22px] font-extrabold tracking-[-0.02em]">Xususiyatlar</h2>
                <dl className="flex flex-col divide-y divide-chiziq overflow-hidden rounded-2xl border border-chiziq bg-yuza">
                  {t.xususiyatlar.map(x => (
                    <div key={x.nomi} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 px-4 py-3 text-[14.5px]">
                      <dt className="text-xira">{x.nomi}</dt>
                      <dd className="break-words">{x.qiymat}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
          </div>
        )}

        {/* Qaytarish */}
        <details className="group mt-10 rounded-2xl border border-chiziq bg-yuza">
          <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 text-[15.5px] font-bold">
            <span className="flex items-center gap-2.5"><RotateCcw size={18} className="text-xira" aria-hidden /> Qaytarish va almashtirish</span>
            <ChevronRight size={18} className="text-xira transition group-open:rotate-90" aria-hidden />
          </summary>
          <p className="max-w-[70ch] whitespace-pre-line px-5 pb-5 text-[14.5px] leading-relaxed text-siyoh-2">
            {aloqa.qaytarishShartlari ?? 'Qaytarish shartlari bo‘yicha do‘konga murojaat qiling.'}{' '}
            <Link href="/qaytarish" className="font-semibold text-brend">Batafsil</Link>
          </p>
        </details>

        {oxshash.length > 0 && (
          <section className="mt-14 sm:mt-16" aria-labelledby="oxshash">
            <div className="mb-5 flex items-end justify-between gap-4">
              <h2 id="oxshash" className="text-[22px] font-extrabold tracking-[-0.02em] sm:text-[26px]">Shu turkumdan</h2>
              {t.kategoriya && <Link href={`/katalog?kategoriya=${encodeURIComponent(t.kategoriya.id)}`} className="text-sm font-semibold text-brend">Hammasi</Link>}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
              {oxshash.map(x => <MahsulotKartasi key={x.elonId} tovar={kartaga(x)} />)}
            </div>
          </section>
        )}

        <YaqindaKorilgan joriySlug={t.slug} />
      </div>

      {/* Telefonda yopishqoq panel: narx va "Savatga" doim barmoq ostida.
          Kirgan xaridorda pastki navigatsiya bor — panel uning ustida turadi. */}
      {t.mavjudlik !== 'YOQ' && t.narxSom !== null && (
        <div className={cn(
          'fixed inset-x-0 z-20 border-t border-chiziq bg-yuza/95 px-4 py-2.5 backdrop-blur md:hidden',
          hisob ? 'bottom-[calc(58px+env(safe-area-inset-bottom))]' : 'bottom-0 pb-[calc(10px+env(safe-area-inset-bottom))]',
        )}>
          <div className="mx-auto flex max-w-2xl items-center gap-3">
            <div className="flex min-w-0 flex-col leading-tight">
              <Narx som={t.narxSom} className={cn('text-[18px] font-extrabold', t.eskiNarxSom && 'text-brend')} />
              {t.eskiNarxSom !== null && <s className="text-[12px] text-xira tabular-nums">{narxMatni(t.eskiNarxSom)}</s>}
            </div>
            <div className="ml-auto w-[52%] max-w-[240px]">
              <SavatgaTugma tovar={oynaTovari} elonId={t.elonId} mavjudlik={t.mavjudlik} />
            </div>
          </div>
        </div>
      )}
    </Qobiq>
  )
}

function NarxBloki({
  t, oynaTovari, qoldi,
}: {
  t: VitrinaTovari
  oynaTovari: { slug: string; nomi: string; narxSom: number | null; rasm: string | null }
  qoldi: string | null
}) {
  return (
    <div className="flex flex-col gap-4 rounded-[20px] border border-chiziq bg-yuza p-5">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <Narx som={t.narxSom} olcham="katta" className={cn('text-[32px]', t.eskiNarxSom && 'text-brend')} />
          {t.eskiNarxSom !== null && (
            <>
              <s className="text-[16px] text-xira tabular-nums">{narxMatni(t.eskiNarxSom)}</s>
              <span className="rounded-full bg-brend px-2 py-1 text-[12px] font-bold leading-none text-white">−{t.chegirmaFoiz}%</span>
            </>
          )}
        </div>
        <span className="text-[13px] text-xira">
          1 {t.birlik.toLowerCase()} uchun{t.birlikNarxi ? <> · <span className="font-raqam">{t.birlikNarxi}</span></> : null} · do‘kondagi narx
        </span>
        {qoldi && <span className="mt-1 flex items-center gap-1.5 text-[13px] font-medium text-brend"><Clock size={14} aria-hidden /> {qoldi}</span>}
      </div>
      <div className="flex flex-col gap-2.5">
        <SavatgaTugma tovar={oynaTovari} elonId={t.elonId} mavjudlik={t.mavjudlik} olcham="katta" />
        <SavatgaTugma tovar={oynaTovari} elonId={t.elonId} mavjudlik={t.mavjudlik} olcham="katta" hozirOlish className="h-12" />
      </div>
    </div>
  )
}

function YetkazishBloki({ yetkazishVaqti, hududlar, minNarx, manzil }: { yetkazishVaqti: string | null; hududlar: string; minNarx: number; manzil: string | null }) {
  const qatorlar = [
    { Ikonka: Truck, sarlavha: yetkazishVaqti ? `Yetkazish: ${yetkazishVaqti}` : 'Yetkazish ertaga ertalabdan', matn: `${hududlar} bo‘ylab · ${narxMatni(minNarx)}` },
    { Ikonka: Store, sarlavha: 'Do‘kondan olib ketish — bepul', matn: manzil ?? 'Tayyor bo‘lganda Telegram orqali xabar beramiz' },
    { Ikonka: Banknote, sarlavha: 'Qabul qilganda to‘lov', matn: 'Naqd yoki karta — oldindan hech narsa to‘lanmaydi' },
    { Ikonka: ShieldCheck, sarlavha: 'Do‘kon narxi', matn: 'Saytdagi narx kassadagi narx bilan bir xil' },
  ]
  return (
    <ul className="flex flex-col gap-px overflow-hidden rounded-2xl border border-chiziq bg-chiziq">
      {qatorlar.map(({ Ikonka, sarlavha, matn }) => (
        <li key={sarlavha} className="flex items-start gap-3.5 bg-yuza px-4 py-3.5">
          <Ikonka size={20} strokeWidth={1.8} className="mt-0.5 shrink-0 text-siyoh-2" aria-hidden />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[14.5px] font-semibold">{sarlavha}</span>
            <span className="text-[13.5px] text-xira">{matn}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
