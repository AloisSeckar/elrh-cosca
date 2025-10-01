import { resolve } from 'node:path'
import { existsSync } from 'node:fs'
import { checkPath } from '../_private/check-path.js'

/**
 * Checks if the specified file exists on FS.
 * 
 * @param {string} targetFile - The path to the text file to be checked (relative to CWD).
 * @returns {boolean} True if the file exists, false otherwise.
 * @throws Will throw an error if the path is invalid (can't traverse past CWD).
 */
export function fileExists(
    targetFile: string
): boolean {
    const check = checkPath(targetFile)
    if (!check.valid) {
        throw new Error(check.error)
    }

    const filePath = resolve(process.cwd(), targetFile)
    return existsSync(filePath)
}
