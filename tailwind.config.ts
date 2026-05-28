import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#000000",
          900: "#0A0A0A",
          850: "#101013",
          800: "#141418",
          700: "#1C1C1C",
        },
        cc: {
          blue: "#2B2BFF",
          indigo: "#4B2EC9",
          violet: "#8A2BE2",
          magenta: "#FF4FD8",
          coral: "#FF7AA2",
          amber: "#FFC04D",
          yellow: "#FFE96B",
        },
        muted: "#6E6E6E",
        grid: "#1C1C1C",
      },
      fontFamily: {
        display: ["var(--font-display)", "Anton", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        tightest: "-0.04em",
      },
      backgroundImage: {
        chrome:
          "linear-gradient(100deg, #2B2BFF 0%, #4B2EC9 18%, #8A2BE2 38%, #FF4FD8 58%, #FF7AA2 72%, #FFC04D 88%, #FFE96B 100%)",
        "chrome-soft":
          "linear-gradient(100deg, rgba(43,43,255,0.18), rgba(138,43,226,0.18), rgba(255,79,216,0.18), rgba(255,192,77,0.18))",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255,255,255,0.04), 0 18px 50px -12px rgba(138,43,226,0.45)",
        node: "0 1px 0 0 rgba(255,255,255,0.05) inset, 0 16px 40px -18px rgba(0,0,0,0.9)",
      },
      keyframes: {
        "rise-in": {
          "0%": { opacity: "0", transform: "translateY(14px) scale(0.985)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "sheen": {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgba(255,79,216,0.5)" },
          "100%": { boxShadow: "0 0 0 14px rgba(255,79,216,0)" },
        },
      },
      animation: {
        "rise-in": "rise-in 0.5s cubic-bezier(0.22,1,0.36,1) both",
        sheen: "sheen 6s linear infinite",
        "pulse-ring": "pulse-ring 1.6s ease-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
