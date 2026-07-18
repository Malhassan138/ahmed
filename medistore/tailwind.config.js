/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          500: "#0f766e",
          600: "#0d6660",
          700: "#0b544f",
        },
      },
    },
  },
  plugins: [],
};
