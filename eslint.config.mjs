import koreWebVitals from 'eslint-config-next/core-web-vitals'
import typescript from 'eslint-config-next/typescript'

// `eslint-config-next` 16 flat konfiguratsiyani O'ZI beradi.
// `FlatCompat` orqali o'rash bu versiyada aylanma havola xatosini
// keltirib chiqaradi ("Converting circular structure to JSON").
export default [
  ...koreWebVitals,
  ...typescript,
  {
    rules: {
      // Domen xatolari `Natija<T>` orqali qaytariladi, `any` bilan emas.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  { ignores: ['.next/**', 'node_modules/**', 'prisma/**'] },
]
