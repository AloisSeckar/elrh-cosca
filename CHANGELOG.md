# Changelog

Overview of the newest features in COSCA.

# 0.3.1

**2025-09-30**

- feat: new `hasJsonKey` function to check for key existence in JSONs
- feat: new `hasText` function to check for row existence in text files
- fix: minor refinement of exported functions' JSDocs

# 0.3.0

**2025-09-29**

- feat: new `removeFromJsonFile` function to delete keys from JSONs (#7)
- feat: new `deletePath` function to delete given path within CWD (#7)
- feat: restrict paths in all file-manipulation functions to be within CWD (#8)
- fix: allow creating files in non-existent paths (#6)
- fix: add explicit file-existence guard into `updateConfigFile`

# 0.2.8

**2025-09-21**

- feat: improve input handling in `updateJsonFile` (#4)
- docs: added info about proxied objects restriction in `updateConfigFile` (#3)

# 0.2.7

**2025-09-17**

- fix: do not resolve promptUser to false upon ctrl+c (#2)

## 0.2.6

**2025-09-14**

- feat: improved `promptUser` function - accepts more variants of 'yes' responses and allows passing in custom input/output streams
- fix: `createFileFromTemplate` and `createFileFromWebTemplate` now throw an error if creating new file fails
- docs: exported methods got proper JSDoc comments
- build: fresh `pnpm build` is now ensured prior to publishing new version of the package

## 0.2.5

**2025-09-13**

- feat: new `getEnvValue` util function to read values from `.env` files
- feat: allow custom prompt questions in file-manipulation functions

## 0.2.4

**2025-09-11**

- fix: corrected `showMessage` and `showError` export

## 0.2.3

**2025-09-11**

- feat: new `showMessage` and `showError` terminal helpers

## 0.2.2

**2025-09-10**

- feat: new `createFileWebFromTemplate` function for creating files from web templates

## 0.2.1

**2025-09-04**

- feat: new `parseQualifiedPath` and `resolvePackagePath` utils exposed
- refactor: re-organized internal structure
- refactor: improved error handling logic
- docs: CHANGELOG added
- tests: many more new tests added (currently 48)

## 0.2.0

**2025-09-01**

- new function `updateConfigFile` - merge new configuration sub-object into existing one
- improved logic and stability of existing functions
- fixed build and runtime setup
- basic test suites for all functions

## 0.1.0

**2025-08-23**

- initial release
- available functions:
  - `createFileFromTemplate` - copy template to given path
  - `promptUser` - prompt user for input
  - `updateJsonFile` - update a JSON file with new keys/values
  - `updateTextFile` - update a text file with new lines
