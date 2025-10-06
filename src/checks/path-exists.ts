import { resolve } from 'node:path'
import { existsSync } from 'node:fs'
import { checkPath } from '../_private/check-path.js'

/**
 * Checks if the specified path exists on FS.
 * 
 * @param {string} targetPath - The path on FS to be checked (relative to CWD).
 * @returns {boolean} True if the path exists, false otherwise.
 * @throws Will throw an error if the path is invalid (can't traverse past CWD).
 */
export function pathExists(
    targetPath: string
): boolean {
    const check = checkPath(targetPath)
    if (!check.valid) {
        throw new Error(check.error)
    }

    const path = resolve(process.cwd(), targetPath)
    return existsSync(path)
}
