import { resolve } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import { checkPath } from '../_private/check-path.js'

/**
 * Checks if a text file contains specified text.
 * 
 * @param {string} targetFile - The path to the text file to be checked (relative to CWD).
 * @param {string | RegExp} pattern - The text or regular expression pattern to search for.
 * @param {boolean} exact - If true, requires exact line match (default: false for partial matching).
 * @returns {boolean} True if the pattern is found in target file, false otherwise.
 * @throws Will throw an error if the path is invalid or the file does not exist.
 */
export function hasText(
    targetFile: string, 
    pattern: string | RegExp,
    exact: boolean = false
): boolean {
    const check = checkPath(targetFile)
    if (!check.valid) {
        throw new Error(check.error)
    }

    const textFilePath = resolve(process.cwd(), targetFile)
    if (!existsSync(textFilePath)) {
        throw new Error(`No '${targetFile}' found in project root — cannot check its contents.`)
    }

    const textRaw = readFileSync(textFilePath, 'utf8')
    const lines = textRaw.split(/\r?\n/).map(line => line.trim())

    // Handle RegExp pattern
    if (pattern instanceof RegExp) {
        return lines.some(line => pattern.test(line))
    }

    // Handle string pattern
    const searchText = pattern.trim()
    
    if (exact) {
        // Exact match: whole line must equal the pattern
        return lines.includes(searchText)
    } else {
        // Partial match: line must contain the pattern
        return lines.some(line => line.includes(searchText))
    }
}
