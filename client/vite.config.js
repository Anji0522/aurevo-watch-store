import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: "client",
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:5000" },
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("/node_modules/three/examples/")) return "three-extras";
          if (id.includes("/node_modules/three/build/three.core.js")) return "three-foundation";
          if (id.includes("/node_modules/three/")) return "three-core";
          if (id.includes("/node_modules/@react-three/")) return "three-react";
          if (id.includes("/node_modules/framer-motion/")) return "motion";
        },
      },
    },
  },
});
