import Link from 'next/link'
import type { Metadata } from 'next'
import { AlertTriangle, ArrowRight, Banknote, ShoppingCart, Truck } from 'lucide-react'
import Qobiq, { KONTEYNER } from '@/components/Qobiq'
import SavatQatorlari from '@/components/sayt/SavatQatorlari'
import { Narx } from '@/components/ui/Belgilar'
import { hisobTalab } from '@/lib/hisob'
import { savatniOl } from '@/lib/domen/savat'
import { DOKON, faolHududlarMatni } from '@/lib/dokon'
import { narxMatni } from '@/lib/domen/narx'
import { cn } from '@/lib/cn'

export const metadata: Metadata = { title: 'Savat', robots: { index: false } }

export default async function SavatSahifasi() {
  // Mehmon bu yerga to'g'ridan-to'g'ri kirsa — kirish sahifasiga, qaytish bilan
  const hisob = await hisobTalab('/savat')
  const n = await savatniOl(hisob.id)
  const minNarx = Math.min(...DOKON.hududlar.filter(h => h.faol).map(h => h.narxSom))

  return (
    <Qobiq>
      <div className={cn(KONTEYNER, 'pb-16 pt-8 sm:pt-10')}>
        <h1 className="text-[28px] font-extrabold tracking-[-0.03em] sm:text-[34px]">Savat</h1>

        {!n.ok ? (
          <div className="mt-6 rounded-[20px] border border-chiziq bg-yuza px-6 py-14 text-center">
            <AlertTriangle size={32} strokeWidth={1.5} className="mx-auto text-chiziq-2" aria-hidden />
            <p className="mt-3 text-[15px] font-semibold">Savat vaqtincha ochilmadi</p>
            <p className="mt-1 text-[13.5px] text-xira">{n.xato.xabar}</p>
          </div>
        ) : n.qiymat.qatorlar.length === 0 ? (
          <div className="mt-6 rounded-[20px] border border-chiziq bg-yuza px-6 py-16 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-[20px] bg-yuza-2">
              <ShoppingCart size={28} strokeWidth={1.7} className="text-xira" aria-hidden />
            </span>
            <p className="mt-4 text-[17px] font-bold">Savat hozircha bo‘sh</p>
            <p className="mt-1 text-sm text-xira">Mahsulotlarni tanlang — ular shu yerda saqlanadi.</p>
            <Link href="/katalog" className="mt-5 inline-flex h-12 items-center gap-2 rounded-[14px] bg-brend px-6 text-[15px] font-semibold text-white hover:bg-brend-quyuq">
              Mahsulotlarga o‘tish <ArrowRight size={18} aria-hidden />
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
            <div className="flex flex-col gap-3">
              <p className="text-sm text-xira">{n.qiymat.soni} ta mahsulot · narxlar jonli, do‘kon tizimidan</p>
              <SavatQatorlari qatorlar={n.qiymat.qatorlar} />
              <Link href="/katalog" className="mt-1 self-start text-[14.5px] font-semibold text-brend hover:text-brend-quyuq">
                ← Xaridni davom ettirish
              </Link>
            </div>

            <aside className="flex flex-col gap-4 rounded-[20px] border border-chiziq bg-yuza p-5 sm:p-6 lg:sticky lg:top-[96px]">
              <h2 className="text-lg font-bold">Buyurtma</h2>
              <dl className="flex flex-col gap-2.5 text-[14.5px]">
                <div className="flex justify-between gap-4">
                  <dt className="text-siyoh-2">Mahsulotlar</dt>
                  <dd><Narx som={n.qiymat.mahsulotSumma} className="text-[14.5px] font-semibold" /></dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-siyoh-2">Yetkazish</dt>
                  <dd className="text-right text-xira">keyingi qadamda · {narxMatni(minNarx)}</dd>
                </div>
              </dl>
              <div className="flex items-baseline justify-between gap-4 border-t border-chiziq pt-4">
                <span className="font-semibold">Mahsulotlar jami</span>
                <Narx som={n.qiymat.mahsulotSumma} className="text-[22px]" />
              </div>
              {n.qiymat.muammoBor && (
                <p className="rounded-xl bg-kam-och px-3.5 py-2.5 text-[13px] leading-snug text-kam">
                  Ba’zi mahsulotlar hozir mavjud emas — ular jamiga qo‘shilmagan.
                </p>
              )}

              {n.qiymat.muammoBor ? (
                <span className="flex h-[54px] items-center justify-center rounded-[14px] bg-yuza-2 text-center text-[15px] font-semibold text-xira">
                  Avval mavjud bo‘lmaganlarini olib tashlang
                </span>
              ) : (
                <Link
                  href="/rasmiylashtirish"
                  className="flex h-[54px] items-center justify-center gap-2 rounded-[14px] bg-brend text-[16px] font-semibold text-white transition hover:bg-brend-quyuq"
                >
                  Rasmiylashtirishga o‘tish <ArrowRight size={18} aria-hidden />
                </Link>
              )}

              <ul className="flex flex-col gap-2.5 border-t border-chiziq pt-4 text-[13px] text-siyoh-2">
                <li className="flex gap-2.5"><Truck size={17} className="shrink-0 text-xira" aria-hidden />{faolHududlarMatni} bo‘ylab 2 soatda</li>
                <li className="flex gap-2.5"><Banknote size={17} className="shrink-0 text-xira" aria-hidden />To‘lov mahsulotni olganda — naqd yoki karta</li>
              </ul>
            </aside>
          </div>
        )}
      </div>
    </Qobiq>
  )
}
