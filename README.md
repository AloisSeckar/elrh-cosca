# COSCA

Library of file-writing functions that help building CLI scripts for making changes in target projects - like adding default configuration files or new sections in `package.json`.

The first experimental "customers" are my [Nuxt Spec](https://github.com/AloisSeckar/nuxt-spec) and [Nuxt Ignis](https://github.com/AloisSeckar/nuxt-ignis) projects.

The **"COSCA"** abbreviation stands for **CO**de **SCA**ffolding which points out the library's purpose of providing methods for altering existing and adding new files from scratch using Node-based filesystem APIs.

## How to use

**NOTE:** The library is **ESM only** and it is advised to use with at least **Node 18**.

`npm install elrh-cosca` to include into your project.

### Options objects

All functions with arguments take one required `opts` object with 1-n params. Each options type is exported from `elrh-cosca` and defined in [src/types/functions.ts](src/types/functions.ts).

### List of file-manipulation functions

All file-manipulation options extend the following shared shape. `force` defaults to `false`; an omitted or empty `prompt` uses the function's built-in confirmation question.

```ts
interface FileOperationOptions {
  force?: boolean
  prompt?: string
}
```

#### `createFileFromTemplate`

```ts
interface CreateFileFromTemplateOptions extends FileOperationOptions {
  templateFile: string
  targetFile: string
}
async function createFileFromTemplate(opts: CreateFileFromTemplateOptions): Promise<void>
```

Gets a file definition from given `templateFile` and will create a fresh copy in target project.

Path to `templateFile` must be prefixed with the package name to allow proper resolution, e.g. `your-package:path/to/template`. The package name can be scoped.

Path to `targetFile` is relative to `process.cwd()` which allows consumers to run `npx your-script` in their project roots during development.  Several checks are in place to prevent accidental and malicious paths being passed in. Path traversal outside of CWD or providing absolute paths is disallowed. If the target directory does not exist, it will be automatically created.

By default the function asks for confirmation before attempting to create the file and if the file with the same name as `targetFile` is detected. Setting `opts.force` to `true` will suppress manual confirmation prompts. Passing `opts.prompt` allows tailoring your own question to the user.

#### `createFileFromWebTemplate`

```ts
interface CreateFileFromWebTemplateOptions extends FileOperationOptions {
  url: string
  targetFile: string
}
async function createFileFromWebTemplate(opts: CreateFileFromWebTemplateOptions): Promise<void>
```

Gets a file definition from given `url` and will create a fresh copy in target project.

Contents of `url` must be accessible via `node:https.get` function and will be fetched as raw text data.

Path to `targetFile` is relative to `process.cwd()` which allows consumers to run `npx your-script` in their project roots during development.  Several checks are in place to prevent accidental and malicious paths being passed in. Path traversal outside of CWD or providing absolute paths is disallowed. If the target directory does not exist, it will be automatically created.

By default the function asks for confirmation before attempting to create the file and if the file with the same name as `targetFile` is detected. Setting `opts.force` to `true` will suppress manual confirmation prompts. Passing `opts.prompt` allows tailoring your own question to the user.

#### `updateConfigFile`

```ts
interface UpdateConfigFileOptions extends FileOperationOptions {
  targetFile: string
  newConfig: Record<string | number | symbol, any>
  createMissing?: boolean
}
async function updateConfigFile(opts: UpdateConfigFileOptions): Promise<void>
```

Takes a path to a configuration file and updates it with the provided `newConfig` object.

Path to `targetFile` is relative to `process.cwd()`. Several checks are in place to prevent accidental and malicious paths being passed in. Path traversal outside of CWD or providing absolute paths is disallowed. The file currently must use ESM format with either `default` or named export of **exactly one** configuration object or function call with a configuration object as its argument.

If `targetFile` does not exist, the function throws an error by default. Setting `opts.createMissing` to `true` will instead create the file (including missing directories) as `export default {}` with `newConfig` merged in. The user is asked to confirm the creation unless `opts.force` is `true`.

The merger is performed using [unjs/magicast](https://github.com/unjs/magicast). It should:

- preserve comments
- work recursively to allow deep-merge
- extend existing object with new keys from `newConfig`
- overwrite keys with same name with values from `newConfig`
- create a unique-union in case of arrays
Please [report](https://github.com/AloisSeckar/elrh-cosca/issues) any logical flaws and issues of the process.

**Warning**: The function will fail, if the extracted object is proxied (e.g. when created using `defu`). In such case, the error would be:

```text
TypeError: 'set' on proxy: trap returned falsish for property '<YOUR_PROPERTY>'
```

If possible, you need to alter your logic, e.g. by creating a new object via the spread operator.

By default the function asks for confirmation before attempting to alter the `targetFile`. Setting `opts.force` to `true` will suppress manual confirmation prompts. Passing `opts.prompt` allows tailoring your own question to the user.

#### `updateJsonFile`

```ts
interface UpdateJsonFileOptions extends FileOperationOptions {
  targetFile: string
  jsonKey: string
  patch: JsonValue
  createMissing?: boolean
}
async function updateJsonFile(opts: UpdateJsonFileOptions): Promise<void>
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

If `targetFile` does not exist, the function throws an error by default. Setting `opts.createMissing` to `true` will instead create the file (including missing directories) as an empty JSON object with `patch` applied. The user is asked to confirm the creation unless `opts.force` is `true`.

By default the function asks for confirmation before attempting to alter the `targetFile`. Setting `opts.force` to `true` will suppress manual confirmation prompts. Passing `opts.prompt` allows tailoring your own question to the user.

#### `updateTextFile`

```ts
interface UpdateTextFileOptions extends FileOperationOptions {
  targetFile: string
  rowsToAdd: string[]
  allowDuplicates?: boolean
  createMissing?: boolean
}
async function updateTextFile(opts: UpdateTextFileOptions): Promise<void>
```

Takes a path to a plain text file and injects `rowsToAdd` at the end of the file, **providing they are not already present in the file**. Setting `opts.allowDuplicates` to `true` disables this check and all `rowsToAdd` are appended regardless of the current file contents. The function tracks if any real change was made and notifies the user if not.

Path to `targetFile` is relative to `process.cwd()`. Several checks are in place to prevent accidental and malicious paths being passed in. Path traversal outside of CWD or providing absolute paths is disallowed.

If `targetFile` does not exist, the function throws an error by default. Setting `opts.createMissing` to `true` will instead create the file (including missing directories) containing `rowsToAdd`. The user is asked to confirm the creation unless `opts.force` is `true`.

By default the function asks for confirmation before attempting to alter the `targetFile`. Setting `opts.force` to `true` will suppress manual confirmation prompts. Passing `opts.prompt` allows tailoring your own question to the user.

#### `removeFromJsonFile`

```ts
interface RemoveFromJsonFileOptions extends FileOperationOptions {
  targetFile: string
  jsonKey: string
}
async function removeFromJsonFile(opts: RemoveFromJsonFileOptions): Promise<void>
```

Takes a path to a JSON file and removes the specified `jsonKey`.

Path to `targetFile` is relative to `process.cwd()`. Several checks are in place to prevent accidental and malicious paths being passed in. Path traversal outside of CWD or providing absolute paths is disallowed. The file must be a valid JSON file. It is parsed using plain `JSON.parse`.

Given `jsonKey` might point to a nested key using dot notation, e.g. `a.b.c`. If the key is not present, the function does nothing.

By default the function asks for confirmation before attempting to alter the `targetFile`. Setting `opts.force` to `true` will suppress manual confirmation prompts. Passing `opts.prompt` allows tailoring your own question to the user.

#### `removeFromTextFile`

```ts
interface RemoveFromTextFileOptions extends FileOperationOptions {
  targetFile: string
  searchText: string
}
async function removeFromTextFile(opts: RemoveFromTextFileOptions): Promise<void>
```

Takes a path to a plain text file and removes all lines that include the given `searchText`. The matching is done using `String.includes()`, so partial matches within a line will cause that line to be removed. The function tracks if any real change was made and notifies the user if not.

Path to `targetFile` is relative to `process.cwd()`. Several checks are in place to prevent accidental and malicious paths being passed in. Path traversal outside of CWD or providing absolute paths is disallowed.

By default the function asks for confirmation before attempting to alter the `targetFile`. Setting `opts.force` to `true` will suppress manual confirmation prompts. Passing `opts.prompt` allows tailoring your own question to the user.

#### `deletePath`

```ts
interface DeletePathOptions extends FileOperationOptions {
  targetPath: string
}
async function deletePath(opts: DeletePathOptions): Promise<void>
```

Deletes given `targetPath` from FS. Path is resolved relatively to `process.cwd()`. Several checks are in place to prevent accidental and malicious paths being passed in. Path traversal outside of CWD or providing absolute paths is disallowed.

If the `targetPath` does not exist, the function does nothing.

By default the function asks for confirmation before attempting to delete the `targetPath`. Setting `opts.force` to `true` will suppress manual confirmation prompts. Passing `opts.prompt` allows tailoring your own question to the user.

### List of content checkers

#### `pathExists`

```ts
interface PathExistsOptions {
  targetPath: string
}
function pathExists(opts: PathExistsOptions): boolean
```

Checks if the specified `targetPath` exists on FS. Path is resolved relatively to `process.cwd()`. Several checks are in place to prevent accidental and malicious paths being passed in. Path traversal outside of CWD or providing absolute paths is disallowed.

If the path exists , the function returns true, false otherwise.

#### `hasJsonKey`

```ts
interface HasJsonKeyOptions {
  targetFile: string
  jsonKey: string
}
function hasJsonKey(opts: HasJsonKeyOptions): boolean
```

Checks whether given `jsonKey` exists in JSON file located at `targetFile`. Path is resolved relatively to `process.cwd()`. Several checks are in place to prevent accidental and malicious paths being passed in. Path traversal outside of CWD or providing absolute paths is disallowed.

Given `jsonKey` might point to a nested key using dot notation, e.g. `a.b.c`. If the key is present, the function returns true, false otherwise.

#### `hasText`

```ts
interface HasTextOptions {
  targetFile: string
  pattern: string | RegExp
  exact?: boolean
}
function hasText(opts: HasTextOptions): boolean
```

Checks whether given `pattern` exists in text file located at `targetFile`. Path is resolved relatively to `process.cwd()`. Several checks are in place to prevent accidental and malicious paths being passed in. Path traversal outside of CWD or providing absolute paths is disallowed.

The `pattern` might be a plain string or a regular expression. If it is present, the function returns true, false otherwise. By default partial matches are allowed for string patterns (`exact` defaults to `false`). If you set the optional `exact` property to true, the string must completely match at least one line in the file. However, surrounding whitespaces are trimmed in both cases.

#### `getPackageManager`

```ts
function getPackageManager(): 'npm' | 'yarn' | 'pnpm' | 'deno' | 'bun'
```

Tries to detect the package manager used in the current environment by checking for specific global variables and user agent strings. Fallbacks to `npm` if common checks fail to detect otherwise.

### List of terminal helpers

#### `promptUser`

```ts
interface PromptUserOptions {
  question: string
  input?: NodeJS.ReadableStream
  output?: NodeJS.WritableStream
}
async function promptUser(opts: PromptUserOptions): Promise<boolean>
```

Prints out a `question` to the console and waits for the input. Returns `true` when `y` is pressed and `false` otherwise.

By default it uses `process.stdin` and `process.stdout` streams. To use custom NodeJS streams, pass `input` and `output` directly in `opts`, e.g. `promptUser({ question: 'Continue?', input, output })`.

#### `showMessage`

```ts
interface ShowMessageOptions {
  message: string
  linesAfter?: number
}
function showMessage(opts: ShowMessageOptions): void
```

Prints out a `message` to `process.stdout` and adds `linesAfter` newlines after it (default is 1). Set `linesAfter: 0` to omit newlines. This function is synchronous.

#### `showError`

```ts
interface ShowErrorOptions {
  message: string
  linesAfter?: number
}
function showError(opts: ShowErrorOptions): void
```

Prints out a `message` to `process.stderr` and adds `linesAfter` newlines after it (default is 1). Set `linesAfter: 0` to omit newlines. This function is synchronous.

### List of other utils

#### `getEnvValue`

```ts
interface GetEnvValueOptions {
  key: string
  envFilePath?: string
}
function getEnvValue(opts: GetEnvValueOptions): string | undefined
```

Reads a `.env` file and returns the value of the specified key or `undefined` if key not found. By default it reads from `.env` in the current working directory at call time (usually the root of the project). You can specify a custom path to the `.env` file with the `envFilePath` property.

#### `parseQualifiedPath`

```ts
interface ParseQualifiedPathOptions {
  path: string
}
function parseQualifiedPath(opts: ParseQualifiedPathOptions): { pkg: string; file: string }
```

Expects path to file in `"package:relative/path/to/file"` format and splits it into `{ pkg, file }`. The package name can be scoped (e.g. `@scope/package`).

#### `resolvePackagePath`

```ts
interface ResolvePackagePathOptions {
  packageName: string
}
function resolvePackagePath(opts: ResolvePackagePathOptions): string
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

[https://github.com/AloisSeckar/elrh-cosca/issues](https://github.com/AloisSeckar/elrh-cosca/issues)
