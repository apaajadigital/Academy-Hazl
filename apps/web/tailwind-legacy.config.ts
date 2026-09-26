import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ─── Jago Akademi Brand Colors ───────────────────────────────
      colors: {
        // Primary: Cyan (brand)
        cyan: {
          50: "#e0fbff",
          100: "#b3f5ff",
          200: "#80eeff",
          300: "#4de7ff",
          400: "#1ae0ff",
          500: "#36bdf2", // Brand fill (buttons, progress)
          600: "#00aad4",
          700: "#0077A8", // brand-cyan-strong — use for text/icons on white
          800: "#005c7a",
          900: "#00374d",
          950: "#001f2e",
        },
        // Accent: Hot Pink
        pink: {
          50: "#ffe0ef",
          100: "#ffb3d2",
          200: "#ff80b3",
          300: "#ff4d94",
          400: "#ff1a75",
          500: "#ff2f86", // Brand accent fill
          600: "#CC0052", // brand-pink-strong — accessible text on white
          700: "#a80042",
          800: "#7a0031",
          900: "#4d001f",
          950: "#2e0013",
        },
        // Neutral — light scale (was dark-first)
        dark: {
          50:  "#F5F5F7", // page background
          100: "#FAFAFA", // sunken / section alt
          200: "#F0F0F2", // hover surface
          300: "#E5E5E5", // border default
          400: "#D2D2D7", // border strong
          500: "#AEAEB2", // disabled / placeholder
          600: "#6E6E73", // text muted
          700: "#636366", // text secondary
          800: "#424245", // text medium
          900: "#1D1D1F", // text primary (Apple black)
          950: "#000000",
        },
        // Semantic aliases
        brand: {
          primary: "#36bdf2",
          accent:  "#ff2f86",
          dark:    "#1D1D1F",
          darker:  "#000000",
        },
      },

      // ─── Typography ──────────────────────────────────────────────
      fontFamily: {
        sans:    ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-jakarta)", "Plus Jakarta Sans", "sans-serif"],
        mono:    ["JetBrains Mono", "Fira Code", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem",  { lineHeight: "0.875rem" }],
        xs:    ["0.75rem",   { lineHeight: "1rem" }],
        sm:    ["0.875rem",  { lineHeight: "1.25rem" }],
        base:  ["1rem",      { lineHeight: "1.625rem" }],
        lg:    ["1.125rem",  { lineHeight: "1.75rem" }],
        xl:    ["1.25rem",   { lineHeight: "1.875rem" }],
        "2xl": ["1.5rem",    { lineHeight: "2rem" }],
        "3xl": ["1.875rem",  { lineHeight: "2.375rem" }],
        "4xl": ["2.25rem",   { lineHeight: "2.75rem" }],
        "5xl": ["3rem",      { lineHeight: "1.1" }],
        "6xl": ["3.75rem",   { lineHeight: "1.05" }],
        "7xl": ["4.5rem",    { lineHeight: "1" }],
        "8xl": ["6rem",      { lineHeight: "0.95" }],
      },

      // ─── Spacing ─────────────────────────────────────────────────
      spacing: {
        "18":      "4.5rem",
        "22":      "5.5rem",
        "30":      "7.5rem",
        "section": "6rem",
      },

      // ─── Border Radius ───────────────────────────────────────────
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },

      // ─── Box Shadow — elevation system (replaces neon glow) ──────
      boxShadow: {
        "e0":   "none",
        "e1":   "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)",
        "e2":   "0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.06)",
        "e3":   "0 10px 25px rgba(0,0,0,0.12), 0 4px 10px rgba(0,0,0,0.08)",
        "e4":   "0 20px 48px rgba(0,0,0,0.16), 0 8px 16px rgba(0,0,0,0.10)",
        "focus-cyan": "0 0 0 3px rgba(0, 119, 168, 0.2)",
        // Legacy aliases → map to elevation
        "glow-cyan":    "0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.06)",
        "glow-pink":    "0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.06)",
        "glow-sm-cyan": "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)",
        "glow-sm-pink": "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)",
        "card-dark":    "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)",
        "card-hover":   "0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.06)",
      },

      // ─── Background Image ─────────────────────────────────────────
      backgroundImage: {
        "gradient-brand":      "linear-gradient(135deg, #0077A8 0%, #ff2f86 100%)",
        "gradient-brand-soft": "linear-gradient(135deg, rgba(0,119,168,0.1) 0%, rgba(255,0,102,0.08) 100%)",
        "gradient-page":       "linear-gradient(180deg, #F5F5F7 0%, #FFFFFF 100%)",
        "gradient-hero":       "radial-gradient(ellipse at top, rgba(0,119,168,0.06) 0%, transparent 60%), radial-gradient(ellipse at bottom right, rgba(255,0,102,0.04) 0%, transparent 60%)",
        // Legacy aliases → light equivalents
        "gradient-dark":       "linear-gradient(180deg, #F5F5F7 0%, #FAFAFA 100%)",
        "gradient-dark-card":  "linear-gradient(145deg, #FFFFFF 0%, #F5F5F7 100%)",
        "noise":               "url('/textures/noise.png')",
      },

      // ─── Animation ───────────────────────────────────────────────
      keyframes: {
        "fade-in": {
          "0%":   { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-up": {
          "0%":   { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-left": {
          "0%":   { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.6" },
        },
        "shimmer": {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-8px)" },
        },
        "marquee": {
          "0%":   { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "fade-in":      "fade-in 0.5s ease-out",
        "fade-in-up":   "fade-in-up 0.6s ease-out",
        "slide-in-left":"slide-in-left 0.5s ease-out",
        "glow-pulse":   "glow-pulse 3s ease-in-out infinite",
        "shimmer":      "shimmer 2s linear infinite",
        "float":        "float 3s ease-in-out infinite",
        "marquee":      "marquee 30s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
