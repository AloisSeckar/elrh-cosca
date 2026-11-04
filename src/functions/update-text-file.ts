import type { UpdateTextFileOptions } from '../types/functions.js'
import { confirmAction, prepareTargetFile, writeUpdatedFile } from '../_private/file-helpers.js'

/**
 * Updates a text file by adding new rows.
 * 
 * @param {string} opts.targetPath - The path to the file or directory to work with (relative to CWD).
 * @param {string[]} opts.rowsToAdd - New rows to be added at the end of the file.
 * @param {boolean} [opts.allowDuplicates] - If true, rows are added even if identical lines already exist in the file (default: false).
 * @param {boolean} [opts.createMissing] - If true, the file is created when it does not exist, after confirmation unless `force` is set (default: false).
 * @param {boolean} [opts.force] - If true, skips all confirmation prompts (default: false).
 * @param {string} [opts.prompt] - Custom text of the initial confirmation question (default: built-in question).
 * @param {boolean} [opts.silent] - If true, suppresses all console log output (default: false).
 * @returns {Promise<void>} A promise that resolves when the operation is finished or skipped.
 * @throws Will throw an error if the path is invalid or the file does not exist (and `createMissing` is not set).
 */
export async function updateTextFile(opts: UpdateTextFileOptions): Promise<void> {
  const { targetPath, rowsToAdd, allowDuplicates = false, silent = false } = opts
  if (!await confirmAction(opts, `This will update '${targetPath}' file. Continue?`, `Updating '${targetPath}' skipped.`)) {
    return
  }

  const target = await prepareTargetFile(targetPath, opts)
  if (!target) {
    return
  }

  const lines = target.content === null ? [] : target.content.split(/\r?\n/)
  let modified = target.created

  for (const row of rowsToAdd) {
    if (allowDuplicates || !lines.includes(row)) {
      lines.push(row)
      modified = true
    }
  }

  writeUpdatedFile(targetPath, target.fullPath, lines.join('\n') + '\n', modified, target.created, silent)
}
