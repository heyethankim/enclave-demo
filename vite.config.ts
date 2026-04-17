import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages project site: /enclave-demo/ — set VITE_BASE_PATH in CI. Local dev uses relative base.
const base = process.env.VITE_BASE_PATH ?? "./";

export default defineConfig({
  base,
  plugins: [react()],
});
