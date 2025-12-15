/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    // Status colors - background
    'bg-slate-50', 'bg-red-50', 'bg-orange-50', 'bg-amber-50', 'bg-yellow-50',
    'bg-lime-50', 'bg-green-50', 'bg-emerald-50', 'bg-teal-50', 'bg-cyan-50',
    'bg-sky-50', 'bg-blue-50', 'bg-indigo-50', 'bg-violet-50', 'bg-purple-50',
    'bg-fuchsia-50', 'bg-pink-50', 'bg-rose-50',
    
    // Status colors - text
    'text-slate-600', 'text-red-600', 'text-orange-600', 'text-amber-600', 'text-yellow-600',
    'text-lime-600', 'text-green-600', 'text-emerald-600', 'text-teal-600', 'text-cyan-600',
    'text-sky-600', 'text-blue-600', 'text-indigo-600', 'text-violet-600', 'text-purple-600',
    'text-fuchsia-600', 'text-pink-600', 'text-rose-600',
    
    // Status colors - border
    'border-slate-200', 'border-red-200', 'border-orange-200', 'border-amber-200', 'border-yellow-200',
    'border-lime-200', 'border-green-200', 'border-emerald-200', 'border-teal-200', 'border-cyan-200',
    'border-sky-200', 'border-blue-200', 'border-indigo-200', 'border-violet-200', 'border-purple-200',
    'border-fuchsia-200', 'border-pink-200', 'border-rose-200',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Cairo', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#01578a',
          700: '#02456e',
          800: '#075985',
          900: '#0c4a6e',
        }
      }
    }
  },
  plugins: [],
}
