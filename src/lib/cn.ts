import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Tailwind sinflarini birlashtiradi va ziddiyatlarni oxirgisi foydasiga hal qiladi. */
export function cn(...q: ClassValue[]) {
  return twMerge(clsx(q))
}
