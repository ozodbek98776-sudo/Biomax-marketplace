import type { NextRequest } from 'next/server'
import { rasmOl } from '@/lib/erp/mijoz'

// Mahsulot rasmi — ERP'dan olinib, versiya bo'yicha keshlanadi.
//
// Brauzer rasmni bir marta yuklab, abadiy saqlaydi (`immutable`): rasm
// almashtirilganda katalogdagi versiya (`?v=`) o'zgaradi va manzil ham
// yangi bo'ladi. Server xotirasida ham kichik kesh: bir rasmni 100 xaridor
// ochsa, ERP'ga bir marta boriladi.

export const dynamic = 'force-dynamic'

const MAKS_BAYT = 64 * 1024 * 1024
const kesh = new Map<string, { turi: string; baytlar: ArrayBuffer }>()
let jami = 0

function keshgaQoy(kalit: string, q: { turi: string; baytlar: ArrayBuffer }) {
  kesh.set(kalit, q)
  jami += q.baytlar.byteLength
  // Eng eski yozuvlar chiqariladi (Map qo'shilish tartibini saqlaydi)
  for (const [k, v] of kesh) {
    if (jami <= MAKS_BAYT) break
    kesh.delete(k)
    jami -= v.baytlar.byteLength
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ tovarId: string; tartib: string }> }) {
  const { tovarId, tartib } = await params
  const i = Number(tartib)
  const versiya = req.nextUrl.searchParams.get('v') ?? ''
  if (!Number.isInteger(i) || i < 0 || i > 20 || !/^[a-z0-9]{10,40}$/i.test(tovarId) || !/^[a-f0-9]{0,40}$/.test(versiya)) {
    return new Response(null, { status: 404 })
  }

  const kalit = `${tovarId}:${i}:${versiya}`
  let rasm = kesh.get(kalit)
  if (rasm) {
    // Oxirgi ishlatilgan — ro'yxat oxiriga
    kesh.delete(kalit)
    kesh.set(kalit, rasm)
  } else {
    const olindi = await rasmOl(tovarId, i)
    if (!olindi) return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } })
    rasm = olindi
    if (versiya) keshgaQoy(kalit, rasm)
  }

  return new Response(rasm.baytlar, {
    headers: {
      'Content-Type': rasm.turi,
      'Content-Length': String(rasm.baytlar.byteLength),
      // Versiyali manzil hech qachon o'zgarmaydi; versiyasiz — qisqa muddat
      'Cache-Control': versiya ? 'public, max-age=31536000, immutable' : 'public, max-age=300',
    },
  })
}
