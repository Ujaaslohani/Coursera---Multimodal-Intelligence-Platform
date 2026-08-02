/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./dashboards/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      colors: {
        ink: {
          50: "#F7F7F9",
          100: "#EEEEF2",
          200: "#D8D8E0",
          300: "#B7B7C4",
          400: "#8F8FA0",
          500: "#6D6D80",
          600: "#54546A",
          700: "#40404F",
          800: "#2A2A35",
          900: "#17171E",
          950: "#0D0D12",
        },
        brand: {
          50: "#EEF1FF",
          100: "#E0E5FF",
          200: "#C6CDFF",
          300: "#A3ACFD",
          400: "#7C82F7",
          500: "#5B5FEC",
          600: "#4640D9",
          700: "#3A34B8",
          800: "#302C93",
          900: "#292775",
          950: "#1A1848",
        },
        success: { 50: "#EFFAF3", 500: "#1E9E5A", 600: "#17824A", 700: "#136B3D" },
        warning: { 50: "#FFF8EB", 500: "#C7821A", 600: "#A76A12", 700: "#87550E" },
        danger: { 50: "#FDF0EF", 500: "#D14545", 600: "#B23434", 700: "#932A2A" },
        info: { 50: "#EEF7FC", 500: "#2A7FB8", 600: "#20699B" },
      },
      boxShadow: {
        card: "0 1px 2px rgba(23,23,30,0.04), 0 4px 14px rgba(23,23,30,0.06)",
        popover: "0 8px 30px rgba(23,23,30,0.12)",
      },
      borderRadius: {
        xl2: "0.875rem",
      },
    },
  },
  plugins: [],
};
