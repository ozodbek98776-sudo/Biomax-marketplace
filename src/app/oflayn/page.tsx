import type { Metadata } from 'next'
import { WifiOff } from 'lucide-react'

// Internet uzilganda servis-ishchi shu sahifani ko'rsatadi.
//
// MUHIM: bu sahifa bazaga ham, ERP'ga ham murojaat qilmaydi — aks holda
// aynan kerak bo'lgan paytda o'zi ham ochilmay qolardi. Shu sababli sayt
// qobig'i (sarlavha, savat) ham ishlatilmaydi.

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Internet aloqasi yo‘q',
  robots: { index: false },
}

export default function OflaynSahifasi() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brend-och text-brend">
        <WifiOff size={28} aria-hidden />
      </span>
      <h1 className="text-[24px] font-extrabold tracking-[-0.02em]">Internet aloqasi yo‘q</h1>
      <p className="max-w-[420px] text-[15.5px] leading-[1.65] text-siyoh-2">
        Sahifani ko‘rsatish uchun internet kerak. Aloqa tiklangach, pastdagi tugmani bosing —
        savatingiz va buyurtmalaringiz joyida turadi.
      </p>
      {/* Server komponentida ham ishlaydi: oddiy HTML formasi, JS talab qilmaydi */}
      <form action="/" className="contents">
        <button
          type="submit"
          className="h-12 rounded-2xl bg-brend px-6 text-[15px] font-bold text-white transition hover:bg-brend-quyuq"
        >
          Qayta urinish
        </button>
      </form>
    </main>
  )
}
