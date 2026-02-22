import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./lib/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        slateBlue: "#435766",
        accentOrange: "#de7a3a",
        brandBlue: "#5f6ee8"
      }
    }
  },
  plugins: []
};

export default config;
