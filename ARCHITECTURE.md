# ARCHITECTURE.md

<!-- ↓↓↓ agentcreed ↓↓↓ -->

This file describes the project tech stack, structure and coding conventions. Rules for handling this file are defined in [AGENTS.md](./AGENTS.md).

<!-- ↑↑↑ agentcreed ↑↑↑ -->

## Overview

`elrh-cosca` (COSCA = **CO**de **SCA**ffolding) is a Vite library of NodeJS-based file manipulation functions. Consumers use it to build CLI scripts that create, update and delete files in target projects.

The public API is documented in [README.md](./README.md).

## Tech Stack

| Category             | Technology                                                    |
| -------------------- | ------------------------------------------------------------- |
| Language             | TypeScript (strict mode)                                      |
| Runtime              | Node.js >= 22.13, ESM only                                    |
| Build                | Vite (library mode), `vite-plugin-dts` for type declarations  |
| Testing              | Vitest, coverage by `@vitest/coverage-v8`                     |
| Package manager      | pnpm                                                          |
| Runtime dependencies | None, only `node:` built-in modules                           |

The project has no linter, formatter, git hooks or CI configuration.

## Architecture

The project is a single-package library. `src/main.ts` is the only public entry. It re-exports all public functions and their option types.

Public functions are split into four groups by purpose (`functions`, `checks`, `terminal`, `utils`). They share internal modules from `src/_private`, which are not exported.

- Every `targetPath` is validated by `checkPath` from `src/_private/check-path.ts` before use.
- File-manipulation functions share helpers from `src/_private/file-helpers.ts`. All of them first confirm the action with the user (`confirmAction`). Update and remove functions then read or prepare the target file, change the content and write it back (`readTargetFile`, `prepareTargetFile`, `writeUpdatedFile`). Create functions write the new file via `writeCreatedFile`. `deletePath` removes the path directly.
- The library uses no third-party parsers. YAML files are handled by `src/_private/yaml.ts`, JS/TS config files by `src/_private/merge-config.ts` and downloads by `src/_private/fetch-file.ts`.

The file `index.html` with `public/vite.svg` is a simple static landing page of the project, served by `pnpm dev` (Vite dev server). It is not part of the library build or the published package.

The build keeps one output file per source module in `dist`. The entry file is `dist/elrh-cosca.mjs` and type declarations of `src` files go to `dist/types`. The `files` field in `package.json` lists only `dist` and `CHANGELOG.md` for publishing.

## Key Directories

```text
elrh-cosca/
├── src/
│   ├── main.ts           # Public entry, re-exports functions and option types
│   ├── functions/        # File-manipulation functions (async, ask for confirmation)
│   ├── checks/           # Read-only checks (sync)
│   ├── terminal/         # User prompt and colored output
│   ├── utils/            # Other helpers (.env values, package paths)
│   ├── _private/         # Internal modules shared by the public functions
│   └── types/            # Option interfaces (functions.ts) and data types (data.ts)
├── test/
│   ├── *.test.ts         # Vitest suites
│   ├── fixtures/         # Input files for the tests
│   ├── snapshots/        # Expected file contents
│   ├── cosca-test-setup.ts  # Vitest global setup
│   ├── cosca-test-utils.ts  # Shared test helpers and mocks
│   └── cosca-test.js     # Manual test script
├── index.html            # Landing page shown by `pnpm dev`
├── public/               # Static assets of the landing page (vite.svg)
├── dist/                 # Build output (not in git)
└── coverage/             # Vitest coverage report (not in git)
```

## Entry Points

- Library: `src/main.ts`, built into `dist/elrh-cosca.mjs`
- Types: `dist/types/index.d.ts`
- Tests: `pnpm test`

## Conventions

- Each public function is defined in its own TypeScript file in `src/functions`, `src/checks`, `src/terminal` or `src/utils`.
- Name of the function is camel-cased, file names are kebab-cased.
- Function should contain JSDoc comments.
- Functions are made available via re-export in `src/main.ts`. The same applies to option types.
- Functions with arguments take a single `opts` object. Its interface is defined in `src/types/functions.ts`. Terminal helpers also accept a plain string.
- Each function has its Vitest test suite in `test` named `<folder>-<file-name>.test.ts` (e.g. `functions-update-text-file.test.ts`). Suites for `src/_private` modules use the `private-` prefix.
- Tests work with a copy of `test/fixtures` in a temporary folder. The global setup creates it and stores its path in the `WORKSPACE_DIR` environment variable.
- Suites that work with files mock `checkPath`, because the temporary folder is outside of CWD.
- `CHANGELOG.md` lists changes per released version.

## Quick Commands

| Action                                                                | Command           |
| --------------------------------------------------------------------- | ----------------- |
| Install                                                               | `pnpm install`    |
| Test with coverage                                                    | `pnpm test`       |
| Build (runs install, tests, `tsc` and `vite build`)                   | `pnpm build`      |
| Manual test of built `dist` (interactive, changes files in `test`)    | `pnpm test-cosca` |
| Landing page dev server                                               | `pnpm dev`        |
