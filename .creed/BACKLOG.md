# AgentCreed Backlog

<!-- ↓↓↓ agentcreed ↓↓↓ -->

This file is used to collect tasks for the project codebase discovered during development (e.g. refactoring, duplicated or unused code, bugs, missing tests, missing or outdated documentation, changes out of the current task scope). Findings about agent instructions belong in `SUGGESTIONS.md`.

This file holds pending tasks only, as a numbered list. Resolved items are deleted, never marked as done. When resolved items are deleted, the remaining items are renumbered.

<!-- ↑↑↑ agentcreed ↑↑↑ -->

1. Unused Vite template leftovers: `index.html`, `public/vite.svg`, `src/typescript.svg`, `src/vite-env.d.ts` and the `dev` and `preview` scripts in `package.json`.
2. `dist/types` contains declarations of the test files (`dist/types/test`), because `tsconfig.json` includes `test`. They get published with the package.
3. Root `.env` holds dummy values for `test/cosca-test.js` and is tracked in git. Consider moving it into `test/fixtures`, so it does not collide with the `.env` rules in `SECURITY.md`.
4. `.gitignore` entries `./vite` and `./cache` match nothing, because git does not support the `./` prefix in patterns.
5. Wrong JSDoc of `readNormalizedFile` in `test/cosca-test-utils.ts`: it says the function returns an array of lines, but it returns a single string.
