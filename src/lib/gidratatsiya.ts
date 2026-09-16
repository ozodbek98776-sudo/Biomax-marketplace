'use client'

import { useSyncExternalStore } from 'react'

// Sahifa JavaScript'i to'liq ulanganmi (gidratatsiya tugaganmi).
//
// Server HTML'i JS kelmasdan oldin ko'rinadi va bosiladi. Shu paytda forma yuborilsa
// brauzer uni O'ZI yuboradi (`POST /kirish`): sahifa qayta yuklanadi, yozilgan raqam
// yoki manzil yo'qoladi va hech narsa bo'lmaydi. Sekin mobil internetda buni mijoz
// "kirish ishlamayapti" deb biladi. Yuborish tugmasi shu belgi `true` bo'lguncha
// o'chiq turadi — o'chiq asosiy tugmada Enter bilan ham forma yuborilmaydi.

const obuna = () => () => {}

/** Serverda va gidratatsiya paytida `false`, brauzerda ulangach `true`. */
export function useGidratatsiya(): boolean {
  return useSyncExternalStore(obuna, () => true, () => false)
}
