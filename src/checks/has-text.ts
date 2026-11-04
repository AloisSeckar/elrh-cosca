import type { HasTextOptions } from '../types/functions.js'
import { readTargetFile } from '../_private/file-helpers.js'

/**
 * Checks if a text file contains specified text.
 * 
 * @param {string} opts.targetPath - The path to the file or directory to work with (relative to CWD).
 * @param {string | RegExp} opts.pattern - The text or regular expression pattern to search for (lines and text pattern are trimmed before matching).
 * @param {boolean} [opts.exact] - If true, a text pattern must match a whole line; ignored for RegExp patterns (default: false).
 * @returns {boolean} True if the pattern is found in target file, false otherwise.
 * @throws Will throw an error if the path is invalid or the file does not exist.
 */
export function hasText(opts: HasTextOptions): boolean {
    const { targetPath, pattern, exact = false } = opts
    const { content } = readTargetFile(targetPath, 'check its contents')
    const lines = content.split(/\r?\n/).map(line => line.trim())

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
