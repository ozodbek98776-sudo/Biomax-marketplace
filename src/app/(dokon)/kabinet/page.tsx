import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight, MapPin, PackageOpen, Phone, ShieldCheck, ShoppingCart } from 'lucide-react'
import Qobiq, { KONTEYNER } from '@/components/Qobiq'
import ChiqishTugmasi from '@/components/sayt/ChiqishTugmasi'
import MavzuTugmasi from '@/components/MavzuTugmasi'
import { Narx } from '@/components/ui/Belgilar'
import { hisobTalab } from '@/lib/hisob'
import { db } from '@/lib/db'
import { savatSoni } from '@/lib/domen/savat'
import { telefonMatni } from '@/lib/domen/telefon'
import { holatYorligi } from '@/lib/domen/buyurtma'
import { cn } from '@/lib/cn'
import JonliYangilash from '@/components/sayt/JonliYangilash'

export const metadata: Metadata = { title: 'Kabinet', robots: { index: false } }

const HOLAT_YORLIQ = {
  YANGI: ['Qabul qilindi', 'bg-kok-och text-kok'],
  TASDIQLANGAN: ['Tasdiqlandi', 'bg-kok-och text-kok'],
  YIGILMOQDA: ['Yig‘ilmoqda', 'bg-kam-och text-kam'],
  YOLDA: ['Yo‘lda', 'bg-bor-och text-bor'],
  BAJARILGAN: ['Topshirildi', 'bg-bor-och text-bor'],
  BEKOR: ['Bekor qilindi', 'bg-yoq-och text-yoq'],
  QAYTARILGAN: ['Qaytarildi', 'bg-yoq-och text-yoq'],
} as const

export default async function KabinetSahifasi() {
  const hisob = await hisobTalab('/kabinet')

  const [toliq, soni, buyurtmalar] = await Promise.all([
    db.mpHisob.findUniqueOrThrow({
      where: { id: hisob.id },
      select: { yaratilgan: true, _count: { select: { manzillar: true } } },
    }),
    savatSoni(hisob.id),
    db.mpBuyurtma.findMany({
      where: { hisobId: hisob.id },
      orderBy: { yaratilgan: 'desc' },
      take: 20,
      select: { id: true, raqam: true, holati: true, yetkazish: true, jamiSumma: true, yaratilgan: true, _count: { select: { qatorlar: true } } },
    }),
  ])

  const sana = new Intl.DateTimeFormat('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Tashkent' })

  return (
    <Qobiq>
      {/* Buyurtma holatlari do'kon o'zgartirganda o'zi yangilanadi */}
      <JonliYangilash url="/api/buyurtma/belgi" oraliqMs={8_000} />
      <div className={cn(KONTEYNER, 'pb-16 pt-8 sm:pt-10')}>
        {/* Profil */}
        <section className="flex flex-col gap-5 rounded-3xl border border-chiziq bg-yuza p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-siyoh text-[22px] font-bold text-qogoz sm:h-16 sm:w-16">
              {(hisob.ism?.trim()[0] ?? 'B').toUpperCase()}
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <h1 className="truncate text-[22px] font-extrabold tracking-[-0.02em] sm:text-[26px]">{hisob.ism ?? 'Xaridor'}</h1>
              <span className="flex items-center gap-1.5 font-raqam text-sm text-siyoh-2">
                <Phone size={14} className="text-xira" aria-hidden />{telefonMatni(hisob.telefon)}
              </span>
              <span className="flex items-center gap-1.5 text-[12.5px] text-bor">
                <ShieldCheck size={14} aria-hidden />Raqam tasdiqlangan · {sana.format(toliq.yaratilgan)} dan beri
              </span>
            </div>
          </div>
          <ChiqishTugmasi />
        </section>

        {/* Tezkor */}
        <div className="mt-5 grid gap-3 sm:grid-cols-3 sm:gap-4">
          <Link href="/savat" className="group flex items-center gap-4 rounded-[20px] border border-chiziq bg-yuza p-5 transition hover:border-chiziq-2">
            <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-brend-och text-brend"><ShoppingCart size={21} aria-hidden /></span>
            <span className="flex flex-1 flex-col">
              <span className="text-[15px] font-semibold">Savat</span>
              <span className="text-[13px] text-xira">{soni > 0 ? `${soni} ta mahsulot` : 'bo‘sh'}</span>
            </span>
            <ArrowRight size={18} className="text-xira transition group-hover:translate-x-0.5 group-hover:text-siyoh" aria-hidden />
          </Link>
          <a href="#buyurtmalar" className="group flex items-center gap-4 rounded-[20px] border border-chiziq bg-yuza p-5 transition hover:border-chiziq-2">
            <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-bor-och text-bor"><PackageOpen size={21} aria-hidden /></span>
            <span className="flex flex-1 flex-col">
              <span className="text-[15px] font-semibold">Buyurtmalar</span>
              <span className="text-[13px] text-xira">{buyurtmalar.length > 0 ? `${buyurtmalar.length} ta` : 'hali yo‘q'}</span>
            </span>
          </a>
          <div className="flex items-center gap-4 rounded-[20px] border border-chiziq bg-yuza p-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-kok-och text-kok"><MapPin size={21} aria-hidden /></span>
            <span className="flex flex-1 flex-col">
              <span className="text-[15px] font-semibold">Manzillar</span>
              <span className="text-[13px] text-xira">
                {toliq._count.manzillar > 0 ? `${toliq._count.manzillar} ta saqlangan` : 'birinchi buyurtmada qo‘shiladi'}
              </span>
            </span>
          </div>
        </div>

        {/* Buyurtmalar */}
        <section id="buyurtmalar" className="mt-10">
          <h2 className="mb-4 text-[22px] font-extrabold tracking-[-0.02em]">Buyurtmalarim</h2>
          {buyurtmalar.length === 0 ? (
            <div className="rounded-[20px] border border-chiziq bg-yuza px-6 py-12 text-center">
              <PackageOpen size={32} strokeWidth={1.5} className="mx-auto text-chiziq-2" aria-hidden />
              <p className="mt-3 text-[15px] font-semibold">Hali buyurtma bermagansiz</p>
              <p className="mt-1 text-[13.5px] text-xira">Buyurtmalaringiz va ularning holati shu yerda ko‘rinadi.</p>
              <Link href="/katalog" className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-brend px-5 text-[14.5px] font-semibold text-white hover:bg-brend-quyuq">
                Xaridni boshlash <ArrowRight size={17} aria-hidden />
              </Link>
            </div>
          ) : (
            <ul className="flex flex-col gap-px overflow-hidden rounded-[20px] border border-chiziq bg-chiziq">
              {buyurtmalar.map(b => {
                const [yorliq, rang] = HOLAT_YORLIQ[b.holati]
                return (
                  <li key={b.id}>
                    <Link href={`/buyurtma/${encodeURIComponent(b.raqam)}`} className="group flex flex-wrap items-center justify-between gap-3 bg-yuza px-5 py-4 transition hover:bg-qogoz">
                      <span className="flex flex-col gap-0.5">
                        <span className="font-raqam text-[13.5px] font-semibold">{b.raqam}</span>
                        <span className="text-[13px] text-xira">{sana.format(b.yaratilgan)} · {b._count.qatorlar} ta mahsulot</span>
                      </span>
                      <span className="flex items-center gap-4">
                        <Narx som={Number(b.jamiSumma)} className="text-[15.5px]" />
                        <span className={cn('rounded-full px-2.5 py-1 text-[12px] font-semibold', rang)}>{b.yetkazish === 'OLIB_KETISH' && (b.holati === 'YOLDA' || b.holati === 'BAJARILGAN') ? holatYorligi(b.holati, 'OLIB_KETISH') : yorliq}</span>
                        <ArrowRight size={17} className="text-xira transition group-hover:translate-x-0.5" aria-hidden />
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="mt-10 flex items-center justify-between gap-4 rounded-[20px] border border-chiziq bg-yuza px-5 py-4">
          <span className="flex flex-col">
            <span className="text-[15px] font-semibold">Sayt ko‘rinishi</span>
            <span className="text-[13px] text-xira">Yorug‘, qorong‘i yoki qurilma sozlamasi</span>
          </span>
          <MavzuTugmasi />
        </section>
      </div>
    </Qobiq>
  )
}
