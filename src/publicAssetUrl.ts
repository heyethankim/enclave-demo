/**
 * Absolute URL for static files in Vite `public/` (copied to `dist/` root).
 * Uses `import.meta.env.BASE_URL` so GitHub Pages project sites work
 * (e.g. `https://heyethankim.github.io/enclave-demo/` with base `/enclave-demo/`).
 *
 * Avoid leading `/` on `relativePath` — use `os-logos/foo.png`, not `/os-logos/foo.png`.
 */
export function publicAssetUrl(relativePath: string): string {
  const trimmed = relativePath.replace(/^\/+/, "");
  const base = import.meta.env.BASE_URL;
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  return `${normalizedBase}${trimmed}`;
}
