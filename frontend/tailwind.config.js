/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f3faf6",
          100: "#ddf3e5",
          500: "#2f9d5a",
          700: "#1f6f3f",
          900: "#144126",
        },
      },
    },
  },
  plugins: [],
};
