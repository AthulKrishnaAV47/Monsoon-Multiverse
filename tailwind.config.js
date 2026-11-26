/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        climate: {
          navy: '#0A192F',
          dark: '#0F172A',
          blue: '#0284C7',
          cyan: '#06B6D4',
          teal: '#0D9488',
          emerald: '#10B981',
          amber: '#F59E0B',
          orange: '#EA580C',
          crimson: '#DC2626',
          surface: '#F8FAFC',
          card: '#FFFFFF',
          border: '#E2E8F0',
          subtext: '#64748B'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace']
      }
    },
  },
  plugins: [],
}
