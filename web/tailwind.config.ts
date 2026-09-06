import type { Config } from "tailwindcss";

// Same brand palette as the Vite storefront (client/tailwind.config.js) so
// the dashboard and public pages feel like one product.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        blush: {
          50: "#fff5f7",
          100: "#ffe4ea",
          200: "#ffc2d1",
          300: "#ff9fb8",
          400: "#f9749a",
          500: "#ec4d7d",
          600: "#d13366",
          700: "#a82552",
          800: "#7e1c3e",
          900: "#54142a",
        },
        gold: {
          50: "#fdf9ee",
          100: "#f8ecc9",
          200: "#f0d68e",
          300: "#e6bd58",
          400: "#d9a533",
          500: "#c08d22",
          600: "#996f1a",
          700: "#755316",
          800: "#513a12",
          900: "#33240c",
        },
      },
      fontFamily: {
        serif: ["'Cormorant Garamond'", "Georgia", "serif"],
        sans: ["'Inter'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 10px 40px -12px rgba(210, 60, 110, 0.25)",
        glass: "0 8px 32px 0 rgba(31, 38, 135, 0.1)",
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        fadeInUp: "fadeInUp 0.5s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
