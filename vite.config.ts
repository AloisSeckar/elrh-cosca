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
      fileName: (_format, entryName) =>
        entryName === 'main' ? 'elrh-cosca.mjs' : `${entryName}.mjs`,
    },
    rolldownOptions: {
      external: [
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
        preserveModules: true,
        comments: false,
        minify: {
          compress: true,
          mangle: false,
          codegen: { removeWhitespace: false },
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
