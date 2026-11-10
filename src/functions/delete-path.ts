import type { FileOperationOptions } from '../types/functions.js'
import { existsSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { confirmAction, resolveCheckedPath } from '../_private/file-helpers.js'
import { showDebug, showMessage } from '../main.js'

/**
 * Deletes a file or a directory (recursively) from FS.
 * 
 * @param {string} opts.targetPath - The path to the file or directory to work with (relative to CWD).
 * @param {boolean} [opts.force] - If true, skips all confirmation prompts (default: false).
 * @param {string} [opts.prompt] - Custom text of the initial confirmation question (default: built-in question).
 * @param {boolean} [opts.silent] - If true, suppresses all console log output (default: false).
 * @returns {Promise<void>} A promise that resolves when the operation is finished or skipped.
 * @throws Will throw an error if the path is invalid, points to CWD itself or failed to be deleted.
 */
export async function deletePath(opts: FileOperationOptions): Promise<void> {
  const { targetPath, silent = false } = opts
  if (!await confirmAction(opts, `This will delete '${targetPath}'. Continue?`, `Removing '${targetPath}' skipped.`)) {
    return
  }

  const fullPath = resolveCheckedPath(targetPath)
  if (fullPath === resolve(process.cwd())) {
    throw new Error(`Deleting the working directory is not allowed: '${targetPath}'`)
  }

  if (existsSync(fullPath)) {
    rmSync(fullPath, { recursive: true, force: true })

    if (!existsSync(fullPath)) {
      if (!silent) showMessage({ message: `'${targetPath}' deleted from project.`, color: 'blue' })
    } else {
      throw new Error(`Failed to delete '${targetPath}'.`)
    }
  } else {
    if (!silent) showDebug(`'${targetPath}' does not exist — nothing to delete.`)
  }
}
