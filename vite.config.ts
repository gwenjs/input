import { defineConfig } from 'vite'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import dts from 'vite-plugin-dts'

const __dirname = dirname(fileURLToPath(import.meta.url))

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
      external: (id) => id === '@gwenjs/core' || id === '@gwenjs/kit' || id.startsWith('@gwenjs/kit/'),
    },
  },
})
