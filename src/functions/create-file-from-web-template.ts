import type { CreateFileFromWebTemplateOptions } from '../types/functions.js'
import { dirname, resolve } from 'node:path'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { promptUser } from '../terminal/prompt-user'
import { fetchFile } from '../_private/fetch-file'
import { checkPath } from '../_private/check-path'

/**
 * Creates a new copy of given file from a web template.
 * 
 * @param {CreateFileFromWebTemplateOptions} opts - Options for this operation.
 * @param {string} opts.url - The URL to the template file (must be accessible via `node:https.get` and return raw text data).
 * @param {string} opts.targetFile - The path to the target file to create (relative to CWD). Can overwrite existing files if confirmed.
 * @param {boolean} opts.force - Whether to force creation without prompting.
 * @param {string} opts.prompt - Custom prompt message displayed in terminal.
 * @returns {Promise<void>} An empty promise that resolves when the file is created.
 * @throws Will throw an error if the path is invalid, the remote template cannot be fetched or the target file failed to be created.
 */
export async function createFileFromWebTemplate(opts: CreateFileFromWebTemplateOptions): Promise<void> {
  const { url, targetFile, force = false, prompt = '' } = opts
  const shouldCreate = force || await promptUser({ question: prompt || `This will create '${targetFile}' file. Continue?` })
  if (shouldCreate) {

    let fileContent: string
    try {
      fileContent = await fetchFile(url)
    } catch (err) {
      throw new Error(`Failed to fetch template from external source ${url}:\n${err}`)
    }

    const check = checkPath(targetFile)
    if (!check.valid) {
      throw new Error(check.error)
    }

    const targetPath = resolve(process.cwd(), targetFile)

    if (existsSync(targetPath)) {
      const shouldOverwrite = force || await promptUser({ question: `File '${targetFile}' already exists. Overwrite?` })
      if (!shouldOverwrite) {
        console.log('Aborted.')
        return
      }
    }

    const targetDir = dirname(targetPath)
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true })
    }

    writeFileSync(targetPath, fileContent, 'utf8')

    if (existsSync(targetPath)) {
      console.log(`New file '${targetFile}' successfully created.`)
    } else {
      throw new Error(`Failed to create '${targetFile}'.`)
    }
  } else {
    console.log(`Creation of '${targetFile}' skipped.`)
  }
}
