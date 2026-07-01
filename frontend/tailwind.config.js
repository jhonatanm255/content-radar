/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cr: {
          bg: '#F9FAFB',
          card: '#FFFFFF',
          'bg-dark': '#0a0b14',
          'card-dark': '#121421',
          'sidebar-dark': '#0a0b14',
          'elevated-dark': '#1a2234',
          accent: '#6366f1',
          'accent-hover': '#4f46e5',
          'accent-muted': '#1e1b4b',
          'accent-glow': '#2e2a5e',
          border: '#E5E7EB',
          'border-dark': '#1e293b',
          muted: '#94a3b8',
          'muted-fg': '#64748b',
          success: '#22c55e',
          warning: '#eab308',
          danger: '#ef4444',
          info: '#3b82f6',
        },
      },
      borderRadius: {
        cr: '12px',
        'cr-lg': '16px',
      },
      boxShadow: {
        cr: '0 1px 2px 0 rgb(0 0 0 / 0.04)',
        'cr-dark': 'none',
        'cr-glow': '0 0 0 1px rgb(99 102 241 / 0.15)',
      },
      spacing: {
        'cr-gap': '1.5rem',
      },
    },
  },
  plugins: [],
}
