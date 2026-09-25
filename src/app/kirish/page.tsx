import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { ArrowLeft, Clock, MapPin, ShoppingBag } from 'lucide-react'
import Logo from '@/components/sayt/Logo'
import KirishFormasi from '@/components/sayt/KirishFormasi'
import { joriyHisob } from '@/lib/hisob'
import { xavfsizQaytish } from '@/lib/seans'
import { vitrinaTovari } from '@/lib/domen/vitrina'
import { kirishKodiYoqilgan, kodKanali } from '@/lib/sozlama'
import { botNomi } from '@/lib/telegram-bot'
import { gatewayBormi } from '@/lib/telegram-gateway'

export const metadata: Metadata = {
  title: 'Kirish yoki ro‘yxatdan o‘tish',
  robots: { index: false },
}

type Parametrlar = Promise<{ rejim?: string; keyin?: string; tovar?: string }>

export default async function KirishSahifasi({ searchParams }: { searchParams: Parametrlar }) {
  const p = await searchParams
  // `keyin` foydalanuvchidan keladi — faqat o'z saytimizdagi yo'l qabul qilinadi
  const keyin = xavfsizQaytish(p.keyin, '/')

  // Allaqachon kirgan bo'lsa formani ko'rsatish ma'nosiz
  if (await joriyHisob()) redirect(keyin === '/' ? '/kabinet' : keyin)

  // Kod qaysi yo'l bilan ketadi — forma shunga qarab Telegram'ni oldindan
  // ochadi (bot) yoki shunchaki "kod yuborildi" deydi (Gateway, konsol)
  const kodYoli = kodKanali === 'konsol' ? 'konsol' : gatewayBormi() ? 'gateway' : 'bot'
  const bot = kirishKodiYoqilgan && kodYoli === 'bot' ? await botNomi() : null

  // Mehmon tanlagan mahsulot — "Saqlanadi" deb ko'rsatiladi va kirgach savatga tushadi
  let tovar: { slug: string; nomi: string; narxSom: number | null } | null = null
  if (typeof p.tovar === 'string' && p.tovar.length <= 200) {
    const n = await vitrinaTovari(p.tovar)
    if (n.ok && n.qiymat && n.qiymat.mavjudlik !== 'YOQ') {
      tovar = { slug: n.qiymat.slug, nomi: n.qiymat.nomi, narxSom: n.qiymat.narxSom }
    }
  }

  return (
    <div className="grid min-h-dvh bg-qogoz lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)] xl:grid-cols-[620px_minmax(0,1fr)]">
      {/* Chap: hisob ochgach nima olasiz — faqat keng ekranda */}
      <aside className="relative hidden flex-col overflow-hidden bg-teskari px-14 py-12 text-teskari-matn lg:flex xl:px-16">
        <div className="nuqtali-och absolute inset-0" aria-hidden />
        <Logo className="relative text-teskari-matn [&>span:last-child]:text-[#F0685F]" />
        <div className="relative mt-auto flex flex-col gap-7">
          <p className="text-[40px] font-extrabold leading-[1.08] tracking-[-0.035em] xl:text-[44px]">
            Bir marta ro‘yxatdan o‘ting — keyin bir bosishda buyurtma
          </p>
          <ul className="flex flex-col gap-[18px]">
            {([
              [ShoppingBag, 'Istalgan vaqtda buyurtma', 'Savat qurilmalar orasida saqlanadi'],
              [MapPin, 'Saqlangan manzillar', 'Uy, ish — har safar qayta yozmaysiz'],
              [Clock, 'Buyurtma holati va tarixi', 'Qayerdaligi va avval nima olganingiz — profilda'],
            ] as const).map(([Ikonka, s, m]) => (
              <li key={s} className="flex gap-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(240,104,95,.16)] text-[#F0685F]">
                  <Ikonka size={20} strokeWidth={1.9} aria-hidden />
                </span>
                <span className="flex flex-col gap-[3px]">
                  <span className="text-base font-semibold">{s}</span>
                  <span className="text-sm text-teskari-xira">{m}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* O'ng: forma */}
      <main className="flex min-w-0 flex-col px-4 pb-8 pt-4 sm:px-8 lg:px-16 lg:pb-10 lg:pt-10">
        <div className="flex items-center justify-between">
          <Link href={keyin} className="-ml-2 flex h-11 items-center gap-1.5 rounded-xl px-2 text-[14.5px] font-medium text-siyoh-2 hover:text-siyoh">
            <ArrowLeft size={18} strokeWidth={2} aria-hidden />
            {keyin === '/' ? 'Bosh sahifa' : 'Orqaga'}
          </Link>
          <Logo className="lg:hidden" />
        </div>

        <div className="mx-auto my-auto w-full max-w-[440px] py-8">
          <KirishFormasi
            boshRejim={p.rejim === 'kirish' ? 'kirish' : 'royxat'}
            keyin={keyin}
            tovar={tovar}
            kodBilan={kirishKodiYoqilgan}
            kodYoli={kodYoli}
            bot={bot}
          />
        </div>
      </main>
    </div>
  )
}
