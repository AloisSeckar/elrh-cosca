import type { FilePathOptions } from '../types/functions.js'
import { existsSync } from 'node:fs'
import { resolveCheckedPath } from '../_private/file-helpers.js'

/**
 * Checks if the specified path exists on FS. The search is limited to CWD.
 * 
 * @param {string} opts.targetPath - The path to the file or directory to work with (relative to CWD).
 * @returns {boolean} True if the path exists, false otherwise.
 * @throws Will throw an error if the path is invalid.
 */
export function pathExists(opts: FilePathOptions): boolean {
  const { targetPath } = opts
  return existsSync(resolveCheckedPath(targetPath))
}
