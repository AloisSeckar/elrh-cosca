import type { DataValue } from './data.js'

interface FileOperationOptions {
	/** If true, skips all confirmation prompts (default: false). */
	force?: boolean
	/** Custom text of the initial confirmation question (default: built-in question). */
	prompt?: string
}

export interface HasJsonKeyOptions {
	/** The path to the JSON file to be checked (relative to CWD). */
	targetFile: string
	/** The key in the JSON file to be checked for existence (may use dot notation for nested keys). */
	jsonKey: string
}

export interface HasYamlKeyOptions {
	/** The path to the YAML file to be checked (relative to CWD). */
	targetFile: string
	/** The key in the YAML file to be checked for existence (may use dot notation for nested keys). */
	yamlKey: string
}

export interface HasTextOptions {
	/** The path to the text file to be checked (relative to CWD). */
	targetFile: string
	/** The text or regular expression pattern to search for (lines and text pattern are trimmed before matching). */
	pattern: string | RegExp
	/** If true, a text pattern must match a whole line; ignored for RegExp patterns (default: false). */
	exact?: boolean
}

export interface PathExistsOptions {
	/** The path to the file or directory to be checked (relative to CWD). */
	targetPath: string
}

export interface CreateFileFromTemplateOptions extends FileOperationOptions {
	/** The path to the template file in `package:relative/path/to/file` format (relative to the package root). */
	templateFile: string
	/** The path to the file to create (relative to CWD). Existing file is overwritten after confirmation. */
	targetFile: string
}

export interface CreateFileFromWebTemplateOptions extends FileOperationOptions {
	/** The URL of the template file (must be accessible via `node:https.get`; content is copied byte-for-byte; HTTPS redirects are followed). */
	url: string
	/** The path to the file to create (relative to CWD). Existing file is overwritten after confirmation. */
	targetFile: string
}

export interface DeletePathOptions extends FileOperationOptions {
	/** The path to the file or directory to delete (relative to CWD). */
	targetPath: string
}

export interface RemoveFromJsonFileOptions extends FileOperationOptions {
	/** The path to the JSON file to update (relative to CWD). */
	targetFile: string
	/** The key in the JSON file to be deleted (may use dot notation for nested keys). */
	jsonKey: string
}

export interface RemoveFromTextFileOptions extends FileOperationOptions {
	/** The path to the text file to update (relative to CWD). */
	targetFile: string
	/** The text to search for; any line that includes this text will be removed. */
	searchText: string
}

export interface RemoveFromYamlFileOptions extends FileOperationOptions {
	/** The path to the YAML file to update (relative to CWD). */
	targetFile: string
	/** The key in the YAML file to be deleted (may use dot notation for nested keys). */
	yamlKey: string
}

export interface UpdateConfigFileOptions extends FileOperationOptions {
	/** The path to the config file to update (relative to CWD). */
	targetFile: string
	/** The config to merge in (takes precedence). */
	newConfig: Record<string | number | symbol, any>
	/** If true, the file is created (with `export default {}`) when it does not exist, after confirmation unless `force` is set (default: false). */
	createMissing?: boolean
}

export interface UpdateJsonFileOptions extends FileOperationOptions {
	/** The path to the JSON file to update (relative to CWD). */
	targetFile: string
	/** The key in the JSON file to update (can be new or existing; may use dot notation for nested keys - missing or non-object intermediate levels are replaced with objects). */
	jsonKey: string
	/** The value for the specified key. Objects are shallow-merged into the existing value (a non-object existing value is replaced), arrays are appended to an existing array by default, other values (primitives, null) replace it. */
	patch: DataValue
	/** If true, the file is created when it does not exist, after confirmation unless `force` is set (default: false). */
	createMissing?: boolean
	/** If true, existing arrays are replaced instead of appended to (default: false). */
	overwriteArrays?: boolean
}

export interface UpdateYamlFileOptions extends FileOperationOptions {
	/** The path to the YAML file to update (relative to CWD). */
	targetFile: string
	/** The key in the YAML file to update (can be new or existing; may use dot notation for nested keys - missing or non-map intermediate levels are replaced with maps). */
	yamlKey: string
	/** The value for the specified key. Objects are shallow-merged into the existing value (a non-map existing value is replaced), arrays are appended to an existing sequence by default, other values (primitives, null) replace it. */
	patch: DataValue
	/** If true, the file is created when it does not exist, after confirmation unless `force` is set (default: false). */
	createMissing?: boolean
	/** If true, existing sequences are replaced instead of appended to (default: false). */
	overwriteArrays?: boolean
}

export interface UpdateTextFileOptions extends FileOperationOptions {
	/** The path to the text file to update (relative to CWD). */
	targetFile: string
	/** New rows to be added at the end of the file. */
	rowsToAdd: string[]
	/** If true, rows are added even if identical lines already exist in the file (default: false). */
	allowDuplicates?: boolean
	/** If true, the file is created when it does not exist, after confirmation unless `force` is set (default: false). */
	createMissing?: boolean
}

export interface PromptUserOptions {
	/** The question to ask the user. */
	question: string
	/** Custom input stream (default: process.stdin). */
	input?: NodeJS.ReadableStream
	/** Custom output stream (default: process.stdout). */
	output?: NodeJS.WritableStream
}

export interface ShowErrorOptions {
	/** The error message text to display. */
	message: string
	/** The number of newlines to print after the message (default: 1). */
	linesAfter?: number
}

export interface ShowMessageOptions {
	/** The message text to display. */
	message: string
	/** The number of newlines to print after the message (default: 1). */
	linesAfter?: number
}

export interface GetEnvValueOptions {
	/** The name of the environment variable to retrieve. */
	key: string
	/** The path to the .env file (default: `.env` in CWD). */
	envFilePath?: string
}

export interface ParseQualifiedPathOptions {
	/** The qualified path string to parse. */
	path: string
}

export interface ResolvePackagePathOptions {
	/** The name of the package to resolve. */
	packageName: string
}
