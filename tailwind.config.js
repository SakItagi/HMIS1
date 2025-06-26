/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'], // renamed from `purge` in newer versions
  theme: {
    extend: {
      screens: {
        'xs': '480px',       // optional custom small screen (extra small)
        '3xl': '1600px',     // optional large PC screens
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        futura: ['Futura', 'sans-serif'],
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
};