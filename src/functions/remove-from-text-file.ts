import type { RemoveFromTextFileOptions } from '../types/functions.js'
import { confirmAction, readTargetFile, writeUpdatedFile } from '../_private/file-helpers.js'

/**
 * Removes lines from a text file that include the given search text.
 * 
 * @param {string} opts.targetFile - The path to the text file to update (relative to CWD).
 * @param {string} opts.searchText - The text to search for; any line that includes this text will be removed.
 * @param {boolean} [opts.force] - If true, skips all confirmation prompts (default: false).
 * @param {string} [opts.prompt] - Custom text of the initial confirmation question (default: built-in question).
 * @param {boolean} [opts.silent] - If true, suppresses all console log output (default: false).
 * @returns {Promise<void>} A promise that resolves when the operation is finished or skipped.
 * @throws Will throw an error if the path is invalid or the file does not exist.
 */
export async function removeFromTextFile(opts: RemoveFromTextFileOptions): Promise<void> {
  const { targetFile, searchText, silent = false } = opts
  if (!await confirmAction(opts, `This will remove lines containing '${searchText}' from '${targetFile}' file. Continue?`, `Updating '${targetFile}' skipped.`)) {
    return
  }

  const { fullPath, content } = readTargetFile(targetFile, 'update its contents')
  const lines = content.split(/\r?\n/)
  const filtered = lines.filter(line => !line.includes(searchText))

  writeUpdatedFile(targetFile, fullPath, filtered.join('\n'), filtered.length !== lines.length, false, silent)
}
