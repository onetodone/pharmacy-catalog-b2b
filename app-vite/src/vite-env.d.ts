/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API base URL. Defaults to `/api` (same origin, proxied). */
  readonly VITE_API_URL?: string
  /** Uploaded-asset base URL. Defaults to `/uploads` (same origin, proxied). */
  readonly VITE_ASSETS_URL?: string
  /** Dev only: where the Vite dev server proxies `/api` and `/uploads`. */
  readonly VITE_DEV_API_PROXY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
