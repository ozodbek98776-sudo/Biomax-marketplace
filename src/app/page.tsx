import Link from 'next/link'
import {
  AlertTriangle, ArrowRight, Banknote, Clock, Minus, Package, PackageCheck,
  PackageOpen, Plus, Store, Tag,
} from 'lucide-react'
import Qobiq, { KONTEYNER } from '@/components/Qobiq'
import TrendMahsulotlar from '@/components/sayt/TrendMahsulotlar'
import { MavjudlikBelgisi, Narx } from '@/components/ui/Belgilar'
import { kartaga, type KartaTovari } from '@/lib/domen/karta'
import { vitrina } from '@/lib/domen/vitrina'
import { joriyHisob } from '@/lib/hisob'
import { DOKON, faolHududlarMatni } from '@/lib/dokon'
import { dokonAloqa } from '@/lib/dokon-server'
import { narxMatni } from '@/lib/domen/narx'
import { cn } from '@/lib/cn'

// Landing — ro'yxatdan o'tmagan mehmonning birinchi ko'radigan sahifasi.
//
// Tamoyil: mehmon HAMMA narsani ko'radi (mahsulot, narx, mavjudlik), faqat
// buyurtma berish uchun ro'yxatdan o'tadi. Narxni yashirib "ro'yxatdan
// o'ting" deyish — ishonchni birinchi soniyada yo'qotish.

/** Bo'lim sarlavhasi ustidagi qizil yorliq. */
function Ustsarlavha({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-raqam text-[11.5px] uppercase tracking-[0.12em] text-brend sm:text-xs">{children}</span>
  )
}

const H2 = 'text-[28px] font-extrabold leading-[1.1] tracking-[-0.03em] sm:text-[34px] lg:text-[40px]'

export default async function BoshSahifa() {
  const [natija, hisob, aloqa] = await Promise.all([vitrina(), joriyHisob(), dokonAloqa()])
  const kirgan = !!hisob

  const tovarlar: KartaTovari[] = natija.ok ? natija.qiymat.slice(0, 8).map(kartaga) : []
  // Qahramon kompozitsiyasidagi karta — haqiqiy, sotuvda bor mahsulot
  const namuna = tovarlar.find(t => t.mavjudlik !== 'YOQ' && t.narxSom !== null) ?? null
  const minNarx = Math.min(...DOKON.hududlar.filter(h => h.faol).map(h => h.narxSom))

  return (
    <Qobiq>
      {/* ═══ Qahramon ═══ */}
      <section className={cn(KONTEYNER, 'grid items-center gap-10 pb-16 pt-10 sm:pt-14 lg:grid-cols-2 lg:gap-14 lg:pb-[88px] lg:pt-[72px]')}>
        <div className="flex flex-col gap-5 sm:gap-[26px]">
          <span className="flex h-[34px] items-center gap-2 self-start rounded-full border border-chiziq bg-yuza pl-2.5 pr-3.5 text-[12.5px] font-medium text-siyoh-2 sm:text-[13px]">
            <span className="h-2 w-2 rounded-full bg-bor" aria-hidden />
            {faolHududlarMatni}da 2 soatda yetkazamiz
          </span>
          {/* Dizayndagidek ikki qator: birinchi qator keng ekranda bo'linmaydi,
              tire esa hech qachon yolg'iz qolmaydi (uzilmas probel). */}
          <h1 className="text-[40px] font-extrabold leading-[1.04] tracking-[-0.035em] sm:text-[54px] lg:text-[44px] xl:text-[58px] xl:leading-[1.02]">
            <span className="sm:whitespace-nowrap">Do‘kondagi narxda&nbsp;—</span>{' '}
            <br className="hidden sm:block" />eshigingizgacha
          </h1>
          <p className="max-w-[34em] text-base leading-relaxed text-siyoh-2 sm:text-[18.5px] sm:leading-[1.6]">
            BioMax do‘konidagi oziq-ovqat, uy kimyosi va gigiyena mahsulotlarini onlayn tanlang.
            Pulni mahsulotni qo‘lingizga olganingizda to‘laysiz.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-[22px]">
            {kirgan ? (
              <Link href="/katalog" className="flex h-14 items-center justify-center gap-2.5 rounded-[14px] bg-brend px-7 text-[16.5px] font-semibold text-white transition hover:bg-brend-quyuq">
                Xaridni boshlash <ArrowRight size={19} strokeWidth={2.2} aria-hidden />
              </Link>
            ) : (
              <Link href="/kirish?rejim=royxat" className="flex h-14 items-center justify-center gap-2.5 rounded-[14px] bg-brend px-7 text-[16.5px] font-semibold text-white transition hover:bg-brend-quyuq">
                Ro‘yxatdan o‘tish <ArrowRight size={19} strokeWidth={2.2} aria-hidden />
              </Link>
            )}
            <Link
              href={kirgan ? '/savat' : '#mahsulotlar'}
              className="flex h-12 items-center justify-center gap-1.5 rounded-[14px] border border-chiziq text-[15.5px] font-semibold text-siyoh transition hover:text-brend sm:h-auto sm:border-0"
            >
              {kirgan ? 'Savatim' : 'Avval mahsulotlarni ko‘rish'} <ArrowRight size={17} strokeWidth={2.2} aria-hidden />
            </Link>
          </div>

          <dl className="grid grid-cols-3 gap-3 border-t border-chiziq pt-5 sm:flex sm:gap-7 sm:pt-[22px]">
            {[
              ['Do‘kon narxi', 'kassadagi bilan bir xil'],
              ['Yetkazishda to‘lov', 'naqd yoki karta'],
              ['Jonli mavjudlik', 'ombordan to‘g‘ridan-to‘g‘ri'],
            ].map(([s, m], i) => (
              <div key={s} className={cn('flex flex-col gap-[3px]', i > 0 && 'sm:border-l sm:border-chiziq sm:pl-7')}>
                <dt className="text-[13.5px] font-bold leading-snug sm:text-[15px]">{s}</dt>
                <dd className="text-xs leading-snug text-xira sm:text-[13px]">{m}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Kompozitsiya: buyurtma holati + mahsulot kartasi. Bezak — ekran
            o'quvchidan yashirilgan, ma'nosi yuqoridagi matnda bor. */}
        <div aria-hidden className="nuqtali relative h-[380px] overflow-hidden rounded-[28px] bg-yuza-2 sm:h-[480px] lg:h-[540px]">
          <div className="absolute left-4 top-5 w-[min(330px,calc(100%-2rem))] rounded-[20px] border border-chiziq bg-yuza p-4 shadow-[0_18px_40px_-22px_rgba(26,20,22,.35)] sm:left-10 sm:top-11 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="font-raqam text-[12.5px] font-semibold text-xira">MP-2026-00042</span>
              <span className="rounded-full bg-bor-och px-2.5 py-1 text-[11px] font-bold text-bor">YO‘LDA</span>
            </div>
            <div className="mt-3 text-[19px] font-bold tracking-[-0.01em]">Taxminan 14:40 da</div>
            <div className="mt-0.5 text-[13px] text-xira">Kuryer yo‘lga chiqdi</div>
            <div className="mt-[18px] grid grid-cols-4 gap-1.5">
              {[1, 1, 1, 0].map((b, i) => (
                <span key={i} className={cn('h-[5px] rounded-full', b ? 'bg-bor' : 'bg-chiziq')} />
              ))}
            </div>
            <div className="mt-[7px] grid grid-cols-4 gap-1.5 text-[10.5px] text-xira">
              <span>Qabul</span><span>Yig‘ildi</span><span className="font-semibold text-siyoh">Yo‘lda</span><span>Topshirildi</span>
            </div>
          </div>

          {namuna && (
            <div className="absolute bottom-5 right-4 w-[190px] overflow-hidden rounded-[20px] border border-chiziq bg-yuza shadow-[0_22px_50px_-24px_rgba(26,20,22,.4)] sm:bottom-auto sm:right-10 sm:top-[186px] sm:w-[224px]">
              <div className="relative flex h-[110px] items-center justify-center bg-linear-to-br from-rasm-1 to-rasm-2 sm:h-[150px]">
                {namuna.rasm ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={namuna.rasm} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Package size={52} strokeWidth={1.3} className="text-chiziq-2" />
                )}
                <MavjudlikBelgisi holat={namuna.mavjudlik} className="absolute left-2.5 top-2.5" />
              </div>
              <div className="flex flex-col gap-2 p-3 sm:px-3.5 sm:pb-3.5 sm:pt-[13px]">
                <span className="line-clamp-2 text-[13px] font-medium leading-[1.35] sm:text-sm">{namuna.nomi}</span>
                <Narx som={namuna.narxSom} className="text-[16px] sm:text-lg" />
                <span className="flex h-9 items-center justify-center rounded-xl bg-brend text-[13.5px] font-semibold text-white sm:h-[42px] sm:text-sm">Savatga</span>
              </div>
            </div>
          )}

          <div className="absolute bottom-12 left-16 hidden items-center gap-3 rounded-2xl border border-chiziq bg-yuza py-3 pl-3 pr-4 shadow-[0_16px_36px_-22px_rgba(26,20,22,.35)] sm:flex">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brend-och">
              <Banknote size={21} strokeWidth={1.8} className="text-brend" />
            </span>
            <span className="flex flex-col gap-px">
              <span className="text-sm font-semibold">Naqd — kuryerga</span>
              <span className="text-xs text-xira">oldindan to‘lov yo‘q</span>
            </span>
          </div>
        </div>
      </section>

      {/* ═══ Qanday ishlaydi ═══ */}
      <section id="qanday-ishlaydi" className="border-y border-chiziq bg-yuza">
        <div className={cn(KONTEYNER, 'py-14 sm:py-16 lg:py-[76px]')}>
          <div className="mb-8 flex flex-col gap-4 lg:mb-10 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
            <div>
              <Ustsarlavha>Qanday ishlaydi</Ustsarlavha>
              <h2 className={cn(H2, 'mt-2.5')}>Uch qadam — va buyurtma yo‘lda</h2>
            </div>
            <p className="max-w-[26em] text-[15px] leading-relaxed text-xira sm:text-[15.5px]">
              Mahsulot va narxlarni hozir ko‘ra olasiz. Buyurtma berish uchun bir marta ro‘yxatdan o‘tasiz.
            </p>
          </div>
          <ol className="grid gap-4 md:grid-cols-3 lg:gap-6">
            {[
              ['Ro‘yxatdan o‘ting', 'Faqat ism va telefon raqami. Telegram’ingizga kelgan kod bilan tasdiqlaysiz — parol kerak emas.'],
              ['Savatga soling', 'Omborda bor mahsulotlarni tanlang, manzilni xaritada belgilang. Buyurtma do‘konga darhol boradi.'],
              ['Qabul qiling', 'Kuryer olib keladi. Mahsulotni ko‘rib, shundagina naqd yoki karta bilan to‘laysiz.'],
            ].map(([s, m], i) => (
              <li key={s} className="flex flex-col gap-3 rounded-[20px] border border-chiziq bg-qogoz p-6 lg:gap-3.5 lg:p-7">
                <span className="font-raqam text-[15px] font-semibold text-brend">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="text-[19px] font-bold tracking-[-0.015em] lg:text-[21px]">{s}</h3>
                <p className="text-[15px] leading-relaxed text-siyoh-2">{m}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ═══ Trenddagi mahsulotlar ═══ */}
      <section id="mahsulotlar" className={cn(KONTEYNER, 'pb-16 pt-14 sm:pt-16 lg:pb-20 lg:pt-[88px]')}>
        <div className="mb-5 flex items-end justify-between gap-6 sm:mb-6">
          <div>
            <Ustsarlavha>Trenddagi mahsulotlar</Ustsarlavha>
            <h2 className={cn(H2, 'mt-2.5')}>Hozir ko‘p olinayotganlar</h2>
          </div>
          <Link href="/katalog" className="flex shrink-0 items-center gap-1.5 pb-1 text-[14.5px] font-semibold text-brend hover:text-brend-quyuq sm:text-[15px]">
            <span className="sm:hidden">Barchasi</span>
            <span className="hidden sm:inline">Barcha mahsulotlar</span>
            <ArrowRight size={17} strokeWidth={2.2} aria-hidden />
          </Link>
        </div>

        {!natija.ok ? (
          <BoshHolat Ikonka={AlertTriangle} sarlavha="Mahsulotlar vaqtincha ochilmadi" matn={natija.xato.xabar} />
        ) : tovarlar.length === 0 ? (
          <BoshHolat Ikonka={PackageOpen} sarlavha="Vitrina hali to‘ldirilmagan" matn="Do‘kon mahsulotlarni chiqarishi bilan shu yerda ko‘rinadi." />
        ) : (
          <TrendMahsulotlar tovarlar={tovarlar} />
        )}
      </section>

      {/* ═══ Nega BioMax ═══ */}
      <section className={cn(KONTEYNER, 'pb-16 lg:pb-[88px]')}>
        <div className="grid items-start gap-8 lg:grid-cols-[380px_minmax(0,1fr)] lg:gap-14">
          <div className="flex flex-col gap-3.5 lg:sticky lg:top-[104px]">
            <Ustsarlavha>Nega BioMax</Ustsarlavha>
            <h2 className={H2}>Onlayn buyurtmaning odatiy xavotirlari — bizda yo‘q</h2>
            <p className="text-[15.5px] leading-relaxed text-xira">
              Sayt do‘konning o‘z tizimiga ulangan: narx, mavjudlik va buyurtma — bitta manbadan.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:gap-5">
            {([
              [Tag, 'bg-brend-och text-brend', '«Saytda arzon, olib kelganda qimmat»', 'Saytdagi narx — kassadagi narxning o‘zi. Ikkalasi bitta tizimdan olinadi, farq qilishi mumkin emas.'],
              [PackageCheck, 'bg-bor-och text-bor', '«Buyurtma qildim — yo‘q ekan»', 'Mavjudlik ombordan jonli ko‘rsatiladi. Buyurtmangiz tasdiqlanganda mahsulot siz uchun band qilinadi.'],
              [Banknote, 'bg-kam-och text-kam', '«Pulni oldin to‘lasam-u, kelmasa?»', 'Oldindan hech narsa to‘lamaysiz. Mahsulotni ko‘rib, kuryerga naqd yoki karta bilan to‘laysiz.'],
              [Clock, 'bg-kok-och text-kok', '«Qachon keladi — noma’lum»', 'Tasdiqlandi, yig‘ilmoqda, yo‘lda — har bir holat profilingizda vaqti bilan ko‘rinib turadi.'],
            ] as const).map(([Ikonka, rang, s, m]) => (
              <div key={s} className="flex flex-col gap-3 rounded-[20px] border border-chiziq bg-yuza p-6 lg:p-[26px]">
                <span className={cn('flex h-[46px] w-[46px] items-center justify-center rounded-[14px]', rang)}>
                  <Ikonka size={22} strokeWidth={1.8} aria-hidden />
                </span>
                <h3 className="text-[17.5px] font-bold lg:text-[18.5px]">{s}</h3>
                <p className="text-[14.5px] leading-relaxed text-siyoh-2">{m}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Yetkazib berish ═══ */}
      <section id="yetkazish" className={cn(KONTEYNER, 'pb-16 lg:pb-[88px]')}>
        <div className="grid overflow-hidden rounded-[28px] border border-chiziq bg-yuza md:grid-cols-2">
          <div className="flex flex-col gap-5 p-6 sm:p-10 lg:gap-[22px] lg:px-14 lg:py-[52px]">
            <Ustsarlavha>Yetkazib berish</Ustsarlavha>
            <h2 className="text-[28px] font-extrabold leading-[1.12] tracking-[-0.03em] sm:text-[36px]">Qayerga va qancha vaqtda</h2>
            <ul className="flex flex-col gap-px overflow-hidden rounded-2xl border border-chiziq bg-chiziq">
              {DOKON.hududlar.map(h => (
                <li key={h.nomi} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 bg-yuza px-[18px] py-4">
                  <span className="flex items-center gap-2.5 text-[15px] font-semibold">
                    <span className="h-2 w-2 rounded-full bg-bor" aria-hidden />{h.nomi}
                  </span>
                  <span className="text-sm text-siyoh-2">{h.muddat} · {narxMatni(h.narxSom)}</span>
                </li>
              ))}
              <li className="flex items-center justify-between gap-4 bg-qogoz px-[18px] py-4">
                <span className="flex items-center gap-2.5 text-[15px] font-semibold text-xira">
                  <span className="h-2 w-2 rounded-full bg-chiziq-2" aria-hidden />Boshqa tumanlar
                </span>
                <span className="text-sm text-xira">tez orada</span>
              </li>
            </ul>
            <div className="flex items-center gap-3 rounded-[14px] bg-qogoz px-4 py-3.5">
              <Store size={20} strokeWidth={1.8} className="shrink-0 text-siyoh-2" aria-hidden />
              <span className="text-sm text-siyoh-2">
                <strong className="font-semibold text-siyoh">Olib ketish ham mumkin</strong> — do‘kondan, bepul{aloqa.manzil ? `: ${aloqa.manzil}` : ''}
              </span>
            </div>
          </div>
          <div className="relative min-h-[260px] bg-xarita">
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 600 500" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Yetkazib berish hududlari xaritasi">
              <path d="M0 120h600M0 260h600M0 390h600M110 0v500M260 0v500M420 0v500M540 0v500" className="stroke-xarita-yol" strokeWidth="14" />
              <path d="M0 120h600M0 260h600M0 390h600M110 0v500M260 0v500M420 0v500M540 0v500" className="stroke-xarita-yol-2" strokeWidth="7" />
              <path d="M40 470 L220 60" className="stroke-xarita-yol" strokeWidth="12" />
              <path d="M40 470 L220 60" className="stroke-xarita-yol-2" strokeWidth="5" />
              <path d="M150 300 C150 210 240 170 300 200 C360 230 360 320 300 360 C240 400 150 380 150 300 Z" className="fill-bor stroke-bor" fillOpacity=".13" strokeOpacity=".5" strokeWidth="2" strokeDasharray="6 5" />
              <path d="M320 150 C330 80 430 60 480 110 C530 160 500 250 440 260 C380 270 310 220 320 150 Z" className="fill-bor stroke-bor" fillOpacity=".13" strokeOpacity=".5" strokeWidth="2" strokeDasharray="6 5" />
              <text x="232" y="296" fontSize="15" fontWeight="700" textAnchor="middle" className="fill-xarita-matn font-sans">Chilonzor</text>
              <text x="418" y="172" fontSize="15" fontWeight="700" textAnchor="middle" className="fill-xarita-matn font-sans">Yunusobod</text>
              <circle cx="330" cy="250" r="20" className="fill-brend" fillOpacity=".16" />
              <path d="M330 262s-11-8-11-16a11 11 0 0 1 22 0c0 8-11 16-11 16Z" className="fill-brend" />
              <circle cx="330" cy="246" r="4" fill="#FFFFFF" />
              <rect x="346" y="266" width="84" height="26" rx="8" className="fill-yuza" />
              <text x="388" y="283" fontSize="12" fontWeight="600" textAnchor="middle" className="fill-siyoh font-sans">BioMax</text>
            </svg>
          </div>
        </div>
      </section>

      {/* ═══ Savol-javob ═══ */}
      <section id="savollar" className={cn(KONTEYNER, 'grid gap-8 pb-16 lg:grid-cols-[380px_minmax(0,1fr)] lg:gap-14 lg:pb-[88px]')}>
        <div className="flex flex-col gap-3.5">
          <Ustsarlavha>Savol-javob</Ustsarlavha>
          <h2 className={H2}>Ko‘p beriladigan savollar</h2>
        </div>
        <div className="flex flex-col gap-px overflow-hidden rounded-[20px] border border-chiziq bg-chiziq">
          {[
            ['Ro‘yxatdan o‘tish shartmi?', 'Mahsulot va narxlarni ko‘rish uchun — yo‘q. Buyurtma berish uchun — ha: kuryer kimga qo‘ng‘iroq qilishini va buyurtma kimga tegishli ekanini bilishimiz kerak. Faqat ism va telefon raqami so‘raladi.'],
            ['Qanday to‘layman?', 'Mahsulotni qo‘lingizga olganingizda — naqd pul yoki karta bilan. Buyurtma berishda oldindan hech narsa to‘lanmaydi.'],
            ['Mahsulot tugab qolsa nima bo‘ladi?', 'Mavjudlik do‘kon omboridan jonli ko‘rsatiladi va buyurtma berish paytida yana bir bor tekshiriladi — tugagan mahsulot bilan buyurtma o‘tmaydi. Siz faqat olib kelingan mahsulot uchun to‘laysiz.'],
            ['Buyurtmani bekor qilsam bo‘ladimi?', 'Ha. Buyurtma kuryerga topshirilguncha kabinetingizda bir bosishda bekor qilasiz, hech narsa to‘lamaysiz. Yo‘lga chiqqan buyurtma bo‘yicha do‘konga qo‘ng‘iroq qiling.'],
            ['Buyurtma holatini qayerdan bilaman?', 'Kabinetingizda — qabul qilindi, tasdiqlandi, yig‘ilmoqda, yo‘lda. Holat o‘zgarganda Telegram’ingizga ham xabar keladi.'],
            [`Yetkazib berish qancha turadi?`, `${faolHududlarMatni} bo‘ylab ${narxMatni(minNarx)}, odatda 2 soat ichida. Do‘kondan o‘zingiz olib ketsangiz — bepul.`],
          ].map(([s, j], i) => (
            <details key={s} open={i === 0} className="group bg-yuza">
              <summary className="flex cursor-pointer items-center justify-between gap-5 px-5 py-5 text-[16px] font-bold sm:px-[26px] sm:py-[22px] sm:text-[17px]">
                {s}
                <Plus size={20} strokeWidth={2} className="shrink-0 text-xira group-open:hidden" aria-hidden />
                <Minus size={20} strokeWidth={2} className="hidden shrink-0 text-siyoh group-open:block" aria-hidden />
              </summary>
              <p className="-mt-1 max-w-[58ch] px-5 pb-5 text-[15px] leading-[1.65] text-siyoh-2 sm:px-[26px] sm:pb-[22px]">{j}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ═══ Yakuniy chaqiriq ═══ */}
      <section className={cn(KONTEYNER, 'pb-16 lg:pb-20')}>
        <div className="relative flex flex-col gap-7 overflow-hidden rounded-[28px] bg-teskari px-6 py-10 sm:px-12 sm:py-14 md:flex-row md:items-center md:justify-between md:gap-12 lg:px-[72px] lg:py-16">
          <div className="nuqtali-och absolute inset-0" aria-hidden />
          <div className="relative flex flex-col gap-3">
            <h2 className="text-[30px] font-extrabold leading-[1.08] tracking-[-0.03em] text-teskari-matn sm:text-[36px] lg:text-[42px]">
              {kirgan ? <>Savatingizni<br />bugun to‘ldiring</> : <>Birinchi buyurtmangizni<br />bugun bering</>}
            </h2>
            <p className="text-[15.5px] text-teskari-xira sm:text-[16.5px]">
              {kirgan ? 'Do‘kondagi narxda — 2 soatda eshigingizgacha.' : 'Ro‘yxatdan o‘tish uchun faqat telefon raqami kerak.'}
            </p>
          </div>
          <Link
            href={kirgan ? '/katalog' : '/kirish?rejim=royxat'}
            className="relative flex h-14 shrink-0 items-center justify-center gap-2.5 rounded-[14px] bg-brend px-[30px] text-[17px] font-semibold text-white transition hover:bg-brend-quyuq sm:h-[58px]"
          >
            {kirgan ? 'Katalogni ochish' : 'Ro‘yxatdan o‘tish'}
            <ArrowRight size={19} strokeWidth={2.2} aria-hidden />
          </Link>
        </div>
      </section>
    </Qobiq>
  )
}

function BoshHolat({ Ikonka, sarlavha, matn }: { Ikonka: typeof PackageOpen; sarlavha: string; matn: string }) {
  return (
    <div className="rounded-[20px] border border-chiziq bg-yuza px-6 py-14 text-center">
      <Ikonka size={32} strokeWidth={1.5} className="mx-auto text-chiziq-2" aria-hidden />
      <p className="mt-3 text-[15px] font-semibold">{sarlavha}</p>
      <p className="mt-1 text-[13.5px] text-xira">{matn}</p>
    </div>
  )
}
