import type { PathExistsOptions } from '../types/functions.js'
import { resolve } from 'node:path'
import { existsSync } from 'node:fs'
import { checkPath } from '../_private/check-path.js'

/**
 * Checks if the specified path exists on FS. The search is limited to CWD.
 * 
 * @param {PathExistsOptions} opts - Options for this operation.
 * @param {string} opts.targetPath - The path to the file or directory to be checked (relative to CWD).
 * @returns {boolean} True if the path exists, false otherwise.
 * @throws Will throw an error if the path is invalid.
 */
export function pathExists(opts: PathExistsOptions): boolean {
    const { targetPath } = opts
    const check = checkPath(targetPath)
    if (!check.valid) {
        throw new Error(check.error)
    }

    const path = resolve(process.cwd(), targetPath)
    return existsSync(path)
}
