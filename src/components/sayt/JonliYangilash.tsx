'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Sahifani qayta yuklamasdan jonli yangilab turadi.
 *
 * Har `oraliqMs` da `url` dan qisqa belgini so'raydi. Belgi o'zgarsa (do'kon
 * buyurtmani tasdiqladi, kuryer yo'lga chiqdi...) server komponenti qayta
 * chiziladi — mijoz scroll joyi va ochiq oynalar saqlanadi.
 *
 * Tejamkorlik: sahifa ko'rinmayotganda so'rov yuborilmaydi, qaytib
 * ochilganda darhol tekshiriladi; tarmoq xatosida oraliq ikki barobar
 * uzayadi (ko'pi bilan 1 daqiqa).
 */
export default function JonliYangilash({ url, oraliqMs = 5_000 }: { url: string; oraliqMs?: number }) {
  const router = useRouter()
  const oxirgi = useRef<string | null>(null)

  useEffect(() => {
    let toxtadi = false
    let taymer: ReturnType<typeof setTimeout> | undefined
    let kutish = oraliqMs

    const rejala = (ms: number) => {
      clearTimeout(taymer)
      taymer = setTimeout(tekshir, ms)
    }

    async function tekshir() {
      if (toxtadi || document.visibilityState !== 'visible') return
      try {
        const javob = await fetch(url, { cache: 'no-store' })
        if (!javob.ok) throw new Error(String(javob.status))
        const { belgi } = (await javob.json()) as { belgi?: string }
        if (typeof belgi === 'string') {
          if (oxirgi.current !== null && belgi !== oxirgi.current) router.refresh()
          oxirgi.current = belgi
        }
        kutish = oraliqMs
      } catch {
        kutish = Math.min(kutish * 2, 60_000)
      }
      if (!toxtadi) rejala(kutish)
    }

    const qaytaOchildi = () => {
      if (document.visibilityState === 'visible') rejala(0)
    }

    document.addEventListener('visibilitychange', qaytaOchildi)
    window.addEventListener('online', qaytaOchildi)
    rejala(0)

    return () => {
      toxtadi = true
      clearTimeout(taymer)
      document.removeEventListener('visibilitychange', qaytaOchildi)
      window.removeEventListener('online', qaytaOchildi)
    }
  }, [url, oraliqMs, router])

  return null
}
