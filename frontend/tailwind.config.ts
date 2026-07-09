/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0a0d14",
          surface: "#10141e",
          elevated: "#161c2b",
          hover: "#1b2236",
        },
        border: {
          DEFAULT: "#1c2535",
          light: "#283248",
        },
        text: {
          DEFAULT: "#e4e8ef",
          secondary: "#7b8ba2",
          muted: "#586b82",
        },
        accent: {
          DEFAULT: "#6366f1",
          muted: "#4338ca",
          glow: "rgba(99, 102, 241, 0.10)",
        },
        priority: {
          high: "#f43f5e",
          medium: "#f59e0b",
          low: "#7b8ba2",
        },
        semantic: {
          revenue: "#10b981",
          date: "#6366f1",
          id: "#8b5cf6",
          dimension: "#06b6d4",
          measure: "#f59e0b",
          other: "#7b8ba2",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0,0,0,0.3), 0 1px 2px -1px rgba(0,0,0,0.3)",
        "card-hover": "0 4px 12px 0 rgba(0,0,0,0.35), 0 2px 4px -2px rgba(0,0,0,0.3)",
        glow: "0 0 20px rgba(99, 102, 241, 0.15)",
        "glow-lg": "0 0 40px rgba(99, 102, 241, 0.12), 0 0 80px rgba(99, 102, 241, 0.06)",
        "float": "0 8px 30px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.3)",
        panel: "1px 0 0 0 #1c2535",
      },
      borderRadius: {
        xl: "14px",
        "2xl": "18px",
      },
    },
  },
  plugins: [],
};