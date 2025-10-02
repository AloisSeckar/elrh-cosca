# COSCA
Library of file-writing functions that help building CLI scripts for making changes in target projects - like adding default configuration files or new sections in `package.json`.

The first experimental "customers" are my [Nuxt Spec](https://github.com/AloisSeckar/nuxt-spec) and [Nuxt Ignis](https://github.com/AloisSeckar/nuxt-ignis) projects.

The **"COSCA"** abbreviation stands for **CO**de **SCA**ffolding which points out the library's purpose of providing methods for altering existing and adding new files from scratch using Node-based filesystem APIs.

## How to use

**NOTE:** The library is **ESM only** and it is advised to use with at least **Node 18**.

`npm install elrh-cosca` to include into your project.

### List of file-manipulation functions

#### `createFileFromTemplate`

```ts
async function createFileFromTemplate(
  templateFile: string, targetFile: string, force: boolean = false, prompt: string = ''
): Promise<void>
```

Gets a file definition from given `templateFile` and will create a fresh copy in target project.

Path to `templateFile` must be prefixed with the package name to allow proper resolution, e.g. `your-package:path/to/template`. The package name can be scoped.

Path to `targetFile` is relative to `process.cwd()` which allows consumers to run `npx your-script` in their project roots during development.  Several checks are in place to prevent accidental and malicious paths being passed in. Path traversal outside of CWD or providing absolute paths is disallowed. If the target directory does not exist, it will be automatically created.

By default the function asks for confirmation before attempting to create the file and if the file with the same name as `targetFile` is detected. Setting the last optional parameter `force` to `true` will suppress manual confirmation prompts. Passing a custom `prompt` allows tailoring your own question to the user.

#### `createFileFromWebTemplate`

```ts
async function createFileFromWebTemplate(
  url: string, targetFile: string, force: boolean = false, prompt: string = ''
): Promise<void>
```

Gets a file definition from given `url` and will create a fresh copy in target project. 

Contents of `url` must be accessible via `node:https.get` function and will be fetched as raw text data.

Path to `targetFile` is relative to `process.cwd()` which allows consumers to run `npx your-script` in their project roots during development.  Several checks are in place to prevent accidental and malicious paths being passed in. Path traversal outside of CWD or providing absolute paths is disallowed. If the target directory does not exist, it will be automatically created.

By default the function asks for confirmation before attempting to create the file and if the file with the same name as `targetFile` is detected. Setting the last optional parameter `force` to `true` will suppress manual confirmation prompts. Passing a custom `prompt` allows tailoring your own question to the user.

#### `updateConfigFile`

```ts
async function updateConfigFile(
  targetFile: string, newConfig: Record<string | number | symbol, any>, 
  force: boolean = false, prompt: string = ''
): Promise<void>
```

Takes a path to a configuration file and updates it with the provided `newConfig` object. 

Path to `targetFile` is relative to `process.cwd()`. Several checks are in place to prevent accidental and malicious paths being passed in. Path traversal outside of CWD or providing absolute paths is disallowed. The file currently must use ESM format with either `default` or named export of **exactly one** configuration object or function call with a configuration object as its argument.

The merger is performed using [unjs/magicast](https://github.com/unjs/magicast). It should:
- preserve comments
- work recursively to allow deep-merge
- extend existing object with new keys from `newConfig`
- overwrite keys with same name with values from `newConfig`
- create a unique-union in case of arrays
Please [report](https://github.com/AloisSeckar/elrh-cosca/issues) any logical flaws and issues of the process.

**Warning**: The function will fail, if the extracted object is proxied (e.g. when created using `defu`). In such case, the error would be:

```
TypeError: 'set' on proxy: trap returned falsish for property '<YOUR_PROPERTY>'
```

If possible, you need to alter your logic, e.g. by creating a new object via the spread operator.


By default the function asks for confirmation before attempting to alter the `targetFile`. Setting the last optional parameter `force` to `true` will suppress manual confirmation prompts. Passing a custom `prompt` allows tailoring your own question to the user.

#### `updateJsonFile`

```ts
async function updateJsonFile(
  targetFile: string, jsonKey: string, patch: JsonValue, 
  force: boolean = false, prompt: string = ''
): Promise<void>
```

Takes a path to a JSON file and injects `patch` under `jsonKey` key. A `patch` is of `JsonValue` - a custom type defined as follows:

```ts
type JsonPrimitive = string | number | boolean | null
type JsonObject = { [key: string]: JsonValue }
type JsonArray = JsonValue[]
type JsonValue = JsonPrimitive | JsonObject | JsonArray
```

Path to `targetFile` is relative to `process.cwd()`. Several checks are in place to prevent accidental and malicious paths being passed in. Path traversal outside of CWD or providing absolute paths is disallowed. The file must be a valid JSON file. It is parsed using plain `JSON.parse`.

Currently it only allows adding new values under top-level keys. If the `jsonKey` exists, new values are merged into existing ones. Otherwise, new key is added. The function tracks if any real change was made and notifies the user if not.

By default the function asks for confirmation before attempting to alter the `targetFile`. Setting the last optional parameter `force` to `true` will suppress manual confirmation prompts. Passing a custom `prompt` allows tailoring your own question to the user.

#### `updateTextFile`

```ts
async function updateTextFile(
    targetFile: string, rowsToAdd: string[], force: boolean = false, prompt: string = ''
): Promise<void>
```

Takes a path to a plain text file and injects `rowsToAdd` at the end of the file, **providing they are not already present in the file**. The function tracks if any real change was made and notifies the user if not.

Path to `targetFile` is relative to `process.cwd()`. Several checks are in place to prevent accidental and malicious paths being passed in. Path traversal outside of CWD or providing absolute paths is disallowed. 

By default the function asks for confirmation before attempting to alter the `targetFile`. Setting the last optional parameter `force` to `true` will suppress manual confirmation prompts. Passing a custom `prompt` allows tailoring your own question to the user.

#### `removeFromJsonFile`

```ts
async function removeFromJsonFile(
  targetFile: string, jsonKey: string, force: boolean = false, prompt: string = ''
): Promise<void>
```

Takes a path to a JSON file and removes the specified `jsonKey`.

Path to `targetFile` is relative to `process.cwd()`. Several checks are in place to prevent accidental and malicious paths being passed in. Path traversal outside of CWD or providing absolute paths is disallowed. The file must be a valid JSON file. It is parsed using plain `JSON.parse`.

Given `jsonKey` might point to a nested key using dot notation, e.g. `a.b.c`. If the key is not present, the function does nothing.

By default the function asks for confirmation before attempting to alter the `targetFile`. Setting the last optional parameter `force` to `true` will suppress manual confirmation prompts. Passing a custom `prompt` allows tailoring your own question to the user.

#### `deletePath`

```ts
async function deletePath(
  targetPath: string, force: boolean = false, prompt: string = ''
): Promise<void>
```

Deletes given `targetPath` from FS. Path is resolved relatively to `process.cwd()`. Several checks are in place to prevent accidental and malicious paths being passed in. Path traversal outside of CWD or providing absolute paths is disallowed.

If the `targetPath` does not exist, the function does nothing.

By default the function asks for confirmation before attempting to delete the `targetPath`. Setting the last optional parameter `force` to `true` will suppress manual confirmation prompts. Passing a custom `prompt` allows tailoring your own question to the user.

### List of content checkers

#### `fileExists`

```ts
function fileExists(
    targetFile: string
): boolean
```

Checks if the specified `targetFile` exists on FS. Path is resolved relatively to `process.cwd()`. Several checks are in place to prevent accidental and malicious paths being passed in. Path traversal outside of CWD or providing absolute paths is disallowed.

If the file exists , the function returns true, false otherwise.

#### `hasJsonKey`

```ts
function hasJsonKey(
  targetFile: string, jsonKey: string
): boolean
```

Checks whether given `jsonKey` exists in JSON file located at `targetFile`. Path is resolved relatively to `process.cwd()`. Several checks are in place to prevent accidental and malicious paths being passed in. Path traversal outside of CWD or providing absolute paths is disallowed.

Given `jsonKey` might point to a nested key using dot notation, e.g. `a.b.c`. If the key is present, the function returns true, false otherwise.

#### `hasText`

```ts
function hasText(
    targetFile: string, row: string
): boolean
```

Checks whether given `row` exists in text file located at `targetFile`. Path is resolved relatively to `process.cwd()`. Several checks are in place to prevent accidental and malicious paths being passed in. Path traversal outside of CWD or providing absolute paths is disallowed.

If the `row` is present, the function returns true, false otherwise. Row must be matched completely, but surrounding whitespaces are ignored.

### List of terminal helpers

#### `promptUser`

```ts
async function promptUser(
  question: string,
  options?: { input?: NodeJS.ReadableStream; output?: NodeJS.WritableStream }
): Promise<boolean>
```

Prints out a `question` to the console and waits for the input. Returns `true` when `y` is pressed and `false` otherwise.

By default it uses `process.stdin` and `process.stdout` streams. To use custom NodeJS streams, `options` object with `input` and `output` properties can be optionally passed.

#### `showMessage`

```ts
async function showMessage(message: string, newlines: number = 1): Promise<void>
```

Prints out a `message` to `process.stdout` and adds the specified number of newlines after it (default is 1).

#### `showError`

```ts
async function showError(message: string, newlines: number = 1): Promise<void>
```

Prints out a `message` to `process.stderr` and adds the specified number of newlines after it (default is 1).

### List of other utils

#### `getEnvValue`

```ts
export function getEnvValue(
  key: string, envFilePath: string = resolve(process.cwd(), '.env')
): string | undefined
```

Reads a `.env` file and returns the value of the specified key or `undefined` if key not found. By default it reads from `.env` in the current working directory (usually the root of the project). You can specify a custom path to `.env` file as the second `envFilePath` parameter.

#### `parseQualifiedPath`

```ts
function parseQualifiedPath(path: string): { pkg: string; file: string }
```

Expects path to file in `"package:relative/path/to/file"` format and splits it into `{ pkg, file }`. The package name can be scoped (e.g. `@scope/package`).

#### `resolvePackagePath`

```ts
function resolvePackagePath(pkg: string): string
```

Resolve a package's installed root directory *from the target app* - which can be either from within itself during development or from corresponding package dir inside *node_modules*. The package name can be scoped (e.g. `@scope/package`).

## Tech stack

- Developed with [TypeScript](https://www.typescriptlang.org/) in mind
- Using [magicast](https://github.com/unjs/magicast) for parsing files
- Build with [Vite](https://vitejs.dev/)
- Tested with [Vitest](https://vitest.dev/)

See [Changelog](https://github.com/AloisSeckar/elrh-cosca/blob/main/CHANGELOG.md) for project history and development.

## Report bugs & contact

Use GitHub issues to report bugs / propose enhancements / give feedback:
https://github.com/AloisSeckar/elrh-cosca/issues
