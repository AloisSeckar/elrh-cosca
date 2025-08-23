import { defineConfig } from 'vite'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'

// https://vitejs.dev/config/
// https://vite.dev/guide/build.html#library-mode
export default defineConfig({
  build: { 
    lib: { 
      entry: resolve(__dirname, 'src/main.ts'), 
      name: 'elrh-cosca',
      formats: ['es', 'cjs'],
      fileName: (format) => format === 'es' ? 'elrh-cosca.mjs' : 'elrh-cosca.cjs',
    },
    rollupOptions: {
      external: [
          'fs', 
          'path',
          'readline',
      ],
      output: {
        exports: 'named',
        interop: 'auto',
      }
    }
  },
  resolve: { 
    alias: { 
      src: resolve('src/'),
    } 
  },
  plugins: [
    dts({ outDir: 'dist/types', insertTypesEntry: true }),
  ],
})
