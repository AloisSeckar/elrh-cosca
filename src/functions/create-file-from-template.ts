import type { CreateFileFromTemplateOptions } from '../types/functions.js'
import { dirname, resolve } from 'node:path'
import { existsSync, copyFileSync, mkdirSync } from 'node:fs'
import { promptUser } from '../terminal/prompt-user'
import { parseQualifiedPath } from '../utils/parse-qualified-path'
import { resolvePackagePath } from '../utils/resolve-package-path'
import { checkPath } from '../_private/check-path'

/**
 * Creates a new copy of given file from a local template.
 * 
 * @param {CreateFileFromTemplateOptions} opts - Options for this operation.
 * @param {string} opts.templateFile - The path to the template file (prefixed with package name).
 * @param {string} opts.targetFile - The path to the target file to create (relative to CWD). Can overwrite existing files if confirmed.
 * @param {boolean} opts.force - Whether to force creation without prompting.
 * @param {string} opts.prompt - Custom prompt message displayed in terminal.
 * @returns {Promise<void>} An empty promise that resolves when the file is created.
 * @throws Will throw an error if the path is invalid, the template file cannot be found or the target file failed to be created.
 */
export async function createFileFromTemplate(opts: CreateFileFromTemplateOptions): Promise<void> {
  const { templateFile, targetFile, force = false, prompt = '' } = opts
  const shouldCreate = force || await promptUser({ question: prompt || `This will create '${targetFile}' file. Continue?` })
  if (shouldCreate) {
    const { pkg, file } = parseQualifiedPath({ path: templateFile });
    const packagePath = resolvePackagePath({ packageName: pkg });
    const templatePath = resolve(packagePath, file)

    const check = checkPath(targetFile)
    if (!check.valid) {
      throw new Error(check.error)
    }

    const targetPath = resolve(process.cwd(), targetFile)

    if (!existsSync(templatePath)) {
      throw new Error(`Template file not found at ${templatePath}`)
    }

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

    copyFileSync(templatePath, targetPath)

    if (existsSync(targetPath)) {
      console.log(`New file '${targetFile}' successfully created.`)
    } else {
      throw new Error(`Failed to create '${targetFile}'.`)
    }
  } else {
    console.log(`Creation of '${targetFile}' skipped.`)
  }
}
