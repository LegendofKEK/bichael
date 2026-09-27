import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@bellgrave/combat": path.resolve(__dirname, "../../packages/combat/src/index.ts"),
      "@bellgrave/config": path.resolve(__dirname, "../../packages/config/src/index.ts"),
      "@bellgrave/protocol": path.resolve(__dirname, "../../packages/protocol/src/index.ts"),
    },
  },
  server: {
    port: 5173,
  },
});
