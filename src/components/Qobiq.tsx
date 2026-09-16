import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import MavzuTugmasi from '@/components/MavzuTugmasi'
import Logo from '@/components/sayt/Logo'
import MobilMenyu from '@/components/sayt/MobilMenyu'
import PastkiNav from '@/components/sayt/PastkiNav'
import { SAYT_NAV } from '@/components/sayt/nav'
import { SaytHolatiProvider } from '@/components/sayt/SaytHolati'
import { joriyHisob } from '@/lib/hisob'
import { db } from '@/lib/db'
import { DOKON } from '@/lib/dokon'
import { dokonAloqa } from '@/lib/dokon-server'
import { cn } from '@/lib/cn'

/** Sahifa kengligi: 1440 ekranda 1200px kontent — dizayndagi to'r. */
export const KONTEYNER = 'mx-auto w-full max-w-[1264px] px-4 sm:px-6 lg:px-8'

/**
 * Sayt qobig'i — sarlavha, kontent, pastki qism.
 *
 * Har qanday qurilmaga moslashadi: telefonda ixcham sarlavha va menyu
 * (kirganlar uchun pastki panel ham), planshetda kengroq to'r, kompyuterda
 * to'liq navigatsiya.
 */
export default async function Qobiq({ children }: { children: React.ReactNode }) {
  const hisob = await joriyHisob()
  const qatorlar = hisob
    ? await db.mpSavatQatori.findMany({ where: { savat: { hisobId: hisob.id } }, select: { elonId: true, miqdor: true } })
    : []
  const savat = Object.fromEntries(qatorlar.map(q => [q.elonId, Number(q.miqdor)]))
  const soni = qatorlar.reduce((s, q) => s + Number(q.miqdor), 0)

  return (
    <SaytHolatiProvider kirgan={!!hisob} savat={savat}>
      <div className="flex min-h-dvh flex-col">
        {/* Fon ATAYLAB shaffof emas va `backdrop-blur` yo'q: `backdrop-filter`
            ichidagi `position: fixed` elementni sarlavhaga qamab qo'yadi va
            mobil menyu sarlavha balandligida kesilib qolardi. */}
        <header className="sticky top-0 z-40 border-b border-chiziq bg-yuza">
          <div className={cn(KONTEYNER, 'flex h-16 items-center gap-6 lg:h-[72px] lg:gap-10')}>
            <Logo />

            <nav aria-label="Asosiy" className="hidden items-center gap-7 text-[14.5px] font-medium text-siyoh-2 lg:flex">
              {SAYT_NAV.map(n => (
                <Link key={n.yol} href={n.yol} className="transition hover:text-siyoh">
                  {n.nomi}
                </Link>
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-2 sm:gap-3.5">
              <MavzuTugmasi className="hidden lg:inline-flex" />

              {hisob ? (
                <>
                  <Link
                    href="/savat"
                    aria-label={`Savat${soni ? `, ${soni} ta mahsulot` : ''}`}
                    className="relative flex h-11 w-11 items-center justify-center rounded-xl text-siyoh transition hover:bg-yuza-2"
                  >
                    <ShoppingCart size={22} strokeWidth={2} aria-hidden />
                    {soni > 0 && (
                      <span className="absolute right-0.5 top-0.5 flex h-[19px] min-w-[19px] items-center justify-center rounded-full bg-brend px-1 text-[10.5px] font-bold text-white tabular-nums">
                        {soni > 99 ? '99+' : soni}
                      </span>
                    )}
                  </Link>
                  <Link
                    href="/kabinet"
                    className="hidden h-11 items-center gap-2.5 rounded-xl pl-1.5 pr-3 transition hover:bg-yuza-2 sm:flex"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-siyoh text-[13px] font-bold text-qogoz">
                      {(hisob.ism?.trim()[0] ?? 'B').toUpperCase()}
                    </span>
                    <span className="max-w-[10rem] truncate text-[14.5px] font-semibold">{hisob.ism ?? 'Kabinet'}</span>
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/kirish?rejim=kirish"
                    className="hidden h-11 items-center px-3 text-[14.5px] font-semibold text-siyoh transition hover:text-brend sm:flex"
                  >
                    Kirish
                  </Link>
                  <Link
                    href="/kirish?rejim=royxat"
                    className="flex h-10 items-center rounded-xl bg-brend px-3.5 text-[13.5px] font-semibold text-white transition hover:bg-brend-quyuq sm:h-11 sm:px-5 sm:text-[14.5px]"
                  >
                    Ro‘yxatdan o‘tish
                  </Link>
                </>
              )}

              <MobilMenyu kirgan={!!hisob} ism={hisob?.ism ?? null} />
            </div>
          </div>
        </header>

        <main className={cn('flex-1', hisob && 'pb-[calc(58px+env(safe-area-inset-bottom))] md:pb-0')}>
          {children}
        </main>

        <SaytPastki kirgan={!!hisob} aloqa={await dokonAloqa()} />
        {hisob && <PastkiNav savatSoni={soni} />}
      </div>
    </SaytHolatiProvider>
  )
}

function SaytPastki({ kirgan, aloqa: a }: { kirgan: boolean; aloqa: Awaited<ReturnType<typeof dokonAloqa>> }) {
  const aloqa = [a.telefon, a.manzil, a.ishVaqti].filter((x): x is string => !!x)
  const ustun = 'flex flex-col gap-2.5 text-sm text-siyoh-2'
  const sarlavha = 'mb-0.5 text-xs font-semibold uppercase tracking-[0.06em] text-xira'

  return (
    <footer className="border-t border-chiziq bg-yuza">
      <div className={cn(KONTEYNER, 'grid grid-cols-2 gap-x-6 gap-y-9 py-10 md:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))] md:gap-10 md:py-12')}>
        <div className="col-span-2 flex flex-col gap-3 md:col-span-1">
          <Logo className="self-start" />
          <p className="max-w-[28em] text-sm leading-relaxed text-xira">
            Do‘kondagi narxda onlayn buyurtma — {DOKON.shahar}da.
          </p>
        </div>
        <div className={ustun}>
          <span className={sarlavha}>Xarid</span>
          <Link href="/katalog" className="hover:text-siyoh">Mahsulotlar</Link>
          <Link href="/#qanday-ishlaydi" className="hover:text-siyoh">Qanday ishlaydi</Link>
          <Link href="/#yetkazish" className="hover:text-siyoh">Yetkazib berish</Link>
        </div>
        <div className={ustun}>
          <span className={sarlavha}>Hisob</span>
          {kirgan ? (
            <>
              <Link href="/kabinet" className="hover:text-siyoh">Kabinet</Link>
              <Link href="/savat" className="hover:text-siyoh">Savat</Link>
              <Link href="/kabinet#buyurtmalar" className="hover:text-siyoh">Buyurtmalarim</Link>
            </>
          ) : (
            <>
              <Link href="/kirish?rejim=kirish" className="hover:text-siyoh">Kirish</Link>
              <Link href="/kirish?rejim=royxat" className="hover:text-siyoh">Ro‘yxatdan o‘tish</Link>
              <Link href="/kirish?rejim=kirish&keyin=%2Fkabinet" className="hover:text-siyoh">Buyurtmalarim</Link>
            </>
          )}
        </div>
        {aloqa.length > 0 && (
          <div className={ustun}>
            <span className={sarlavha}>Aloqa</span>
            {a.telefon && (
              <a href={`tel:${a.telefon.replace(/[^\d+]/g, '')}`} className="hover:text-siyoh">{a.telefon}</a>
            )}
            {a.manzil && <span>{a.manzil}</span>}
            {a.ishVaqti && <span>{a.ishVaqti}</span>}
          </div>
        )}
      </div>
      <div className={cn(KONTEYNER)}>
        <div className="flex flex-col gap-1.5 border-t border-chiziq py-5 text-[13px] text-xira sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} {a.nomi}</span>
          <span><Link href="/qaytarish" className="hover:text-siyoh">Qaytarish shartlari</Link> · Foydalanish shartlari · Maxfiylik siyosati</span>
        </div>
      </div>
    </footer>
  )
}
