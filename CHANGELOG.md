# Changelog

Overview of the newest features in COSCA.

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
