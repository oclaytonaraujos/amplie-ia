/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'chat-bg': '#212121',
        'chat-input': '#2F2F2F',
        'chat-text': '#ECECEC',
        'chat-user': '#2F2F2F',
      },
    },
  },
  plugins: [],
}
