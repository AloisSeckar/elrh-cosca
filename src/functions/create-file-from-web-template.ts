import type { CreateFileFromWebTemplateOptions } from '../types/functions.js'
import { writeFileSync } from 'node:fs'
import { fetchFile } from '../_private/fetch-file'
import { confirmAction, resolveCheckedPath, writeCreatedFile } from '../_private/file-helpers.js'

/**
 * Creates a new file as a copy of a template file downloaded from the web.
 * 
 * @param {string} opts.url - The URL of the template file (must be accessible via `node:https.get`; content is copied byte-for-byte; HTTPS redirects are followed).
 * @param {string} opts.targetPath - The path to the file or directory to work with (relative to CWD).
 * @param {boolean} [opts.force] - If true, skips all confirmation prompts (default: false).
 * @param {string} [opts.prompt] - Custom text of the initial confirmation question (default: built-in question).
 * @param {boolean} [opts.silent] - If true, suppresses all console log output (default: false).
 * @returns {Promise<void>} A promise that resolves when the operation is finished or skipped.
 * @throws Will throw an error if the path is invalid, the template file cannot be fetched or the target file failed to be created.
 */
export async function createFileFromWebTemplate(opts: CreateFileFromWebTemplateOptions): Promise<void> {
  const { url, targetPath } = opts
  if (!await confirmAction(opts, `This will create '${targetPath}' file. Continue?`, `Creation of '${targetPath}' skipped.`)) {
    return
  }

  let fileContent: Buffer
  try {
    fileContent = await fetchFile(url)
  } catch (err) {
    throw new Error(`Failed to fetch template from external source ${url}:\n${err}`)
  }

  const fullPath = resolveCheckedPath(targetPath)
  await writeCreatedFile(targetPath, fullPath, () => writeFileSync(fullPath, fileContent), opts)
}
