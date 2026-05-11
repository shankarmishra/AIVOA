/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ['"Fraunces"', "ui-serif", "Georgia", "serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        paper: {
          50: "#fbfaf6",
          100: "#f7f5ef",
          200: "#ece8dc",
          300: "#d8d2c0",
        },
        ink: {
          50: "#f1f3f5",
          100: "#dde0e4",
          300: "#9aa1ac",
          500: "#5d6772",
          700: "#2b323b",
          900: "#0f141a",
          950: "#070a0e",
        },
        clinical: {
          50: "#ecfdf6",
          100: "#cef5e3",
          200: "#9be8c6",
          500: "#10b981",
          600: "#0d8a64",
          700: "#0f766e",
          800: "#0c5f5a",
          900: "#0a4d49",
        },
        violet: {
          50: "#faf5ff",
          100: "#f1e6ff",
          200: "#dec5fa",
          500: "#9d4fe8",
          700: "#6b21a8",
          900: "#3d0a6b",
        },
        warm: {
          50: "#fef8ee",
          100: "#fdebca",
          200: "#fad59a",
          500: "#f59e0b",
          700: "#b45309",
          900: "#78350f",
        },
        rose: {
          50: "#fef2f2",
          100: "#fde8e8",
          500: "#e11d48",
          700: "#9f1239",
        },
      },
      boxShadow: {
        card: "0 1px 0 0 rgba(15,20,26,0.02), 0 1px 3px 0 rgba(15,20,26,0.04), 0 8px 24px -12px rgba(15,20,26,0.08)",
        "card-hover": "0 1px 0 0 rgba(15,20,26,0.02), 0 1px 3px 0 rgba(15,20,26,0.06), 0 16px 40px -16px rgba(15,20,26,0.16)",
        focus: "0 0 0 4px rgba(15,118,110,0.12)",
        modal: "0 50px 100px -20px rgba(15,20,26,0.25), 0 30px 60px -30px rgba(15,20,26,0.3)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(16px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-up": "fade-up 480ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 320ms ease-out both",
        "slide-up": "slide-up 360ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "pulse-soft": "pulse-soft 1.6s ease-in-out infinite",
        shimmer: "shimmer 2.5s linear infinite",
        "scale-in": "scale-in 180ms ease-out both",
      },
    },
  },
  plugins: [],
};
