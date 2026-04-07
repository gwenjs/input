import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@gwenjs/core': new URL('./tests/mocks/@gwenjs/core.ts', import.meta.url).pathname,
      '@gwenjs/kit/plugin': new URL('./tests/mocks/@gwenjs/kit/plugin.ts', import.meta.url).pathname,
      '@gwenjs/kit/module': new URL('./tests/mocks/@gwenjs/kit/module.ts', import.meta.url).pathname,
    }
  },
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: [
        'src/**/*.test.ts',
        'src/index.ts',
        'src/module.ts',
        'src/augment.ts',
        'src/types.ts',
        'src/vite-env.d.ts',
        'src/plugin/**',
        'src/*/index.ts',
        'src/players/bindings-snapshot.ts',
      ],
      thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 },
    },
  },
})
