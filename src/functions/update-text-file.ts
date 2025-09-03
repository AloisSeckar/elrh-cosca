import { resolve } from 'node:path'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { promptUser } from '../terminal/prompt-user.js'

export async function updateTextFile(
    pathToFile: string, rowsToAdd: string[], force: boolean = false
): Promise<void> {
  const shouldUpdate = force || await promptUser(
    `This will update '${pathToFile}' file. Continue?`,
  )
  if (shouldUpdate) {
    const textFilePath = resolve(process.cwd(), pathToFile)
    if (!existsSync(textFilePath)) {
      console.warn(`No '${pathToFile}' found in project root — skipping updates.`)
      return
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
      console.log(`'${pathToFile}' file updated.`)
    } else {
      console.log(`'${pathToFile}' file already up to date.`)
    }
  } else {
    console.log(`Updating '${pathToFile}' skipped.`)
  }
}
