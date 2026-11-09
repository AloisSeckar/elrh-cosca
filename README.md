# COSCA

Library of I/O functions helping with building CLI scripts for making changes in target projects - like adding default configuration files or new sections in `package.json`.

The first experimental "customers" are my [Nuxt Spec](https://github.com/AloisSeckar/nuxt-spec) and [Nuxt Ignis](https://github.com/AloisSeckar/nuxt-ignis) projects.

The **"COSCA"** abbreviation stands for **CO**de **SCA**ffolding, which points out the library's purpose of providing methods for altering existing files and adding new ones from scratch using Node-based filesystem APIs.

## How to use

**NOTE:** The library is **ESM only** and it requires at least **Node 22.13** (when using [terminal helpers](#list-of-terminal-helpers) that rely on `styleText`).

Run `npm install elrh-cosca` to include it in your project.

### Options objects

All functions with arguments take a single required `opts` object with one or more properties. Each options type is exported from `elrh-cosca` and defined in [src/types/functions.ts](src/types/functions.ts).

### Path safety

Every `targetPath` is validated before use. Absolute paths and traversal outside of `process.cwd()` (including symlinks and junctions) are rejected.

### Bundle size

The library has no runtime dependencies and no bundled third-party parsers. Everything is emitted into a single entry file (`dist/elrh-cosca.mjs`, ~45 kB) and the package is marked as `"sideEffects": false`, so unused functions can be tree-shaken when bundled into your own code.

### List of file-manipulation functions

All file-manipulation options extend the following shared shape. `targetPath` is relative to `process.cwd()`. `force` defaults to `false`. An omitted or empty `prompt` uses the function's built-in initial confirmation question. `silent` defaults to `false`; when `true`, the function suppresses all of its `console.log` output.

```ts
interface FilePathOptions {
  targetPath: string
}
interface FileOperationOptions extends FilePathOptions {
  force?: boolean
  prompt?: string
  silent?: boolean
}
```

#### `createFileFromTemplate`

```ts
interface CreateFileFromTemplateOptions extends FileOperationOptions {
  templateFile: string
}
async function createFileFromTemplate(opts: CreateFileFromTemplateOptions): Promise<void>
```

Takes the file given by `templateFile` from an installed package and creates a fresh copy of it in the target project.

Path to `templateFile` must be prefixed with the package name to allow proper resolution, e.g. `your-package:path/to/template` (the path is relative to the package root and must not point outside of it). The package name can be scoped (e.g. `@scope/package`). The package is resolved using [`resolvePackagePath`](#resolvepackagepath).

Path to `targetPath` is relative to `process.cwd()`, which allows consumers to run `npx your-script` in their project roots during development. Several checks are in place to prevent accidental and malicious paths from being passed in. Path traversal outside of CWD and absolute paths are disallowed. If the target directory does not exist, it will be created automatically.

By default the function asks for confirmation before attempting to create the file and again if a file with the same name as `targetPath` already exists. Setting `opts.force` to `true` will suppress manual confirmation prompts. Passing `opts.prompt` allows tailoring your own initial question to the user.

#### `createFileFromWebTemplate`

```ts
interface CreateFileFromWebTemplateOptions extends FileOperationOptions {
  url: string
}
async function createFileFromWebTemplate(opts: CreateFileFromWebTemplateOptions): Promise<void>
```

Downloads the file given by `url` and creates a fresh copy of it in the target project.

Contents of `url` must be accessible via the `node:https.get` function and the response will be copied byte-for-byte. Redirects are followed before the fetch fails. The download is aborted when the response exceeds max allowed size or the request takes longer than allowed timeout (per redirect hop). The URL is not restricted to particular hosts, so do not pass untrusted URLs.

The default limits can be changed with environment variables (read on each call; invalid values are ignored with a warning and the default is used):

| Variable | Default | Meaning |
| --- | --- | --- |
| `COSCA_FETCH_REDIRECTS` | `5` | Maximum number of followed redirects (`0` disables redirects). |
| `COSCA_FETCH_SIZE` | `10485760` (10 MiB) | Maximum response size in bytes. |
| `COSCA_FETCH_TIMEOUT` | `30000` (30 s) | Timeout of each request (per redirect hop) in milliseconds. |

Path to `targetPath` is relative to `process.cwd()`, which allows consumers to run `npx your-script` in their project roots during development. Several checks are in place to prevent accidental and malicious paths from being passed in. Path traversal outside of CWD and absolute paths are disallowed. If the target directory does not exist, it will be created automatically.

By default the function asks for confirmation before attempting to create the file and again if a file with the same name as `targetPath` already exists. Setting `opts.force` to `true` will suppress manual confirmation prompts. Passing `opts.prompt` allows tailoring your own initial question to the user.

#### `updateConfigFile`

```ts
interface UpdateConfigFileOptions extends FileOperationOptions {
  newConfig: Record<string | number | symbol, any>
  createMissing?: boolean
}
async function updateConfigFile(opts: UpdateConfigFileOptions): Promise<void>
```

Takes a path to a configuration file and updates it with the provided `newConfig` object.

Path to `targetPath` is relative to `process.cwd()`. Several checks are in place to prevent accidental and malicious paths from being passed in. Path traversal outside of CWD and absolute paths are disallowed. The file may use ESM format with either a `default` export (`export default { ... }`) or **exactly one** named variable export (`export const x = { ... }`, `let`, or `var`), or CommonJS `module.exports = { ... }`. In all cases, the exported value must be either a configuration object literal or a function call with a configuration object literal as its first argument (e.g. `export default defineConfig({ ... })`).

If `targetPath` does not exist, the function throws an error by default. Setting `opts.createMissing` to `true` will instead create the file (including missing directories) as `export default {}` with `newConfig` merged in. The user is asked to confirm the creation unless `opts.force` is `true`.

The merge is performed using a built-in linear-time static scanner and serializer (without executing the file). It guarantees to:

- preserve comments and formatting of untouched parts
- work recursively to allow deep-merge
- extend the existing object with new keys from `newConfig`
- overwrite keys with the same name with values from `newConfig`
- create a unique union in case of arrays
- reject prototype-pollution keys (`__proto__`, `constructor`, `prototype`), symbol keys, and non-data values (functions, `undefined`, non-finite numbers, non-plain objects), and serialize all `newConfig` keys and values strictly as escaped data literals

Please [report](https://github.com/AloisSeckar/elrh-cosca/issues) any logical flaws and issues of the process.

By default the function asks for confirmation before attempting to alter the `targetPath`. Setting `opts.force` to `true` will suppress manual confirmation prompts. Passing `opts.prompt` allows tailoring your own initial question to the user.

#### `updateJsonFile`

```ts
interface UpdateJsonFileOptions extends FileOperationOptions {
  jsonKey: string
  patch: DataValue
  createMissing?: boolean
  overwriteArrays?: boolean
}
async function updateJsonFile(opts: UpdateJsonFileOptions): Promise<void>
```

Takes a path to a JSON file and injects `patch` under the `jsonKey` key. The `patch` is of type `DataValue` - a custom type defined as follows:

```ts
type DataPrimitive = string | number | boolean | null
type DataObject = { [key: string]: DataValue }
type DataArray = DataValue[]
type DataValue = DataPrimitive | DataObject | DataArray
```

Path to `targetPath` is relative to `process.cwd()`. Several checks are in place to prevent accidental and malicious paths from being passed in. Path traversal outside of CWD and absolute paths are disallowed. The file must be a valid JSON file with an object at its root. It is parsed using plain `JSON.parse`.

The given `jsonKey` might point to a nested key using dot notation, e.g. `a.b.c`. Missing intermediate levels are created as empty objects, and existing intermediate levels that are not objects (primitives, arrays and `null`) are replaced with objects. Empty key segments (e.g. `a..b`) and the segments `__proto__`, `constructor` and `prototype` are rejected with an error (the same applies to the top-level keys of an object `patch`). If `jsonKey` does not exist, a new key is added. If `patch` is an object, its keys are shallow-merged into the existing value. If the existing value is not an object, it is replaced. If `patch` is an array and the existing value is also an array, the items of `patch` are appended to it (duplicates are skipped). If the existing non-null value is not an array, it is turned into an array with the existing value as its first item, followed by the new items. This also applies to arrays among the keys of an object `patch`. Setting `opts.overwriteArrays` to `true` results in full array replacement instead. Other values (primitives, arrays replacing a missing or `null` value and `null`) replace the existing value. The function tracks if any real change was made (values are compared deeply) and notifies the user if not.

If `targetPath` does not exist, the function throws an error by default. Setting `opts.createMissing` to `true` will instead create the file (including missing directories) as an empty JSON object with `patch` applied. The user is asked to confirm the creation unless `opts.force` is `true`.

By default the function asks for confirmation before attempting to alter the `targetPath`. Setting `opts.force` to `true` will suppress manual confirmation prompts. Passing `opts.prompt` allows tailoring your own initial question to the user.

#### `updateYamlFile`

```ts
interface UpdateYamlFileOptions extends FileOperationOptions {
  yamlKey: string
  patch: DataValue
  createMissing?: boolean
  overwriteArrays?: boolean
}
async function updateYamlFile(opts: UpdateYamlFileOptions): Promise<void>
```

Takes a path to a YAML file and injects `patch` under the `yamlKey` key. The `patch` is of type `DataValue` (see [`updateJsonFile`](#updatejsonfile)).

Path to `targetPath` is relative to `process.cwd()`. Several checks are in place to prevent accidental and malicious paths from being passed in. Path traversal outside of CWD and absolute paths are disallowed. The file must be a valid single-document YAML file with a map at its root (an empty file is accepted).

The file is processed using a built-in YAML parser and serializer that preserves comments and formatting of untouched parts. It supports common configuration YAML constructs:

- block mappings and block sequences (including indentless sequences and compact maps in sequences)
- single-line flow mappings (`{ ... }`) and flow sequences (`[ ... ]`)
- plain, single-quoted (`'...'`), and double-quoted (`"..."`) scalars (`string`, `number`, `boolean`, `null` / `~`)
- explicit mapping keys (`? key`)
- full-line and inline `#` comments

Advanced YAML features outside this subset are currently not supported and will cause parsing to fail with an error:

- document markers (`---`, `...`) and multi-document streams
- anchors and aliases (`&anchor`, `*alias`)
- tags (`!tag`, `!!type`)
- block scalar styles (`|`, `>`) and multi-line scalars or multi-line flow collections
- complex collection keys (e.g. `[a, b]: 1`)
- tab characters in indentation

Please [report](https://github.com/AloisSeckar/elrh-cosca/issues) any logical flaws and issues of the process. Open new feature request if your usecase requires support of advanced YAML features.

The given `yamlKey` might point to a nested key using dot notation, e.g. `a.b.c`. Missing intermediate levels are created as empty maps, and existing intermediate levels that are not maps (scalars and sequences) are replaced with maps. Empty key segments (e.g. `a..b`) and the segments `__proto__`, `constructor` and `prototype` are rejected with an error (the same applies to the top-level keys of an object `patch`). If `yamlKey` does not exist, a new key is added. If `patch` is an object, its keys are shallow-merged into the existing value. If the existing value is not a map, it is replaced. If `patch` is an array and the existing value is a sequence, the items of `patch` are appended to it (duplicates are skipped). If the existing non-null value is not a sequence, it is turned into a sequence with the existing value as its first item, followed by the new items. Comments of the existing value are preserved in both cases. This also applies to arrays among the keys of an object `patch`. Setting `opts.overwriteArrays` to `true` results in full array replacement instead. Other values (primitives, arrays replacing a missing or `null` value and `null`) replace the existing value. The function tracks if any real change was made (values are compared deeply) and notifies the user if not.

If `targetPath` does not exist, the function throws an error by default. Setting `opts.createMissing` to `true` will instead create the file (including missing directories) as an empty YAML map with `patch` applied. The user is asked to confirm the creation unless `opts.force` is `true`.

By default the function asks for confirmation before attempting to alter the `targetPath`. Setting `opts.force` to `true` will suppress manual confirmation prompts. Passing `opts.prompt` allows tailoring your own initial question to the user.

#### `updateTextFile`

```ts
interface UpdateTextFileOptions extends FileOperationOptions {
  rowsToAdd: string[]
  allowDuplicates?: boolean
  createMissing?: boolean
}
async function updateTextFile(opts: UpdateTextFileOptions): Promise<void>
```

Takes a path to a plain text file and appends `rowsToAdd` at the end of the file, **provided they are not already present in the file** (as an exact line match). Setting `opts.allowDuplicates` to `true` disables this check and all `rowsToAdd` are appended regardless of the current file contents. The function tracks if any real change was made and notifies the user if not.

Path to `targetPath` is relative to `process.cwd()`. Several checks are in place to prevent accidental and malicious paths from being passed in. Path traversal outside of CWD and absolute paths are disallowed.

If `targetPath` does not exist, the function throws an error by default. Setting `opts.createMissing` to `true` will instead create the file (including missing directories) containing `rowsToAdd`. The user is asked to confirm the creation unless `opts.force` is `true`.

By default the function asks for confirmation before attempting to alter the `targetPath`. Setting `opts.force` to `true` will suppress manual confirmation prompts. Passing `opts.prompt` allows tailoring your own initial question to the user.

#### `removeFromJsonFile`

```ts
interface RemoveFromJsonFileOptions extends FileOperationOptions {
  jsonKey: string
}
async function removeFromJsonFile(opts: RemoveFromJsonFileOptions): Promise<void>
```

Takes a path to a JSON file and removes the specified `jsonKey`.

Path to `targetPath` is relative to `process.cwd()`. Several checks are in place to prevent accidental and malicious paths from being passed in. Path traversal outside of CWD and absolute paths are disallowed. The file must exist and be a valid JSON file. It is parsed using plain `JSON.parse`.

The given `jsonKey` might point to a nested key using dot notation, e.g. `a.b.c`. If the key is not present, the file is left untouched and the user is notified.

By default the function asks for confirmation before attempting to alter the `targetPath`. Setting `opts.force` to `true` will suppress manual confirmation prompts. Passing `opts.prompt` allows tailoring your own initial question to the user.

#### `removeFromTextFile`

```ts
interface RemoveFromTextFileOptions extends FileOperationOptions {
  searchText: string
}
async function removeFromTextFile(opts: RemoveFromTextFileOptions): Promise<void>
```

Takes a path to a plain text file and removes all lines that include the given `searchText`. The matching is done using `String.includes()`, so partial matches within a line will cause that line to be removed. The function tracks if any real change was made and notifies the user if not.

Path to `targetPath` is relative to `process.cwd()`. Several checks are in place to prevent accidental and malicious paths from being passed in. Path traversal outside of CWD and absolute paths are disallowed. The file must exist.

By default the function asks for confirmation before attempting to alter the `targetPath`. Setting `opts.force` to `true` will suppress manual confirmation prompts. Passing `opts.prompt` allows tailoring your own initial question to the user.

#### `removeFromYamlFile`

```ts
interface RemoveFromYamlFileOptions extends FileOperationOptions {
  yamlKey: string
}
async function removeFromYamlFile(opts: RemoveFromYamlFileOptions): Promise<void>
```

Takes a path to a YAML file and removes the specified `yamlKey`.

Path to `targetPath` is relative to `process.cwd()`. Several checks are in place to prevent accidental and malicious paths from being passed in. Path traversal outside of CWD and absolute paths are disallowed. The file must exist and be a valid single-document YAML file. It is parsed using the built-in YAML parser (see [`updateYamlFile`](#updateyamlfile) for supported syntax and limitations), which preserves comments and formatting of the untouched parts of the file.

The given `yamlKey` might point to a nested key using dot notation, e.g. `a.b.c`. If the key is not present (including when the file is empty or its root is not a map), the file is left untouched and the user is notified.

Comments attached to the removed key are removed as well, with two exceptions. A comment directly above the first root-level key is treated as a file header and kept at the top of the file. A comment left above a nested map that became empty is dropped.

By default the function asks for confirmation before attempting to alter the `targetPath`. Setting `opts.force` to `true` will suppress manual confirmation prompts. Passing `opts.prompt` allows tailoring your own initial question to the user.

#### `deletePath`

```ts
async function deletePath(opts: FileOperationOptions): Promise<void>
```

Deletes the given `targetPath` (a file or a directory, recursively) from FS. Path is resolved relative to `process.cwd()`. Several checks are in place to prevent accidental and malicious paths from being passed in. Path traversal outside of CWD and absolute paths are disallowed. The working directory itself cannot be deleted.

If the `targetPath` does not exist, nothing is deleted and the user is notified.

By default the function asks for confirmation before attempting to delete the `targetPath`. Setting `opts.force` to `true` will suppress manual confirmation prompts. Passing `opts.prompt` allows tailoring your own initial question to the user.

### List of content checkers

#### `pathExists`

```ts
function pathExists(opts: FilePathOptions): boolean
```

Checks if the specified `targetPath` (a file or a directory) exists on FS. Path is resolved relative to `process.cwd()`. Several checks are in place to prevent accidental and malicious paths from being passed in. Path traversal outside of CWD and absolute paths are disallowed.

If the path exists, the function returns `true`, `false` otherwise.

#### `hasJsonKey`

```ts
interface HasJsonKeyOptions extends FilePathOptions {
  jsonKey: string
}
function hasJsonKey(opts: HasJsonKeyOptions): boolean
```

Checks whether the given `jsonKey` exists in the JSON file located at `targetPath`. Path is resolved relative to `process.cwd()`. Several checks are in place to prevent accidental and malicious paths from being passed in. Path traversal outside of CWD and absolute paths are disallowed. The file must exist and be a valid JSON file.

The given `jsonKey` might point to a nested key using dot notation, e.g. `a.b.c`. If the key is present, the function returns `true`, `false` otherwise.

#### `hasYamlKey`

```ts
interface HasYamlKeyOptions extends FilePathOptions {
  yamlKey: string
}
function hasYamlKey(opts: HasYamlKeyOptions): boolean
```

Checks whether the given `yamlKey` exists in the YAML file located at `targetPath`. Path is resolved relative to `process.cwd()`. Several checks are in place to prevent accidental and malicious paths from being passed in. Path traversal outside of CWD and absolute paths are disallowed. The file must exist and be a valid single-document YAML file. It is parsed using the built-in YAML parser (see [`updateYamlFile`](#updateyamlfile) for supported syntax and limitations).

The given `yamlKey` might point to a nested key using dot notation, e.g. `a.b.c`. If the key is present, the function returns `true`, `false` otherwise (including when the file is empty or its root is not a map).

#### `hasText`

```ts
interface HasTextOptions extends FilePathOptions {
  pattern: string | RegExp
  exact?: boolean
}
function hasText(opts: HasTextOptions): boolean
```

Checks whether the given `pattern` exists in the text file located at `targetPath`. Path is resolved relative to `process.cwd()`. Several checks are in place to prevent accidental and malicious paths from being passed in. Path traversal outside of CWD and absolute paths are disallowed. The file must exist.

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
async function promptUser(opts: string | PromptUserOptions): Promise<boolean>
```

Prints out a `question` (with ` (y/N): ` appended) to the console and waits for the input. Returns `true` when the user answers `y` or `yes` (case-insensitive) and `false` otherwise.

By default it uses `process.stdin` and `process.stdout` streams. To use custom NodeJS streams, pass `input` and `output` directly in `opts`, e.g. `promptUser({ question: 'Continue?', input, output })`. When no extra options are needed, a plain string can be passed instead: `promptUser('Continue?')`.

#### `showMessage`

```ts
interface ShowTextOptions {
  message: string
  linesBefore?: number
  linesAfter?: number
}
interface ShowMessageOptions extends ShowTextOptions {
  color?: InspectColor
}
function showMessage(opts: string | ShowMessageOptions): void
```

Prints out a `message` to `process.stdout` followed by a newline, optionally preceded by `linesBefore` newlines and followed by `linesAfter` extra newlines (both default to 0). A plain string can be passed instead of the object, e.g. `showMessage('Done')`.

The message is printed out in `color` (default: no color) via the `styleText` function from the `node:util` module.

#### `showError`

```ts
function showError(opts: string | ShowTextOptions): void
```

Prints out a `message` to `process.stderr` followed by a newline, optionally preceded by `linesBefore` newlines and followed by `linesAfter` extra newlines (both default to 0). A plain string can be passed instead of the object, e.g. `showError('Failed')`.

The message is printed out in red via the `styleText` function from the `node:util` module.

#### `showInfo`, `showSuccess`, `showWarning`, `showDebug`

```ts
function showInfo(opts: string | ShowTextOptions): void
function showSuccess(opts: string | ShowTextOptions): void
function showWarning(opts: string | ShowTextOptions): void
function showDebug(opts: string | ShowTextOptions): void
```

Shortcuts for `showMessage` with a fixed `color`: `showInfo` prints in white, `showSuccess` in green, `showWarning` in yellow and `showDebug` in gray.

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

Resolves a package's root directory *from the target app* (CWD). Returns CWD itself if its `package.json` has the same name (i.e. the package is being developed), otherwise looks for the package inside *node_modules* in CWD. The package name can be scoped (e.g. `@scope/package`) and must be a valid npm package name (path segments like `..` are rejected). Throws an error if the package name is invalid or the package cannot be found.

## Tech stack

- Developed with [TypeScript](https://www.typescriptlang.org/) in mind
- Built with [Vite](https://vitejs.dev/)
- Tested with [Vitest](https://vitest.dev/)

See [Changelog](https://github.com/AloisSeckar/elrh-cosca/blob/main/CHANGELOG.md) for project history and development.

## Report bugs & contact

Use GitHub issues to report bugs / propose enhancements / give feedback:

[https://github.com/AloisSeckar/elrh-cosca/issues](https://github.com/AloisSeckar/elrh-cosca/issues)
