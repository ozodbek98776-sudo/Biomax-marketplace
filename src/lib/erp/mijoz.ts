import 'server-only'
import { katalogBazadan, dokonBazadan, rasmBazadan, rezervBoshatBazada } from './baza'

// ERP ma'lumotlariga yagona kirish nuqtasi.
//
// Ilgari bu fayl ERP'ga HTTP so'rov yuborardi (imzo, qayta urinish, kesh).
// 2026-09-24 dan ma'lumot BITTA BAZAdan to'g'ridan-to'g'ri o'qiladi
// (`./baza.ts`): ERP `public`, vitrina `marketplace` sxemasida — ikkalasi
// bir joyda. Shuning uchun:
//   · narx va mavjudlik REAL VAQTDA (kesh yo'q, 60 soniyalik kechikish yo'q)
//   · HMAC kaliti yoki ERP serveri ishlamay qolsa ham katalog ochiladi
//   · sozlanadigan joy kamaydi (ERP_BASE_URL endi kerak emas)
//
// Chaqiruvchilar uchun nomlar va turlar o'zgarmadi.
//
// ERP → marketplace yo'nalishi (buyurtmalar, mijozlar) hamon HTTP va
// imzo bilan: u yerda ERP bizning `marketplace` sxemamizga yozmaydi,
// balki bizning qoidalarimiz orqali o'tadi (`./kiruvchi.ts`).

/**
 * Vitrina katalogi.
 *
 * Mavjudlik ombor + do'kon yig'indisidan hisoblanadi (TZ 5.1) — ombordagi
 * tovar ham sotuvda ko'rinsin. Aniq qoldiq hech qachon berilmaydi: bazadagi
 * `public.vitrina_katalog` ko'rinishi faqat BOR / KAM / YOQ qaytaradi.
 */
export function katalog() {
  return katalogBazadan()
}

/**
 * Mijoz buyurtmani saytda bekor qilganda ERP'dagi zaxira bandini bo'shatish.
 * Idempotent — band bo'lmasa ham muvaffaqiyatli.
 */
export function rezervBoshat(buyurtmaRaqami: string) {
  return rezervBoshatBazada(buyurtmaRaqami)
}

/** Do'kon aloqa ma'lumotlari — chekdagi bilan bir xil sozlamalar. */
export function dokonMalumoti() {
  return dokonBazadan()
}

/** Mahsulot rasmi (baytlar) — ERP kartochkasidagi tartib bo'yicha. */
export function rasmOl(tovarId: string, tartib: number) {
  return rasmBazadan(tovarId, tartib)
}
