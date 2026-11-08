import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { pixelForgeDevBridge } from "../../scripts/vite-forge-bridge.mjs";

export default defineConfig({
  plugins: [react(), pixelForgeDevBridge()],
  publicDir: "../../public",
  server: { port: 5174 },
});
