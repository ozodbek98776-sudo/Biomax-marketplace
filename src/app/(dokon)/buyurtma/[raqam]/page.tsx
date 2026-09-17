import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ArrowLeft, Banknote, Bike, CheckCircle2, Clock, CreditCard, MapPin, Package, Phone, Send, Store, XCircle } from 'lucide-react'
import Qobiq, { KONTEYNER } from '@/components/Qobiq'
import BekorTugmasi from '@/components/sayt/BekorTugmasi'
import JonliYangilash from '@/components/sayt/JonliYangilash'
import { Narx } from '@/components/ui/Belgilar'
import { hisobTalab } from '@/lib/hisob'
import { mijozBuyurtmasi } from '@/lib/domen/buyurtma-server'
import { BOSQICHLAR, holatYorligi, mijozBekorQilaOladimi, tolovYorligi, yakunlanganmi } from '@/lib/domen/buyurtma'
import { dokonAloqa } from '@/lib/dokon-server'
import { telefonMatni } from '@/lib/domen/telefon'
import { cn } from '@/lib/cn'

type Parametrlar = Promise<{ raqam: string }>

export async function generateMetadata({ params }: { params: Parametrlar }): Promise<Metadata> {
  return { title: `Buyurtma ${decodeURIComponent((await params).raqam)}`, robots: { index: false } }
}

const vaqtFormati = new Intl.DateTimeFormat('uz-UZ', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tashkent' })

export default async function BuyurtmaSahifasi({ params, searchParams }: { params: Parametrlar; searchParams: Promise<{ yangi?: string }> }) {
  const raqam = decodeURIComponent((await params).raqam)
  const hisob = await hisobTalab(`/buyurtma/${encodeURIComponent(raqam)}`)
  const [b, { yangi }, aloqa] = await Promise.all([mijozBuyurtmasi(hisob.id, raqam), searchParams, dokonAloqa()])
  if (!b) notFound()

  const olibKetish = b.yetkazish === 'OLIB_KETISH'
  const tur = olibKetish ? 'OLIB_KETISH' : 'KURYER'
  const bekor = b.holati === 'BEKOR' || b.holati === 'QAYTARILGAN'
  const joriyIndeks = BOSQICHLAR.indexOf(b.holati)
  const qachon = (h: string) => b.tarix.findLast(t => t.holati === h)?.sana

  const yakunlangan = yakunlanganmi(b.holati)

  return (
    <Qobiq>
      {/* Do'kon holatni o'zgartirsa sahifa o'zi yangilanadi. Yakunlangan buyurtma kamdan-kam o'zgaradi */}
      <JonliYangilash url={`/api/buyurtma/belgi?raqam=${encodeURIComponent(b.raqam)}`} oraliqMs={yakunlangan ? 30_000 : 4_000} />
      <div className={cn(KONTEYNER, 'pb-16 pt-6 sm:pt-8')}>
        <Link href="/kabinet#buyurtmalar" className="-ml-1 inline-flex h-10 items-center gap-1.5 text-[14.5px] font-medium text-siyoh-2 hover:text-siyoh">
          <ArrowLeft size={17} aria-hidden /> Buyurtmalarim
        </Link>

        {yangi === '1' && !bekor && (
          <div className="mt-3 flex items-start gap-4 rounded-3xl border border-bor/30 bg-bor-och p-5 sm:items-center sm:p-6">
            <CheckCircle2 size={34} strokeWidth={1.8} className="shrink-0 text-bor" aria-hidden />
            <div>
              <p className="text-[19px] font-extrabold tracking-[-0.02em] text-siyoh sm:text-[21px]">Buyurtmangiz qabul qilindi!</p>
              <p className="mt-0.5 text-[14.5px] text-siyoh-2">
                Do‘kon tez orada tasdiqlaydi. Har bir o‘zgarish shu sahifada va Telegram’ingizda ko‘rinadi.
              </p>
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-raqam text-[24px] font-semibold tracking-[-0.01em] sm:text-[28px]">{b.raqam}</h1>
            <p className="mt-1 text-sm text-xira">{vaqtFormati.format(b.yaratilgan)} da berilgan</p>
            {!yakunlangan && (
              <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-xira">
                <span className="relative flex h-2 w-2" aria-hidden>
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bor opacity-60 motion-reduce:animate-none" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-bor" />
                </span>
                Holat o‘zgarsa sahifa o‘zi yangilanadi
              </p>
            )}
          </div>
          <span className={cn(
            'rounded-full px-3 py-1.5 text-[13px] font-semibold',
            bekor ? 'bg-yoq-och text-yoq' : b.holati === 'BAJARILGAN' ? 'bg-bor-och text-bor' : 'bg-kok-och text-kok',
          )}>
            {b.holatYorligi}
          </span>
        </div>

        <div className="mt-6 grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
          <div className="flex min-w-0 flex-col gap-4">
            {/* Holat chizig'i */}
            <section className="rounded-[20px] border border-chiziq bg-yuza p-5 sm:p-6">
              {bekor ? (
                <div className="flex items-start gap-3">
                  <XCircle size={24} className="mt-0.5 shrink-0 text-yoq" aria-hidden />
                  <div>
                    <p className="text-[16px] font-bold">{b.holatYorligi}</p>
                    {b.bekorSababi && <p className="mt-0.5 text-[14.5px] text-siyoh-2">Sabab: {b.bekorSababi}</p>}
                    {qachon(b.holati) && <p className="mt-0.5 text-[13px] text-xira">{vaqtFormati.format(qachon(b.holati)!)}</p>}
                  </div>
                </div>
              ) : (
                <ol className="grid gap-0 sm:grid-cols-5 sm:gap-2">
                  {BOSQICHLAR.map((h, i) => {
                    const otgan = i <= joriyIndeks
                    const sana = qachon(h)
                    return (
                      <li key={h} className="flex gap-3 sm:flex-col sm:gap-2" aria-current={i === joriyIndeks ? 'step' : undefined}>
                        <div className="flex flex-col items-center sm:flex-row">
                          <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2', otgan ? 'border-bor bg-bor text-white' : 'border-chiziq-2 bg-yuza')}>
                            {otgan && <CheckCircle2 size={14} strokeWidth={3} aria-hidden />}
                          </span>
                          {i < BOSQICHLAR.length - 1 && (
                            <span className={cn('min-h-6 w-0.5 flex-1 sm:h-0.5 sm:min-h-0 sm:w-auto', i < joriyIndeks ? 'bg-bor' : 'bg-chiziq')} />
                          )}
                        </div>
                        <div className="pb-4 sm:pb-0">
                          <p className={cn('text-[14.5px] font-semibold', !otgan && 'text-xira')}>{holatYorligi(h, tur)}</p>
                          {sana && <p className="text-[12.5px] text-xira">{vaqtFormati.format(sana)}</p>}
                        </div>
                      </li>
                    )
                  })}
                </ol>
              )}
            </section>

            {/* Mahsulotlar */}
            <section className="rounded-[20px] border border-chiziq bg-yuza p-5 sm:p-6">
              <h2 className="text-[17px] font-bold">Mahsulotlar</h2>
              <ul className="mt-3 flex flex-col divide-y divide-chiziq">
                {b.qatorlar.map(q => (
                  <li key={q.id} className="flex items-center gap-3 py-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-linear-to-br from-rasm-1 to-rasm-2">
                      <Package size={20} strokeWidth={1.5} className="text-chiziq-2" aria-hidden />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      {q.slug
                        ? <Link href={`/mahsulot/${q.slug}`} className="truncate text-[14.5px] font-medium hover:text-brend">{q.nomi}</Link>
                        : <span className="truncate text-[14.5px] font-medium">{q.nomi}</span>}
                      <span className="text-[13px] text-xira tabular-nums">
                        {q.miqdor} {q.birlik} × <Narx som={q.birlikNarxi} className="text-[13px] font-normal" />
                      </span>
                    </span>
                    <Narx som={q.jami} className="text-[15px] font-semibold" />
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <aside className="flex flex-col gap-4 lg:sticky lg:top-[96px]">
            <section className="flex flex-col gap-3.5 rounded-[20px] border border-chiziq bg-yuza p-5 sm:p-6">
              <h2 className="text-[17px] font-bold">Tafsilotlar</h2>
              <Qator Ikonka={olibKetish ? Store : Bike} sarlavha={olibKetish ? 'Do‘kondan olib ketish' : 'Kuryer'}>
                {olibKetish ? (aloqa.manzil ?? 'Manzil tasdiqlashda yuboriladi') : [b.hudud, b.manzilMatni].filter(Boolean).join(', ')}
                {b.moljal && <span className="block text-xira">Mo‘ljal: {b.moljal}</span>}
              </Qator>
              {b.vaqtOraligi && <Qator Ikonka={Clock} sarlavha="Vaqt">{b.vaqtOraligi}</Qator>}
              <Qator Ikonka={Phone} sarlavha="Qabul qiluvchi">{b.aloqaIsm} · <span className="font-raqam">{telefonMatni(b.aloqaTel)}</span></Qator>
              <Qator Ikonka={b.tolovUsuli === 'KARTA_YETKAZISHDA' ? CreditCard : Banknote} sarlavha="To‘lov">{tolovYorligi(b.tolovUsuli)}</Qator>
              {b.izoh && <Qator Ikonka={Send} sarlavha="Izoh">{b.izoh}</Qator>}
              {b.lat !== null && b.lng !== null && (
                <Qator Ikonka={MapPin} sarlavha="Joylashuv">
                  <a href={`https://www.google.com/maps?q=${b.lat},${b.lng}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-brend hover:underline">Xaritada ko‘rish</a>
                </Qator>
              )}

              <dl className="mt-1 flex flex-col gap-2 border-t border-chiziq pt-4 text-[14.5px]">
                <div className="flex justify-between"><dt className="text-siyoh-2">Mahsulotlar</dt><dd><Narx som={b.mahsulotSumma} className="text-[14.5px] font-semibold" /></dd></div>
                <div className="flex justify-between"><dt className="text-siyoh-2">Yetkazish</dt><dd>{b.yetkazishNarx > 0 ? <Narx som={b.yetkazishNarx} className="text-[14.5px] font-semibold" /> : <span className="font-semibold text-bor">Bepul</span>}</dd></div>
                <div className="flex items-baseline justify-between border-t border-chiziq pt-3"><dt className="font-semibold">Jami</dt><dd><Narx som={b.jamiSumma} className="text-[22px]" /></dd></div>
              </dl>
            </section>

            {mijozBekorQilaOladimi(b.holati) && <BekorTugmasi raqam={b.raqam} />}
            {b.holati === 'YOLDA' && aloqa.telefon && (
              <p className="text-center text-[13.5px] text-xira">
                Buyurtma yo‘lda. O‘zgartirish uchun: <a href={`tel:${aloqa.telefon.replace(/[^\d+]/g, '')}`} className="font-semibold text-brend">{aloqa.telefon}</a>
              </p>
            )}
          </aside>
        </div>
      </div>
    </Qobiq>
  )
}

function Qator({ Ikonka, sarlavha, children }: { Ikonka: typeof Clock; sarlavha: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Ikonka size={18} strokeWidth={1.9} className="mt-0.5 shrink-0 text-xira" aria-hidden />
      <div className="min-w-0 text-[14.5px]">
        <p className="text-[12.5px] font-semibold uppercase tracking-[0.04em] text-xira">{sarlavha}</p>
        <div className="break-words text-siyoh">{children}</div>
      </div>
    </div>
  )
}
