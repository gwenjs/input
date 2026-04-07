/**
 * Ambient declaration for Vite's `import.meta.env` globals.
 * Matches the subset used by `@gwenjs/input`.
 */
interface ImportMetaEnv {
  /** True in production builds (`vite build`). */
  readonly PROD: boolean;
  /** True in development mode. */
  readonly DEV: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
