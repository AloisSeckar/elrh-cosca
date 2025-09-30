import { resolve } from 'node:path'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { promptUser } from '../terminal/prompt-user.js'
import { checkPath } from '../_private/check-path.js'

/**
 * Updates a text file by adding new rows.
 * 
 * @param {string} targetFile - The path to the text file to update (relative to CWD).
 * @param {string[]} rowsToAdd - New rows to be added at the end of the file.
 * @param {boolean} force - Whether to force the update without prompting.
 * @param {string} prompt - Custom prompt message displayed in terminal.
 * @returns {Promise<void>} An empty promise that resolves when the file is updated.
 * @throws Will throw an error if the path is invalid or the file does not exist.
 */
export async function updateTextFile(
    targetFile: string, rowsToAdd: string[], force: boolean = false, prompt: string = ''
): Promise<void> {
  const shouldUpdate = force || await promptUser(
    prompt || `This will update '${targetFile}' file. Continue?`,
  )
  if (shouldUpdate) {
    const check = checkPath(targetFile)
    if (!check.valid) {
      throw new Error(check.error)
    }

    const textFilePath = resolve(process.cwd(), targetFile)
    if (!existsSync(textFilePath)) {
      throw new Error(`No '${targetFile}' found in project root — cannot update its contents.`)
    }

    const textRaw = readFileSync(textFilePath, 'utf8')
    const lines = textRaw.split(/\r?\n/)

    let modified = false

    for (const row of rowsToAdd) {
      if (!lines.includes(row)) {
        lines.push(row)
        modified = true
      }
    }

    if (modified) {
      writeFileSync(textFilePath, lines.join('\n') + '\n', 'utf8')
      console.log(`'${targetFile}' file updated.`)
    } else {
      console.log(`'${targetFile}' file already up to date.`)
    }
  } else {
    console.log(`Updating '${targetFile}' skipped.`)
  }
}
