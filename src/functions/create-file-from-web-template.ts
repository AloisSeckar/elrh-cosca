import { resolve } from 'node:path'
import { existsSync, writeFileSync } from 'node:fs'
import { promptUser } from '../terminal/prompt-user'
import { fetchFile } from '../_private/fetch-file'

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
