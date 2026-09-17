'use client'

import { useEffect } from 'react'

/**
 * Servis-ishchini ro'yxatdan o'tkazadi (`public/sw.js`).
 *
 * Ikki narsa uchun kerak: ilova o'rnatiladigan bo'lishi (Chrome shuni talab
 * qiladi) va internet uzilganda oq ekran o'rniga tushunarli sahifa chiqishi.
 * Sahifa yuklanib bo'lgach ro'yxatdan o'tkaziladi — birinchi ochilish
 * sekinlashmasin.
 */
export default function ServisIshchi() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    if (!window.isSecureContext) return // http:// da brauzer ruxsat bermaydi

    let bekor = false
    const royxat = () => {
      if (bekor) return
      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .then(r => {
          // Yangi versiya tayyor bo'lsa kutib turmasin
          r.addEventListener('updatefound', () => {
            r.installing?.addEventListener('statechange', function () {
              if (this.state === 'installed' && navigator.serviceWorker.controller) {
                this.postMessage('DARHOL_ALMASH')
              }
            })
          })
        })
        .catch(() => {
          // O'rnatilmasa sayt odatdagidek ishlayveradi
        })
    }

    if (document.readyState === 'complete') royxat()
    else window.addEventListener('load', royxat, { once: true })
    return () => { bekor = true }
  }, [])

  return null
}
