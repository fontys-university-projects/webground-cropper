/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{vue,js,ts,jsx,tsx}",
    "./*..{vue,js,ts,jsx,tsx}",
  ],
  prefix: 'tw-',
  theme: {
    extend: {},
  },
  corePlugins: {
    preflight: false,
  }
}

