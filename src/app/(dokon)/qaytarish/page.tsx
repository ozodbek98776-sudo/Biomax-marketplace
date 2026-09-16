import Link from 'next/link'
import type { Metadata } from 'next'
import { RotateCcw } from 'lucide-react'
import Qobiq, { KONTEYNER } from '@/components/Qobiq'
import { dokonAloqa } from '@/lib/dokon-server'
import { cn } from '@/lib/cn'

export const metadata: Metadata = {
  title: 'Qaytarish va almashtirish',
  description: 'BioMax onlayn do‘konida mahsulotni qaytarish va almashtirish shartlari.',
}

export default async function QaytarishSahifasi() {
  const aloqa = await dokonAloqa()
  return (
    <Qobiq>
      <div className={cn(KONTEYNER, 'pb-16 pt-8 sm:pt-12')}>
        <div className="mx-auto flex max-w-[720px] flex-col gap-6">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brend-och text-brend"><RotateCcw size={26} aria-hidden /></span>
          <h1 className="text-[30px] font-extrabold tracking-[-0.03em] sm:text-[38px]">Qaytarish va almashtirish</h1>
          <div className="whitespace-pre-line text-[16px] leading-[1.75] text-siyoh-2">
            {aloqa.qaytarishShartlari ?? 'Qaytarish shartlari bo‘yicha do‘konga murojaat qiling.'}
          </div>
          <div className="rounded-2xl border border-chiziq bg-yuza p-5 text-[15px]">
            <p className="font-semibold">Qanday murojaat qilaman?</p>
            <p className="mt-1 text-siyoh-2">
              {aloqa.telefon ? <>Do‘konga qo‘ng‘iroq qiling: <a href={`tel:${aloqa.telefon.replace(/[^\d+]/g, '')}`} className="font-semibold text-brend">{aloqa.telefon}</a>. </> : 'Do‘konga murojaat qiling. '}
              Buyurtma raqamingiz <Link href="/kabinet#buyurtmalar" className="font-semibold text-brend">kabinetingizda</Link>.
            </p>
          </div>
        </div>
      </div>
    </Qobiq>
  )
}
