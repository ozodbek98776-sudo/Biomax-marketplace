import type { NextRequest } from 'next/server'
import { seansYop } from '@/lib/hisob'
import { javob, ozSaytdanmi } from '@/lib/api'

export const dynamic = 'force-dynamic'

// Chiqish POST bilan — GET bo'lsa begona sahifadagi <img src="/api/chiqish">
// mijozni jimgina tizimdan chiqarib yuborardi.
export async function POST(req: NextRequest) {
  if (!ozSaytdanmi(req)) return javob({ kod: 'taqiqlangan', xato: 'Ruxsat yo‘q' }, 403)
  await seansYop()
  return javob({ ok: true })
}
