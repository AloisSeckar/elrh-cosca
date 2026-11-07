import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    fsModuleCache: true,
    globalSetup: ['./test/cosca-test-setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/main.ts', 'src/vite-env.d.ts', 'src/types/**'],
    },
  },
})
