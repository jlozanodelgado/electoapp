/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#090d16',
        surface: {
          DEFAULT: '#0f172a',
          lighter: '#1e293b',
          border: '#334155',
        },
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
        electoral: {
          coalicion: '#10b981', // Verde esmeralda
          alianza: '#3b82f6',   // Azul
          unidad: '#ef4444',    // Rojo
          indeciso: '#f59e0b',  // Amarillo/Ámbar
          blanco: '#94a3b8',    // Gris claro
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      }
    },
  },
  plugins: [],
}

