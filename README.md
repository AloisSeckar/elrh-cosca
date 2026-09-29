# COSCA

Library of I/O functions helping with building CLI scripts for making changes in target projects - like adding default configuration files or new sections in `package.json`.

The first experimental "customers" are my [Nuxt Spec](https://github.com/AloisSeckar/nuxt-spec) and [Nuxt Ignis](https://github.com/AloisSeckar/nuxt-ignis) projects.

The **"COSCA"** abbreviation stands for **CO**de **SCA**ffolding, which points out the library's purpose of providing methods for altering existing files and adding new ones from scratch using Node-based filesystem APIs.

## How to use

**NOTE:** The library is **ESM only** and it is advised to use it with at least **Node 22**.

Run `npm install elrh-cosca` to include it in your project.

### Options objects

All functions with arguments take a single required `opts` object with one or more properties. Each options type is exported from `elrh-cosca` and defined in [src/types/functions.ts](src/types/functions.ts).

### List of file-manipulation functions

All file-manipulation options extend the following shared shape. `force` defaults to `false`. An omitted or empty `prompt` uses the function's built-in initial confirmation question.

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

Takes the file given by `templateFile` from an installed package and creates a fresh copy of it in the target project.

Path to `templateFile` must be prefixed with the package name to allow proper resolution, e.g. `your-package:path/to/template` (the path is relative to the package root). The package name can be scoped (e.g. `@scope/package`). The package is resolved using [`resolvePackagePath`](#resolvepackagepath).

Path to `targetFile` is relative to `process.cwd()`, which allows consumers to run `npx your-script` in their project roots during development. Several checks are in place to prevent accidental and malicious paths from being passed in. Path traversal outside of CWD and absolute paths are disallowed. If the target directory does not exist, it will be created automatically.

By default the function asks for confirmation before attempting to create the file and again if a file with the same name as `targetFile` already exists. Setting `opts.force` to `true` will suppress manual confirmation prompts. Passing `opts.prompt` allows tailoring your own initial question to the user.

#### `createFileFromWebTemplate`

```ts
interface CreateFileFromWebTemplateOptions extends FileOperationOptions {
  url: string
  targetFile: string
}
async function createFileFromWebTemplate(opts: CreateFileFromWebTemplateOptions): Promise<void>
```

Downloads the file given by `url` and creates a fresh copy of it in the target project.

Contents of `url` must be accessible via the `node:https.get` function and will be fetched as raw text data. Redirects (5) are followed before the fetch fails.

Path to `targetFile` is relative to `process.cwd()`, which allows consumers to run `npx your-script` in their project roots during development. Several checks are in place to prevent accidental and malicious paths from being passed in. Path traversal outside of CWD and absolute paths are disallowed. If the target directory does not exist, it will be created automatically.

By default the function asks for confirmation before attempting to create the file and again if a file with the same name as `targetFile` already exists. Setting `opts.force` to `true` will suppress manual confirmation prompts. Passing `opts.prompt` allows tailoring your own initial question to the user.

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

Path to `targetFile` is relative to `process.cwd()`. Several checks are in place to prevent accidental and malicious paths from being passed in. Path traversal outside of CWD and absolute paths are disallowed. The file currently must use ESM format with either a `default` export or **exactly one** named export. The exported value must be a configuration object or a function call with a configuration object as its first argument (e.g. `defineConfig({...})`). CommonJS `module.exports` is not supported.

If `targetFile` does not exist, the function throws an error by default. Setting `opts.createMissing` to `true` will instead create the file (including missing directories) as `export default {}` with `newConfig` merged in. The user is asked to confirm the creation unless `opts.force` is `true`.

The merge is performed using [unjs/magicast](https://github.com/unjs/magicast). It should:

- preserve comments
- work recursively to allow deep-merge
- extend the existing object with new keys from `newConfig`
- overwrite keys with the same name with values from `newConfig`
- create a unique union in case of arrays

Please [report](https://github.com/AloisSeckar/elrh-cosca/issues) any logical flaws and issues of the process.

**Warning**: The function will fail if the extracted object is proxied (e.g. when created using `defu`). In such case, the error would be:

```text
TypeError: 'set' on proxy: trap returned falsish for property '<YOUR_PROPERTY>'
```

If possible, you need to alter your logic, e.g. by creating a new object via the spread operator.

By default the function asks for confirmation before attempting to alter the `targetFile`. Setting `opts.force` to `true` will suppress manual confirmation prompts. Passing `opts.prompt` allows tailoring your own initial question to the user.

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

Takes a path to a JSON file and injects `patch` under the `jsonKey` key. The `patch` is of type `JsonValue` - a custom type defined as follows:

```ts
type JsonPrimitive = string | number | boolean | null
type JsonObject = { [key: string]: JsonValue }
type JsonArray = JsonValue[]
type JsonValue = JsonPrimitive | JsonObject | JsonArray
```

Path to `targetFile` is relative to `process.cwd()`. Several checks are in place to prevent accidental and malicious paths from being passed in. Path traversal outside of CWD and absolute paths are disallowed. The file must be a valid JSON file. It is parsed using plain `JSON.parse`.

The given `jsonKey` might point to a nested key using dot notation, e.g. `a.b.c`. Missing intermediate levels are created as empty objects, and existing intermediate levels that are not objects (primitives, arrays and `null`) are replaced with objects. Empty key segments (e.g. `a..b`) and the segments `__proto__`, `constructor` and `prototype` are rejected with an error. If `jsonKey` does not exist, a new key is added. If `patch` is an object, its keys are shallow-merged into the existing value. If the existing value is not an object, it is replaced. Other values (primitives, arrays and `null`) replace the existing value. The function tracks if any real change was made and notifies the user if not.

If `targetFile` does not exist, the function throws an error by default. Setting `opts.createMissing` to `true` will instead create the file (including missing directories) as an empty JSON object with `patch` applied. The user is asked to confirm the creation unless `opts.force` is `true`.

By default the function asks for confirmation before attempting to alter the `targetFile`. Setting `opts.force` to `true` will suppress manual confirmation prompts. Passing `opts.prompt` allows tailoring your own initial question to the user.

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

Takes a path to a plain text file and appends `rowsToAdd` at the end of the file, **provided they are not already present in the file** (as an exact line match). Setting `opts.allowDuplicates` to `true` disables this check and all `rowsToAdd` are appended regardless of the current file contents. The function tracks if any real change was made and notifies the user if not.

Path to `targetFile` is relative to `process.cwd()`. Several checks are in place to prevent accidental and malicious paths from being passed in. Path traversal outside of CWD and absolute paths are disallowed.

If `targetFile` does not exist, the function throws an error by default. Setting `opts.createMissing` to `true` will instead create the file (including missing directories) containing `rowsToAdd`. The user is asked to confirm the creation unless `opts.force` is `true`.

By default the function asks for confirmation before attempting to alter the `targetFile`. Setting `opts.force` to `true` will suppress manual confirmation prompts. Passing `opts.prompt` allows tailoring your own initial question to the user.

#### `removeFromJsonFile`

```ts
interface RemoveFromJsonFileOptions extends FileOperationOptions {
  targetFile: string
  jsonKey: string
}
async function removeFromJsonFile(opts: RemoveFromJsonFileOptions): Promise<void>
```

Takes a path to a JSON file and removes the specified `jsonKey`.

Path to `targetFile` is relative to `process.cwd()`. Several checks are in place to prevent accidental and malicious paths from being passed in. Path traversal outside of CWD and absolute paths are disallowed. The file must exist and be a valid JSON file. It is parsed using plain `JSON.parse`.

The given `jsonKey` might point to a nested key using dot notation, e.g. `a.b.c`. If the key is not present, the file is left untouched and the user is notified.

By default the function asks for confirmation before attempting to alter the `targetFile`. Setting `opts.force` to `true` will suppress manual confirmation prompts. Passing `opts.prompt` allows tailoring your own initial question to the user.

#### `removeFromTextFile`

```ts
interface RemoveFromTextFileOptions extends FileOperationOptions {
  targetFile: string
  searchText: string
}
async function removeFromTextFile(opts: RemoveFromTextFileOptions): Promise<void>
```

Takes a path to a plain text file and removes all lines that include the given `searchText`. The matching is done using `String.includes()`, so partial matches within a line will cause that line to be removed. The function tracks if any real change was made and notifies the user if not.

Path to `targetFile` is relative to `process.cwd()`. Several checks are in place to prevent accidental and malicious paths from being passed in. Path traversal outside of CWD and absolute paths are disallowed. The file must exist.

By default the function asks for confirmation before attempting to alter the `targetFile`. Setting `opts.force` to `true` will suppress manual confirmation prompts. Passing `opts.prompt` allows tailoring your own initial question to the user.

#### `deletePath`

```ts
interface DeletePathOptions extends FileOperationOptions {
  targetPath: string
}
async function deletePath(opts: DeletePathOptions): Promise<void>
```

Deletes the given `targetPath` (a file or a directory, recursively) from FS. Path is resolved relative to `process.cwd()`. Several checks are in place to prevent accidental and malicious paths from being passed in. Path traversal outside of CWD and absolute paths are disallowed.

If the `targetPath` does not exist, nothing is deleted and the user is notified.

By default the function asks for confirmation before attempting to delete the `targetPath`. Setting `opts.force` to `true` will suppress manual confirmation prompts. Passing `opts.prompt` allows tailoring your own initial question to the user.

### List of content checkers

#### `pathExists`

```ts
interface PathExistsOptions {
  targetPath: string
}
function pathExists(opts: PathExistsOptions): boolean
```

Checks if the specified `targetPath` (a file or a directory) exists on FS. Path is resolved relative to `process.cwd()`. Several checks are in place to prevent accidental and malicious paths from being passed in. Path traversal outside of CWD and absolute paths are disallowed.

If the path exists, the function returns `true`, `false` otherwise.

#### `hasJsonKey`

```ts
interface HasJsonKeyOptions {
  targetFile: string
  jsonKey: string
}
function hasJsonKey(opts: HasJsonKeyOptions): boolean
```

Checks whether the given `jsonKey` exists in the JSON file located at `targetFile`. Path is resolved relative to `process.cwd()`. Several checks are in place to prevent accidental and malicious paths from being passed in. Path traversal outside of CWD and absolute paths are disallowed. The file must exist and be a valid JSON file.

The given `jsonKey` might point to a nested key using dot notation, e.g. `a.b.c`. If the key is present, the function returns `true`, `false` otherwise.

#### `hasText`

```ts
interface HasTextOptions {
  targetFile: string
  pattern: string | RegExp
  exact?: boolean
}
function hasText(opts: HasTextOptions): boolean
```

Checks whether the given `pattern` exists in the text file located at `targetFile`. Path is resolved relative to `process.cwd()`. Several checks are in place to prevent accidental and malicious paths from being passed in. Path traversal outside of CWD and absolute paths are disallowed. The file must exist.

The `pattern` might be a plain string or a regular expression. The file is checked line by line. If the pattern is found, the function returns `true`, `false` otherwise. By default partial matches are allowed for string patterns (`exact` defaults to `false`). If you set the optional `exact` property to `true`, the string must completely match at least one line in the file. Surrounding whitespace is trimmed from the lines and from string patterns in both cases. The `exact` property is ignored for regular expressions.

#### `getPackageManager`

```ts
function getPackageManager(): 'npm' | 'yarn' | 'pnpm' | 'deno' | 'bun'
```

Tries to detect the package manager (or runtime) used in the current environment by checking for `Deno` and `Bun` global variables and the `npm_config_user_agent` environment variable. Falls back to `npm` if the checks fail to detect anything else.

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

Prints out a `question` (with ` (y/N): ` appended) to the console and waits for the input. Returns `true` when the user answers `y` or `yes` (case-insensitive) and `false` otherwise.

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

Reads a `.env` file and returns the value of the specified `key` (without surrounding quotes) or `undefined` if the file or the key is not found. By default it reads from `.env` in the current working directory at call time (usually the root of the project). You can specify a custom path to the `.env` file with the `envFilePath` property.

#### `parseQualifiedPath`

```ts
interface ParseQualifiedPathOptions {
  path: string
}
function parseQualifiedPath(opts: ParseQualifiedPathOptions): { pkg: string; file: string }
```

Expects a path to a file in `"package:relative/path/to/file"` format and splits it into `{ pkg, file }`. The package name can be scoped (e.g. `@scope/package`). Throws an error if the input format is invalid.

#### `resolvePackagePath`

```ts
interface ResolvePackagePathOptions {
  packageName: string
}
function resolvePackagePath(opts: ResolvePackagePathOptions): string
```

Resolves a package's root directory *from the target app* (CWD). Returns CWD itself if its `package.json` has the same name (i.e. the package is being developed), otherwise looks for the package inside *node_modules* in CWD. The package name can be scoped (e.g. `@scope/package`). Throws an error if the package cannot be found.

## Tech stack

- Developed with [TypeScript](https://www.typescriptlang.org/) in mind
- Using [magicast](https://github.com/unjs/magicast) for parsing files
- Built with [Vite](https://vitejs.dev/)
- Tested with [Vitest](https://vitest.dev/)

See [Changelog](https://github.com/AloisSeckar/elrh-cosca/blob/main/CHANGELOG.md) for project history and development.

## Report bugs & contact

Use GitHub issues to report bugs / propose enhancements / give feedback:

[https://github.com/AloisSeckar/elrh-cosca/issues](https://github.com/AloisSeckar/elrh-cosca/issues)
