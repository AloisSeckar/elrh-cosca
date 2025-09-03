import { resolve } from 'node:path'
import { existsSync, copyFileSync } from 'node:fs'
import { promptUser } from '../utils/prompt-user'
import { parseTemplatePath, resolvePackagePath } from '../utils/resolve-package'

export async function createFileFromTemplate(
  templateFile: string, targetFile: string, force: boolean = false
): Promise<void> {
  const shouldCreate = force || await promptUser(
    `This will create '${targetFile}' file. Continue?`,
  )
  if (shouldCreate) {
    const { pkg, file } = parseTemplatePath(templateFile);
    const packagePath = resolvePackagePath(pkg);
    const templatePath = resolve(packagePath, file)

    const targetPath = resolve(process.cwd(), targetFile)

    if (!existsSync(templatePath)) {
      console.error(`Template file not found at ${templatePath}`)
      process.exit(1)
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
