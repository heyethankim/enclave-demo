import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages project site: /enclave-demo/ — set VITE_BASE_PATH in CI. Local dev uses relative base.
const base = process.env.VITE_BASE_PATH ?? "./";

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5174,
    // Prefer http://127.0.0.1:5174/ ; if that port is already taken (e.g. another `npm run dev`), use the next free port.
    strictPort: false,
  },
});
