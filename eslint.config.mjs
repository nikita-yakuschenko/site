import coreWebVitals from 'eslint-config-next/core-web-vitals'
import typescript from 'eslint-config-next/typescript'

// eslint-config-next 16 отдаёт плоский конфиг напрямую — обёртка FlatCompat
// здесь не нужна и ломается на циклических ссылках в плагинах.
const config = [
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'] },
  ...coreWebVitals,
  ...typescript,
]

export default config
