import type { UpdateTextFileOptions } from '../types/functions.js'
import { dirname, resolve } from 'node:path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { promptUser } from '../terminal/prompt-user.js'
import { checkPath } from '../_private/check-path.js'

/**
 * Updates a text file by adding new rows.
 * 
 * @param {UpdateTextFileOptions} opts - Options for this operation.
 * @param {string} opts.targetFile - The path to the text file to update (relative to CWD).
 * @param {string[]} opts.rowsToAdd - New rows to be added at the end of the file.
 * @param {boolean} opts.allowDuplicates - If true, rows will be added even if they already exist in the file.
 * @param {boolean} opts.createMissing - If true, the file will be created if it does not exist (after confirmation unless `force` is set).
 * @param {boolean} opts.force - Whether to force the update without prompting.
 * @param {string} opts.prompt - Custom prompt message displayed in terminal.
 * @returns {Promise<void>} An empty promise that resolves when the file is updated.
 * @throws Will throw an error if the path is invalid or the file does not exist (and `createMissing` is not set).
 */
export async function updateTextFile(opts: UpdateTextFileOptions): Promise<void> {
  const { targetFile, rowsToAdd, allowDuplicates = false, createMissing = false, force = false, prompt = '' } = opts
  const shouldUpdate = force || await promptUser({ question: prompt || `This will update '${targetFile}' file. Continue?` })
  if (shouldUpdate) {
    const check = checkPath(targetFile)
    if (!check.valid) {
      throw new Error(check.error)
    }

    const textFilePath = resolve(process.cwd(), targetFile)
    const created = !existsSync(textFilePath)
    if (created) {
      if (!createMissing) {
        throw new Error(`No '${targetFile}' found — cannot update its contents.`)
      }
      const shouldCreate = force || await promptUser({ question: `File '${targetFile}' does not exist. Create it?` })
      if (!shouldCreate) {
        console.log(`Creation of '${targetFile}' skipped.`)
        return
      }
    }

    const lines = created ? [] : readFileSync(textFilePath, 'utf8').split(/\r?\n/)

    let modified = created

    for (const row of rowsToAdd) {
      if (allowDuplicates || !lines.includes(row)) {
        lines.push(row)
        modified = true
      }
    }

    if (modified) {
      if (created) {
        mkdirSync(dirname(textFilePath), { recursive: true })
      }
      writeFileSync(textFilePath, lines.join('\n') + '\n', 'utf8')
      console.log(`'${targetFile}' file ${created ? 'created' : 'updated'}.`)
    } else {
      console.log(`'${targetFile}' file already up to date.`)
    }
  } else {
    console.log(`Updating '${targetFile}' skipped.`)
  }
}
