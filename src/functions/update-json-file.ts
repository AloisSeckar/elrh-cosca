import { resolve } from 'node:path'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { promptUser } from '../terminal/prompt-user.js'

// so-far only allows adding into existing key at the top level of the JSON tree
// e.g. "scripts" or "pnpm" in package.json
// TODO allow recursive updates on any level (think about using defu)

export async function updateJsonFile(
  pathToFile: string, jsonKey: string, newValues: Record<string | number | symbol, any>, force: boolean = false
): Promise<void> {
  const shouldUpdate = force || await promptUser(
    `This will update '${pathToFile}' file. Continue?`,
  )
  if (shouldUpdate) {
    const jsonFilePath = resolve(process.cwd(), pathToFile)
    if (!existsSync(jsonFilePath)) {
      console.warn(`No '${pathToFile}' found in project root — skipping updates.`)
      return
    }

    const jsonRaw = readFileSync(jsonFilePath, 'utf8')
    let json
    try {
      json = JSON.parse(jsonRaw)
    } catch {
      console.error(`Could not parse '${pathToFile}' — skipping updates.`)
      return
    }

    json[jsonKey] = json[jsonKey] || {}

    let modified = false

    for (const [key, value] of Object.entries(newValues)) {
      if (json[jsonKey][key] !== value) {
        json[jsonKey][key] = value
        modified = true
      }
    }

    if (modified) {
      writeFileSync(jsonFilePath, JSON.stringify(json, null, 2) + '\n', 'utf8')
      console.log(`'${pathToFile}' file updated.`)
    } else {
      console.log(`'${pathToFile}' file already up to date.`)
    }
  } else {
    console.log(`Updating '${pathToFile}' skipped.`)
  }
}
