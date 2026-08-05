import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev proxy: client calls relative /api/... paths identically in dev and in the
// built single-origin production deployment (see README "Dev proxy note").
export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH || "/",
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/auth": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/public": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
  },
});
