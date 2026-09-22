import type { JsonValue } from './json.js'

interface FileOperationOptions {
	/** Skip confirmation prompts. Defaults to false. */
	force?: boolean
	/** Custom confirmation question. Defaults to the operation's built-in question. */
	prompt?: string
}

export interface HasJsonKeyOptions {
	targetFile: string
	jsonKey: string
}

export interface HasTextOptions {
	targetFile: string
	pattern: string | RegExp
	/** Require a full-line string match. Defaults to false. */
	exact?: boolean
}

export interface PathExistsOptions {
	targetPath: string
}

export interface CreateFileFromTemplateOptions extends FileOperationOptions {
	templateFile: string
	targetFile: string
}

export interface CreateFileFromWebTemplateOptions extends FileOperationOptions {
	url: string
	targetFile: string
}

export interface DeletePathOptions extends FileOperationOptions {
	targetPath: string
}

export interface RemoveFromJsonFileOptions extends FileOperationOptions {
	targetFile: string
	jsonKey: string
}

export interface RemoveFromTextFileOptions extends FileOperationOptions {
	targetFile: string
	searchText: string
}

export interface UpdateConfigFileOptions extends FileOperationOptions {
	targetFile: string
	newConfig: Record<string | number | symbol, any>
}

export interface UpdateJsonFileOptions extends FileOperationOptions {
	targetFile: string
	jsonKey: string
	patch: JsonValue
}

export interface UpdateTextFileOptions extends FileOperationOptions {
	targetFile: string
	rowsToAdd: string[]
}

export interface PromptUserOptions {
	question: string
	/** Defaults to process.stdin. */
	input?: NodeJS.ReadableStream
	/** Defaults to process.stdout. */
	output?: NodeJS.WritableStream
}

export interface ShowErrorOptions {
	message: string
	/** Number of trailing newlines. Defaults to 1. */
	linesAfter?: number
}

export interface ShowMessageOptions {
	message: string
	/** Number of trailing newlines. Defaults to 1. */
	linesAfter?: number
}

export interface GetEnvValueOptions {
	key: string
	/** Defaults to .env in the current working directory at call time. */
	envFilePath?: string
}

export interface ParseQualifiedPathOptions {
	path: string
}

export interface ResolvePackagePathOptions {
	packageName: string
}
