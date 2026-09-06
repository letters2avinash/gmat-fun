import type { Config } from "tailwindcss";

// gmat.fun brand palette — see project plan doc for rationale
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#4F46E5", // primary indigo
          dark: "#3730A3",
          light: "#EEF2FF",
        },
        accent: {
          DEFAULT: "#F59E0B", // amber
          dark: "#B45309",
          light: "#FEF3C7",
        },
        ink: "#0F172A", // near-black slate text
        canvas: "#F8FAFC", // off-white background
        success: "#16A34A",
        danger: "#DC2626",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ["Source Serif 4", "Georgia", "serif"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
