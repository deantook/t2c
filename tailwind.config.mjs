/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: "#0d1117",
          text: "#c9d1d9",
          green: "#3fb950",
          blue: "#58a6ff",
          red: "#f85149",
          link: "#39d353",
          codeBg: "#161b22",
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', "monospace"],
      },
    },
  },
  plugins: [],
};
