import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/@madebykav/ui/**/*.{js,ts,jsx,tsx}',
  ],
}

export default config
