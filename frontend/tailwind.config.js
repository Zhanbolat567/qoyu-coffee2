/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#2563eb",
          success: "#16a34a",
          danger:  "#e11d48",
          sidebar: "#0b1220",
        }
      },
      boxShadow: {
        card: "0 6px 20px rgba(2,6,23,.06)"
      },
      borderRadius: {
        xl2: "1rem"
      }
    },
  },
  plugins: [],
}
