import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/agent": "http://localhost:8000",
      "/hcps": "http://localhost:8000",
      "/interactions": "http://localhost:8000",
      "/healthz": "http://localhost:8000",
    },
  },
});
