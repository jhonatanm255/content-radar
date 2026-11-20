/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        radar: {
          bg: "#0B0F19",
          card: "#111827",
          border: "#1F2937",
          accent: "#06B6D4"
        }
      }
    },
  },
  plugins: [],
}
