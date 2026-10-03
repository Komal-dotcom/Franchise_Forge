import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        studio: {
          950: "#0A0D14",
          900: "#101622",
          850: "#161E2E",
          800: "#1E293B",
          700: "#2C3B52",
          600: "#3D4F6E",
          500: "#52688F",
        },
        // 2 Harmonious colors in the same warm studio amber/gold tone:
        accentPrimary: {
          DEFAULT: "#F59E0B",
          light: "#FBBF24",
          dark: "#D97706",
        },
        accentSecondary: {
          DEFAULT: "#FDE68A",
          light: "#FEF08A",
          dark: "#F59E0B",
        },
        champagne: {
          100: "#FEF9C3",
          200: "#FEF08A",
          300: "#FDE68A",
          400: "#F59E0B",
          500: "#D97706",
        },
        gold: {
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
        },
        cyanGlow: "#FBBF24",
        amberGlow: "#F59E0B",
        crimsonGlow: "#EF4444",
        violetGlow: "#F59E0B",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "studio-grid": "linear-gradient(to right, rgba(245, 158, 11, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(245, 158, 11, 0.04) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};
export default config;
