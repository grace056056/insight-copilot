/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#04070d",
          surface: "#090e1a",
          elevated: "#0f1626",
          hover: "#141d33",
        },
        border: {
          DEFAULT: "#1a2440",
          light: "#263455",
        },
        text: {
          DEFAULT: "#dce5f5",
          secondary: "#8195b3",
          muted: "#56688a",
        },
        accent: {
          DEFAULT: "#6366f1",
          muted: "#4338ca",
          glow: "rgba(99, 102, 241, 0.10)",
        },
        wire: {
          DEFAULT: "#22d3ee",
          dim: "rgba(34, 211, 238, 0.35)",
        },
        // Thermal ramp — cold → hot. Priority and intensity map onto this.
        thermal: {
          cold: "#38bdf8",
          cool: "#22d3ee",
          warm: "#fbbf24",
          hot: "#fb7185",
          core: "#f43f5e",
        },
        priority: {
          high: "#fb7185",
          medium: "#fbbf24",
          low: "#38bdf8",
        },
        semantic: {
          revenue: "#34d399",
          date: "#818cf8",
          id: "#a78bfa",
          dimension: "#22d3ee",
          measure: "#fbbf24",
          other: "#8195b3",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        display: ["Bricolage Grotesque", "Inter", "sans-serif"],
        serif: ["Instrument Serif", "Georgia", "serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0,0,0,0.4), 0 1px 2px -1px rgba(0,0,0,0.4)",
        "card-hover": "0 6px 18px 0 rgba(0,0,0,0.45), 0 2px 4px -2px rgba(0,0,0,0.35)",
        glow: "0 0 22px rgba(99, 102, 241, 0.18)",
        "glow-lg": "0 0 44px rgba(99, 102, 241, 0.14), 0 0 90px rgba(99, 102, 241, 0.07)",
        "glow-wire": "0 0 18px rgba(34, 211, 238, 0.16)",
        "glow-hot": "0 0 18px rgba(251, 113, 133, 0.22)",
        float: "0 8px 30px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.35)",
      },
      borderRadius: {
        xl: "14px",
        "2xl": "18px",
      },
    },
  },
  plugins: [],
};
