import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Qobiq, { KONTEYNER } from '@/components/Qobiq'
import RasmiylashtirishFormasi from '@/components/sayt/RasmiylashtirishFormasi'
import { hisobTalab } from '@/lib/hisob'
import { savatniOl } from '@/lib/domen/savat'
import { vaqtOraliqlari } from '@/lib/domen/buyurtma'
import { dokonAloqa } from '@/lib/dokon-server'
import { DOKON } from '@/lib/dokon'
import { db } from '@/lib/db'
import { mahalliyQism } from '@/lib/domen/telefon'
import { cn } from '@/lib/cn'

export const metadata: Metadata = { title: 'Buyurtmani rasmiylashtirish', robots: { index: false } }

export default async function RasmiylashtirishSahifasi() {
  const hisob = await hisobTalab('/rasmiylashtirish')
  const [savat, manzillar, aloqa] = await Promise.all([
    savatniOl(hisob.id),
    db.mpManzil.findMany({
      where: { hisobId: hisob.id },
      orderBy: [{ asosiy: 'desc' }, { id: 'desc' }],
      take: 6,
      select: { id: true, nomi: true, viloyat: true, manzil: true, moljal: true, lat: true, lng: true },
    }),
    dokonAloqa(),
  ])

  // Bo'sh yoki muammoli savat bilan bu sahifaga kelish ma'nosiz — savatda hal qilinadi
  if (!savat.ok || savat.qiymat.qatorlar.length === 0 || savat.qiymat.muammoBor) redirect('/savat')

  const hududlar = DOKON.hududlar.filter(h => h.faol)

  return (
    <Qobiq>
      <div className={cn(KONTEYNER, 'pb-16 pt-8 sm:pt-10')}>
        <h1 className="text-[28px] font-extrabold tracking-[-0.03em] sm:text-[34px]">Buyurtmani rasmiylashtirish</h1>
        <p className="mt-1 text-sm text-xira">Oldindan to‘lov yo‘q — mahsulotni qabul qilganda to‘laysiz.</p>

        <RasmiylashtirishFormasi
          qatorlar={savat.qiymat.qatorlar.map(q => ({
            elonId: q.elonId, nomi: q.nomi, miqdor: q.miqdor, birlik: q.birlik, jamiSom: q.jamiSom ?? 0, rasm: q.rasm,
          }))}
          mahsulotSumma={savat.qiymat.mahsulotSumma}
          hududlar={hududlar.map(h => ({ nomi: h.nomi, narxSom: h.narxSom, muddat: h.muddat }))}
          oraliqlar={vaqtOraliqlari().map(o => ({ id: o.id, kun: o.kun, yorliq: o.yorliq }))}
          manzillar={manzillar.map(m => ({ ...m, hudud: m.viloyat }))}
          standart={{ ism: hisob.ism ?? '', telefon: mahalliyQism(hisob.telefon) }}
          olibKetishManzili={aloqa.manzil}
        />
      </div>
    </Qobiq>
  )
}
