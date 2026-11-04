import type { RemoveFromTextFileOptions } from '../types/functions.js'
import { confirmAction, readTargetFile, writeUpdatedFile } from '../_private/file-helpers.js'

/**
 * Removes lines from a text file that include the given search text.
 * 
 * @param {string} opts.targetPath - The path to the file or directory to work with (relative to CWD).
 * @param {string} opts.searchText - The text to search for; any line that includes this text will be removed.
 * @param {boolean} [opts.force] - If true, skips all confirmation prompts (default: false).
 * @param {string} [opts.prompt] - Custom text of the initial confirmation question (default: built-in question).
 * @param {boolean} [opts.silent] - If true, suppresses all console log output (default: false).
 * @returns {Promise<void>} A promise that resolves when the operation is finished or skipped.
 * @throws Will throw an error if the path is invalid or the file does not exist.
 */
export async function removeFromTextFile(opts: RemoveFromTextFileOptions): Promise<void> {
  const { targetPath, searchText, silent = false } = opts
  if (!await confirmAction(opts, `This will remove lines containing '${searchText}' from '${targetPath}' file. Continue?`, `Updating '${targetPath}' skipped.`)) {
    return
  }

  const { fullPath, content } = readTargetFile(targetPath, 'update its contents')
  const lines = content.split(/\r?\n/)
  const filtered = lines.filter(line => !line.includes(searchText))

  writeUpdatedFile(targetPath, fullPath, filtered.join('\n'), filtered.length !== lines.length, false, silent)
}
