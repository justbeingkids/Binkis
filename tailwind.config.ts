import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        display: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
      },
      fontSize: {
        display: ["1.75rem", { lineHeight: "2.125rem", letterSpacing: "-0.022em", fontWeight: "600" }],
        "display-lg": ["2rem", { lineHeight: "2.375rem", letterSpacing: "-0.024em", fontWeight: "600" }],
      },
      colors: {
        surface: {
          base: "#FBFBFB",
          card: "#FFFFFF",
          muted: "#F4F4F5",
          subtle: "#F4F4F5",
        },
        ink: {
          950: "#09090B",
          900: "#18181B",
          800: "#27272A",
          700: "#3F3F46",
          500: "#71717A",
          400: "#A1A1AA",
          300: "#D4D4D8",
          200: "#E4E4E7",
          100: "#E4E4E7",
          50: "#F4F4F5",
        },
        accent: {
          DEFAULT: "#09090B",
          hover: "#18181B",
        },
        brand: {
          DEFAULT: "#4F46E5",
          hover: "#4338CA",
          soft: "#EEF2FF",
        },
        amber: {
          DEFAULT: "#D97706",
          soft: "#FFFBEB",
          ring: "#F59E0B",
        },
        status: {
          available: "#71717A",
          claimed: "#16A34A",
          claimedBg: "#F0FDF4",
          invalid: "#DC2626",
          invalidBg: "#FEF2F2",
        },
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(9, 9, 11, 0.04)",
        soft: "0 1px 2px 0 rgba(9, 9, 11, 0.05), 0 1px 1px -1px rgba(9, 9, 11, 0.03)",
        elevated: "0 4px 16px -6px rgba(9, 9, 11, 0.10), 0 1px 3px -1px rgba(9, 9, 11, 0.05)",
        ringAmber: "0 0 0 3px rgba(245, 158, 11, 0.15)",
        ringBrand: "0 0 0 3px rgba(79, 70, 229, 0.15)",
      },
      borderColor: {
        DEFAULT: "#E4E4E7",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        skeletonPulse: {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "0.9" },
        },
        toastIn: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        fadeUp: "fadeUp 200ms ease-out",
        fadeIn: "fadeIn 180ms ease-out",
        scaleIn: "scaleIn 160ms ease-out",
        skeletonPulse: "skeletonPulse 1.4s ease-in-out infinite",
        toastIn: "toastIn 180ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
