import { dirname, resolve } from 'node:path'
import { existsSync, copyFileSync, mkdirSync } from 'node:fs'
import { promptUser } from '../terminal/prompt-user'
import { parseQualifiedPath } from '../utils/parse-qualified-path'
import { resolvePackagePath } from '../utils/resolve-package-path'
import { checkPath } from '../_private/check-path'

/**
 * Creates a new copy of given file from a local template.
 * 
 * @param {string} templateFile - The path to the template file (prefixed with package name).
 * @param {string} targetFile - The path to the target file to create (relative to CWD). Can overwrite existing files if confirmed.
 * @param {boolean} force - Whether to force creation without prompting.
 * @param {string} prompt - Custom prompt message displayed in terminal.
 * @returns {Promise<void>} An empty promise that resolves when the file is created.
 * @throws Will throw an error if the template file cannot be found or the target file failed to be created.
 */
export async function createFileFromTemplate(
  templateFile: string, targetFile: string, force: boolean = false, prompt: string = ''
): Promise<void> {
  const shouldCreate = force || await promptUser(
    prompt || `This will create '${targetFile}' file. Continue?`,
  )
  if (shouldCreate) {
    const { pkg, file } = parseQualifiedPath(templateFile);
    const packagePath = resolvePackagePath(pkg);
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
      const shouldOverwrite = force || await promptUser(
        `File '${targetFile}' already exists. Overwrite?`,
      )
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
