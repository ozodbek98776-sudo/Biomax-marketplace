import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight, ShieldCheck, Smartphone } from 'lucide-react'
import Qobiq, { KONTEYNER } from '@/components/Qobiq'
import IlovaOrnatish from '@/components/sayt/IlovaOrnatish'
import { FOYDALAR } from '@/lib/ilova'
import { cn } from '@/lib/cn'

// QR kod aynan shu sahifaga olib keladi.
//
// Mijoz kodni skanerlaydi → shu sahifa ochiladi → «Ilovani o'rnatish» ni
// bosadi → telefonning o'zi ruxsat so'raydi → ilova bosh ekranga qo'shiladi.
// (Android'da bir bosish, iPhone'da Apple qo'ygan qadamlar — komponent
// qurilmani o'zi aniqlab, kerakli yo'lni ko'rsatadi.)

export const metadata: Metadata = {
  title: 'Ilovani o‘rnatish',
  description: 'BioMax onlayn do‘konini telefoningizga ilova qilib o‘rnating — bosh ekrandan bir bosishda ochiladi.',
  openGraph: {
    title: 'BioMax ilovasi',
    description: 'Telefoningizga o‘rnating — buyurtma berish va holatini kuzatish bir bosishda.',
  },
}

export default function IlovaSahifasi() {
  return (
    <Qobiq>
      <div className={cn(KONTEYNER, 'pb-16 pt-8 sm:pt-12')}>
        <div className="mx-auto flex max-w-[560px] flex-col gap-7">
          <header className="flex flex-col items-center gap-4 text-center">
            <Image
              src="/ikonka/ikonka-192.png"
              alt=""
              width={88}
              height={88}
              priority
              className="rounded-[22px] shadow-[0_10px_30px_-12px_rgba(198,40,40,0.55)]"
            />
            <h1 className="text-[28px] font-extrabold tracking-[-0.03em] sm:text-[34px]">
              BioMax ilovasi
            </h1>
            <p className="text-[16px] leading-[1.6] text-siyoh-2">
              Do‘konimizni telefoningizga o‘rnating: bosh ekrandan bir bosishda ochiladi,
              buyurtmangiz holati esa o‘zi yangilanib turadi.
            </p>
          </header>

          <IlovaOrnatish />

          <ul className="grid gap-3 sm:grid-cols-2">
            {FOYDALAR.map(f => (
              <li key={f.sarlavha} className="rounded-2xl border border-chiziq bg-yuza p-4">
                <p className="text-[15px] font-bold">{f.sarlavha}</p>
                <p className="mt-1 text-[14px] leading-[1.6] text-siyoh-2">{f.matn}</p>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-3 rounded-2xl bg-bor-och/60 p-5 text-[14.5px] leading-[1.65] text-siyoh-2">
            <p className="flex items-start gap-2.5">
              <Smartphone size={18} className="mt-0.5 shrink-0 text-bor" aria-hidden />
              <span>
                Bu <b className="text-siyoh">Play Market yoki App Store</b> orqali emas — saytning o‘zi
                ilova bo‘lib o‘rnatiladi. Bir necha soniya vaqt oladi.
              </span>
            </p>
            <p className="flex items-start gap-2.5">
              <ShieldCheck size={18} className="mt-0.5 shrink-0 text-bor" aria-hidden />
              <span>
                Xohlagan paytda oddiy ilova kabi o‘chirib tashlashingiz mumkin. Telefoningizdagi
                ma’lumotlarga ruxsat so‘ralmaydi.
              </span>
            </p>
          </div>

          <Link
            href="/katalog"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-chiziq bg-yuza text-[15px] font-semibold transition hover:border-chiziq-2"
          >
            Hozircha shunchaki xarid qilish <ArrowRight size={17} aria-hidden />
          </Link>
        </div>
      </div>
    </Qobiq>
  )
}
