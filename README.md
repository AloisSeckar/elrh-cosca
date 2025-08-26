# COSCA
Library of file-writting functions that help building CLI scripts for making changes in target projects - like adding default configuration files or new sections in `package.json`.

The first experimental "customers" are my [Nuxt Spec](https://github.com/AloisSeckar/nuxt-spec) and [Nuxt Ignis](https://github.com/AloisSeckar/nuxt-ignis) projects.

The **"COSCA"** abbreviation stands for **CO**de **SCA**ffolding which points out the library's purpose of providing methods for altering existing and adding new files from scratch using Node-based filesystem APIs.

## How to use

`npm install elrh-cosca` to include into your project.

List of available functions:
- `createFileFromTemplate`
- `promptUser`
- `updateConfigFile`
- `updateJsonFile`
- `updateTextFile`

## Tech stack

- Developed with [TypeScript](https://www.typescriptlang.org/)
- Build with [Vite](https://vitejs.dev/)
- Tested with [Vitest](https://vitest.dev/)

## Report bugs & contact

Use GitHub issues to report bugs / propose enhancements / give feedback:
https://github.com/AloisSeckar/elrh-cosca/issues
