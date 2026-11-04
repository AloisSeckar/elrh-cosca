import type { DeletePathOptions } from '../types/functions.js'
import { existsSync, rmSync } from 'node:fs'
import { confirmAction, resolveCheckedPath } from '../_private/file-helpers.js'

/**
 * Deletes a file or a directory (recursively) from FS.
 * 
 * @param {string} opts.targetPath - The path to the file or directory to delete (relative to CWD).
 * @param {boolean} [opts.force] - If true, skips all confirmation prompts (default: false).
 * @param {string} [opts.prompt] - Custom text of the initial confirmation question (default: built-in question).
 * @param {boolean} [opts.silent] - If true, suppresses all console log output (default: false).
 * @returns {Promise<void>} A promise that resolves when the operation is finished or skipped.
 * @throws Will throw an error if the path is invalid or the path failed to be deleted.
 */
export async function deletePath(opts: DeletePathOptions): Promise<void> {
  const { targetPath, silent = false } = opts
  if (!await confirmAction(opts, `This will delete '${targetPath}'. Continue?`, `Removing '${targetPath}' skipped.`)) {
    return
  }

  const fullPath = resolveCheckedPath(targetPath)

  if (existsSync(fullPath)) {
    rmSync(fullPath, { recursive: true, force: true })

    if (!existsSync(fullPath)) {
      if (!silent) console.log(`'${targetPath}' deleted from project.`)
    } else {
      throw new Error(`Failed to delete '${targetPath}'.`)
    }
  } else {
    if (!silent) console.log(`'${targetPath}' does not exist — nothing to delete.`)
  }
}
