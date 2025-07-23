// 4. Create tailwind.config.js (Styling)
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        confirmsure: {
          blue: '#4169E1',
          green: '#10B981',
          gray: '#6B7280'
        }
      }
    },
  },
  plugins: [],
}
