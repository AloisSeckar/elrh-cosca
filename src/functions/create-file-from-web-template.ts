import type { CreateFileFromWebTemplateOptions } from '../types/functions.js'
import { dirname, resolve } from 'node:path'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { promptUser } from '../terminal/prompt-user'
import { fetchFile } from '../_private/fetch-file'
import { checkPath } from '../_private/check-path'

/**
 * Creates a new file as a copy of a template file downloaded from the web.
 * 
 * @param {CreateFileFromWebTemplateOptions} opts - Options for this operation.
 * @param {string} opts.url - The URL of the template file (must be accessible via `node:https.get` and return raw text data).
 * @param {string} opts.targetFile - The path to the file to create (relative to CWD). Existing file is overwritten after confirmation.
 * @param {boolean} [opts.force] - If true, skips all confirmation prompts (default: false).
 * @param {string} [opts.prompt] - Custom text of the initial confirmation question (default: built-in question).
 * @returns {Promise<void>} A promise that resolves when the operation is finished or skipped.
 * @throws Will throw an error if the path is invalid, the template file cannot be fetched or the target file failed to be created.
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
