# elrh-cosca

This is a Vite library of NodeJS-based file manipulation functions.

Each function is defined in its own TypeScript file in `/src/functions`. Name of the function is camel-cased, file names are kebab-cased. Function should contain JSDoc comments.

Each function has its Vitest test suite in `/test` named `functions-<file-name>.test.ts`.

Functions are made available via re-export in `src/main.ts`.

To accept changes, `pnpm build` must pass.
