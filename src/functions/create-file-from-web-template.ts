import { resolve } from 'node:path'
import { existsSync, writeFileSync } from 'node:fs'
import { promptUser } from '../terminal/prompt-user'
import { fetchFile } from '../_private/fetch-file'

/**
 * Creates a new copy of given file from a web template.
 * 
 * @param {string} url - The URL to the template file (must be accessible via `node:https.get` and return raw text data).
 * @param {string} targetFile - The path to the target file to create (relative to CWD). Can overwrite existing files if confirmed.
 * @param {boolean} force - Whether to force creation without prompting.
 * @param {string} prompt - Custom prompt message displayed in terminal.
 * @returns {Promise<void>} An empty promise that resolves when the file is created.
 * @throws Will throw an error if the remote template cannot be fetched.
 */
export async function createFileFromWebTemplate(
  url: string, targetFile: string, force: boolean = false, prompt: string = ''
): Promise<void> {
  const shouldCreate = force || await promptUser(
    prompt || `This will create '${targetFile}' file. Continue?`,
  )
  if (shouldCreate) {

    let fileContent: string
    try {
      fileContent = await fetchFile(url)
    } catch (err) {
      throw new Error(`Failed to fetch template from external source ${url}:\n${err}`)
    }

    const targetPath = resolve(process.cwd(), targetFile)

    if (existsSync(targetPath)) {
      const shouldOverwrite = force || await promptUser(
        `File '${targetFile}' already exists. Overwrite?`,
      )
      if (!shouldOverwrite) {
        console.log('Aborted.')
        return
      }
    }

    writeFileSync(targetPath, fileContent, 'utf8')
    console.log(`New file '${targetFile}' successfully created.`)
  } else {
    console.log(`Creation of '${targetFile}' skipped.`)
  }
}
