import coreWebVitals from 'eslint-config-next/core-web-vitals'
import typescript from 'eslint-config-next/typescript'

// eslint-config-next 16 отдаёт плоский конфиг напрямую — обёртка FlatCompat
// здесь не нужна и ломается на циклических ссылках в плагинах.
const config = [
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'] },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      // Подчёркивание — принятая пометка «аргумент нужен по сигнатуре,
      // но не используется»: интерфейсы провайдеров требуют параметр целиком.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'after-used',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
    },
  },
]

export default config
