import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

// https://vitejs.dev/config/
// https://vite.dev/guide/build.html#library-mode
export default defineConfig({
  build: { 
    lib: { 
      entry: resolve(import.meta.dirname, 'src/main.ts'), 
      name: 'elrh-cosca',
      formats: ['es'],
      fileName: () => 'elrh-cosca.mjs',
    },
    rollupOptions: {
      external: [
          'fs', // due to `magicast` package
          'node:fs',
          'node:https',
          'node:module',
          'node:os',
          'node:path',
          'node:readline',
          'node:stream',
          'node:url',
          'node:util',
      ],
      output: {
        exports: 'named',
        // optimize bundle size by putting external libs into separate chunks
        chunkFileNames: 'chunks/[name]-[hash].mjs',
        manualChunks(id) {
          if (id.includes('/node_modules/yaml/')) {
            return 'yaml'
          }
          if (/\/node_modules\/(magicast|@babel|source-map-js)\//.test(id)) {
            return 'magicast'
          }
        },
      }
    },
  },
  resolve: { 
    alias: { 
      src: resolve('src/'),
    },
  },
  plugins: [
    dts({ outDirs: 'dist/types', insertTypesEntry: true }),
  ],
})
