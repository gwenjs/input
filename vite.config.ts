import { defineConfig } from 'vite'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    dts({
      include: ['src'],
      outDir: 'dist',
      rollupTypes: false,
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        module: resolve(__dirname, 'src/module.ts'),
        augment: resolve(__dirname, 'src/augment.ts'),
        'processors/index': resolve(__dirname, 'src/processors/index.ts'),
        'interactions/index': resolve(__dirname, 'src/interactions/index.ts'),
        'constants/index': resolve(__dirname, 'src/constants/index.ts'),
        'devices/index': resolve(__dirname, 'src/devices/index.ts'),
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: ['@gwenjs/core', '@gwenjs/kit'],
    },
  },
})
