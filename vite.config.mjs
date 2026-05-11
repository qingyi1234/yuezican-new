import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  server: {
    host: "0.0.0.0",
  },
  build: {
    target: "es2018",
    cssTarget: "chrome61",
    modulePreload: {
      polyfill: true,
    },
  },
  plugins: [react()],
});
