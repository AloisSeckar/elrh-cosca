import type { DataValue } from './data.js'

export interface FilePathOptions {
	/** The path to the file or directory to work with (relative to CWD). */
	targetPath: string
}

export interface FileOperationOptions extends FilePathOptions {
	/** If true, skips all confirmation prompts (default: false). */
	force?: boolean
	/** Custom text of the initial confirmation question (default: built-in question). */
	prompt?: string
	/** If true, suppresses all console log output (default: false). */
	silent?: boolean
}

export interface HasJsonKeyOptions extends FilePathOptions {
	/** The key in the JSON file to be checked for existence (may use dot notation for nested keys). */
	jsonKey: string
}

export interface HasYamlKeyOptions extends FilePathOptions {
	/** The key in the YAML file to be checked for existence (may use dot notation for nested keys). */
	yamlKey: string
}

export interface HasTextOptions extends FilePathOptions {
	/** The text or regular expression pattern to search for (lines and text pattern are trimmed before matching). */
	pattern: string | RegExp
	/** If true, a text pattern must match a whole line; ignored for RegExp patterns (default: false). */
	exact?: boolean
}

export interface CreateFileFromTemplateOptions extends FileOperationOptions {
	/** The path to the template file in `package:relative/path/to/file` format (relative to the package root). */
	templateFile: string
}

export interface CreateFileFromWebTemplateOptions extends FileOperationOptions {
	/** The URL of the template file (must be accessible via `node:https.get`; content is copied byte-for-byte; HTTPS redirects are followed). */
	url: string
}

export interface RemoveFromJsonFileOptions extends FileOperationOptions {
	/** The key in the JSON file to be deleted (may use dot notation for nested keys). */
	jsonKey: string
}

export interface RemoveFromTextFileOptions extends FileOperationOptions {
	/** The text to search for; any line that includes this text will be removed. */
	searchText: string
}

export interface RemoveFromYamlFileOptions extends FileOperationOptions {
	/** The key in the YAML file to be deleted (may use dot notation for nested keys). */
	yamlKey: string
}

export interface UpdateConfigFileOptions extends FileOperationOptions {
	/** The config to merge in (takes precedence). */
	newConfig: Record<string | number | symbol, any>
	/** If true, the file is created (with `export default {}`) when it does not exist, after confirmation unless `force` is set (default: false). */
	createMissing?: boolean
}

export interface UpdateJsonFileOptions extends FileOperationOptions {
	/** The key in the JSON file to update (can be new or existing; may use dot notation for nested keys - missing or non-object intermediate levels are replaced with objects). */
	jsonKey: string
	/** The value for the specified key. Objects are shallow-merged into the existing value (a non-object existing value is replaced), arrays are appended to the existing value by default (duplicates are skipped, a non-array existing value becomes the first item), other values (primitives, null) replace it. */
	patch: DataValue
	/** If true, the file is created when it does not exist, after confirmation unless `force` is set (default: false). */
	createMissing?: boolean
	/** If true, an array patch replaces the existing value instead of appending (default: false). */
	overwriteArrays?: boolean
}

export interface UpdateYamlFileOptions extends FileOperationOptions {
	/** The key in the YAML file to update (can be new or existing; may use dot notation for nested keys - missing or non-map intermediate levels are replaced with maps). */
	yamlKey: string
	/** The value for the specified key. Objects are shallow-merged into the existing value (a non-map existing value is replaced), arrays are appended to the existing value by default (duplicates are skipped, a non-sequence existing value becomes the first item), other values (primitives, null) replace it. */
	patch: DataValue
	/** If true, the file is created when it does not exist, after confirmation unless `force` is set (default: false). */
	createMissing?: boolean
	/** If true, an array patch replaces the existing value instead of appending (default: false). */
	overwriteArrays?: boolean
}

export interface UpdateTextFileOptions extends FileOperationOptions {
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

export interface ShowMessageOptions {
	/** The message text to display. */
	message: string
	/** The number of newlines to print before the message (default: 0). */
	linesBefore?: number
	/** The number of extra newlines to print after the message's own newline (default: 0). */
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
