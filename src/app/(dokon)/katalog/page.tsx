import Link from 'next/link'
import type { Metadata } from 'next'
import { AlertTriangle, Info, PackageOpen, Search, X } from 'lucide-react'
import Qobiq, { KONTEYNER } from '@/components/Qobiq'
import MahsulotKartasi from '@/components/MahsulotKartasi'
import { kartaga } from '@/lib/domen/karta'
import { vitrina } from '@/lib/domen/vitrina'
import { joriyHisob } from '@/lib/hisob'
import { cn } from '@/lib/cn'

export const metadata: Metadata = {
  title: 'Mahsulotlar',
  description: 'BioMax do‘konidagi barcha mahsulotlar — do‘kon narxida, jonli mavjudlik bilan.',
}

// Filtr va qidiruv URL'da (`?kategoriya=`, `?q=`): havolani ulashish,
// orqaga qaytish va qidiruv tizimlari uchun sahifa holati manzilda turadi.

type Parametrlar = Promise<{ kategoriya?: string; q?: string }>

/** Qidiruv uchun normallash: registr va o'zbek apostrof variantlari farq qilmasin. */
function normal(s: string): string {
  return s.toLocaleLowerCase('uz').replace(/[‘’ʻʼ`']/g, "'").replace(/\s+/g, ' ').trim()
}

export default async function KatalogSahifasi({ searchParams }: { searchParams: Parametrlar }) {
  const { kategoriya, q } = await searchParams
  const [natija, hisob] = await Promise.all([vitrina(), joriyHisob()])
  const qidiruv = (q ?? '').slice(0, 80)

  if (!natija.ok) {
    return (
      <Qobiq>
        <div className={cn(KONTEYNER, 'py-10')}>
          <div className="rounded-[20px] border border-chiziq bg-yuza px-6 py-14 text-center">
            <AlertTriangle size={32} strokeWidth={1.5} className="mx-auto text-chiziq-2" aria-hidden />
            <p className="mt-3 text-[15px] font-semibold">Katalog vaqtincha ochilmadi</p>
            <p className="mt-1 text-[13.5px] text-xira">{natija.xato.xabar}</p>
          </div>
        </div>
      </Qobiq>
    )
  }

  const hammasi = natija.qiymat
  // Kategoriyalar tovarlardan yig'iladi — alohida so'rov shart emas.
  const kategoriyalar = [...new Map(
    hammasi.flatMap(t => (t.kategoriya ? [[t.kategoriya.id, t.kategoriya.nomi] as const] : [])),
  )].sort((a, b) => a[1].localeCompare(b[1], 'uz'))
  const tanlangan = kategoriyalar.find(([id]) => id === kategoriya)?.[0] ?? null

  const soz = normal(qidiruv)
  const tovarlar = hammasi.filter(t =>
    (!tanlangan || t.kategoriya?.id === tanlangan)
    && (!soz || normal(`${t.nomi} ${t.brend ?? ''} ${t.kategoriya?.nomi ?? ''}`).includes(soz)),
  )

  const havola = (k: string | null, qBilan = true) => {
    const p = new URLSearchParams()
    if (k) p.set('kategoriya', k)
    if (qidiruv && qBilan) p.set('q', qidiruv)
    const s = p.toString()
    return s ? `/katalog?${s}` : '/katalog'
  }

  return (
    <Qobiq>
      <div className={cn(KONTEYNER, 'pb-16 pt-8 sm:pt-10 lg:pt-12')}>
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-[28px] font-extrabold tracking-[-0.03em] sm:text-[34px]">Mahsulotlar</h1>
            <p className="mt-1 text-sm text-xira">
              {tovarlar.length === hammasi.length ? `${hammasi.length} ta mahsulot` : `${tovarlar.length} ta topildi · jami ${hammasi.length}`}
            </p>
          </div>

          <form action="/katalog" role="search" className="relative w-full md:max-w-[380px]">
            {tanlangan && <input type="hidden" name="kategoriya" value={tanlangan} />}
            <Search size={18} strokeWidth={2} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xira" aria-hidden />
            <input
              type="search"
              name="q"
              defaultValue={qidiruv}
              placeholder="Mahsulot qidirish…"
              aria-label="Mahsulot qidirish"
              maxLength={80}
              suppressHydrationWarning
              className="h-12 w-full rounded-[14px] border border-chiziq bg-yuza pl-11 pr-11 text-[15px] outline-none transition placeholder:text-xira focus:border-brend focus:ring-4 focus:ring-brend-och"
            />
            {qidiruv && (
              <Link href={havola(tanlangan, false)} aria-label="Qidiruvni tozalash" className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-xira hover:bg-yuza-2 hover:text-siyoh">
                <X size={17} aria-hidden />
              </Link>
            )}
          </form>
        </div>

        {kategoriyalar.length > 0 && (
          <nav aria-label="Kategoriyalar" className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
            {[[null, 'Hammasi'] as const, ...kategoriyalar].map(([id, nomi]) => {
              const faol = tanlangan === id
              return (
                <Link
                  key={id ?? '*'}
                  href={havola(id)}
                  aria-current={faol ? 'page' : undefined}
                  className={cn(
                    'flex h-10 shrink-0 items-center rounded-full px-4 text-sm font-medium transition',
                    faol ? 'bg-siyoh text-qogoz' : 'border border-chiziq bg-yuza text-siyoh-2 hover:border-chiziq-2',
                  )}
                >
                  {nomi}
                </Link>
              )
            })}
          </nav>
        )}

        {!hisob && (
          <p className="mt-4 flex items-start gap-2 text-[13.5px] text-xira">
            <Info size={16} strokeWidth={2} className="mt-px shrink-0" aria-hidden />
            <span>
              Narxlar ochiq. Buyurtma uchun{' '}
              <Link href="/kirish?rejim=royxat&keyin=%2Fkatalog" className="font-semibold text-brend hover:underline">ro‘yxatdan o‘ting</Link>
              {' '}— faqat telefon raqami kerak.
            </span>
          </p>
        )}

        <div className="mt-6">
          {tovarlar.length === 0 ? (
            <div className="rounded-[20px] border border-chiziq bg-yuza px-6 py-14 text-center">
              <PackageOpen size={32} strokeWidth={1.5} className="mx-auto text-chiziq-2" aria-hidden />
              <p className="mt-3 text-[15px] font-semibold">
                {hammasi.length === 0 ? 'Vitrina hali to‘ldirilmagan' : 'Hech narsa topilmadi'}
              </p>
              {hammasi.length > 0 && (
                <Link href="/katalog" className="mt-2 inline-block text-sm font-semibold text-brend">Filtrlarni tozalash</Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
              {tovarlar.map(t => (
                <MahsulotKartasi key={t.elonId} tovar={kartaga(t)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Qobiq>
  )
}
