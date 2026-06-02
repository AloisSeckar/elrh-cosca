import { resolve } from 'node:path'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { promptUser } from '../terminal/prompt-user.js'
import { checkPath } from '../_private/check-path.js'

/**
 * Removes lines from a text file that include the given search text.
 * 
 * @param {string} targetFile - The path to the text file to update (relative to CWD).
 * @param {string} searchText - The text to search for; any line that includes this text will be removed.
 * @param {boolean} force - Whether to force the update without prompting.
 * @param {string} prompt - Custom prompt message displayed in terminal.
 * @returns {Promise<void>} An empty promise that resolves when the file is updated.
 * @throws Will throw an error if the path is invalid or the file does not exist.
 */
export async function removeFromTextFile(
  targetFile: string, searchText: string,
  force: boolean = false, prompt: string = ''
): Promise<void> {
  const shouldUpdate = force || await promptUser(
    prompt || `This will remove lines containing '${searchText}' from '${targetFile}' file. Continue?`,
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

    const filtered = lines.filter(line => !line.includes(searchText))

    if (filtered.length !== lines.length) {
      writeFileSync(textFilePath, filtered.join('\n'), 'utf8')
      console.log(`'${targetFile}' file updated.`)
    } else {
      console.log(`'${targetFile}' file already up to date.`)
    }
  } else {
    console.log(`Updating '${targetFile}' skipped.`)
  }
}
