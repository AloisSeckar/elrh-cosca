import { resolve } from 'node:path'
import { existsSync, copyFileSync } from 'node:fs'
import { promptUser } from '../terminal/prompt-user'
import { parseQualifiedPath } from '../utils/parse-qualified-path'
import { resolvePackagePath } from '../utils/resolve-package-path'

export async function createFileFromTemplate(
  templateFile: string, targetFile: string, force: boolean = false
): Promise<void> {
  const shouldCreate = force || await promptUser(
    `This will create '${targetFile}' file. Continue?`,
  )
  if (shouldCreate) {
    const { pkg, file } = parseQualifiedPath(templateFile);
    const packagePath = resolvePackagePath(pkg);
    const templatePath = resolve(packagePath, file)

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
        process.exit(0)
      }
    }

    copyFileSync(templatePath, targetPath)
    console.log(`New file '${targetFile}' successfully created.`)
  } else {
    console.log(`Creation of '${targetFile}' skipped.`)
  }
}
