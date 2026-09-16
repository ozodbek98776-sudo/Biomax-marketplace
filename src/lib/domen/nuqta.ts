// Xaritadagi nuqta — sof mantiq. Yetkazish uchun faqat O'zbekiston hududi qabul qilinadi.

export const UZ_CHEGARA = { latMin: 37.1, latMax: 45.6, lngMin: 55.9, lngMax: 73.2 } as const

export function uzbekistondami(lat: number, lng: number): boolean {
  return lat >= UZ_CHEGARA.latMin && lat <= UZ_CHEGARA.latMax && lng >= UZ_CHEGARA.lngMin && lng <= UZ_CHEGARA.lngMax
}

/** `{ lat, lng }` ni tekshiradi. Kenglik va uzunlik almashib qolgan bo'lsa — to'g'rilaydi. */
export function nuqtaniOqi(t: unknown): { xato: string } | { lat: number; lng: number } {
  const o = (t ?? {}) as { lat?: unknown; lng?: unknown }
  const lat = Number(o.lat), lng = Number(o.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { xato: 'Koordinata noto‘g‘ri' }
  if (uzbekistondami(lat, lng)) return { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 }
  if (uzbekistondami(lng, lat)) return { lat: Math.round(lng * 1e6) / 1e6, lng: Math.round(lat * 1e6) / 1e6 }
  return { xato: 'Nuqta O‘zbekiston hududida emas' }
}
