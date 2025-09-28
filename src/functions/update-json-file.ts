import { resolve } from 'node:path'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { promptUser } from '../terminal/prompt-user.js'

// so-far only allows adding into existing key at the top level of the JSON tree
// e.g. "scripts" or "pnpm" in package.json
// TODO allow recursive updates on any level (think about using defu)

type JsonPrimitive = string | number | boolean | null
type JsonObject = { [key: string]: JsonValue }
type JsonArray = JsonValue[]
type JsonValue = JsonPrimitive | JsonObject | JsonArray

/**
 * Updates a JSON file by modifying a specific key with new values.
 * 
 * @param {string} pathToFile - The path to the JSON file to update (relative to CWD).
 * @param {string} jsonKey - The key in the JSON file to update (can be new or existing).
 * @param {JsonPrimitive} patch - The new values to set for the specified key.
 * @param {boolean} force - Whether to force the update without prompting.
 * @param {string} prompt - Custom prompt message displayed in terminal.
 * @returns {Promise<void>} An empty promise that resolves when the file is updated.
 * @throws Will throw an error if the file does not exist or cannot be parsed as JSON.
 */
export async function updateJsonFile(
  pathToFile: string, jsonKey: string, patch: JsonValue, 
  force: boolean = false, prompt: string = ''
): Promise<void> {
  const shouldUpdate = force || await promptUser(
    prompt || `This will update '${pathToFile}' file. Continue?`,
  )
  if (shouldUpdate) {
    const jsonFilePath = resolve(process.cwd(), pathToFile)
    if (!existsSync(jsonFilePath)) {
      throw new Error(`No '${pathToFile}' found in project root — cannot update its contents.`)
    }

    const jsonRaw = readFileSync(jsonFilePath, 'utf8')
    let json
    try {
      json = JSON.parse(jsonRaw)
    } catch (err) {
      throw new Error(`Could not parse '${pathToFile}' — cannot update its contents.\n${err}`)
    }

    json[jsonKey] = json[jsonKey] || {}

    let modified = false


    if (patch === null || typeof patch === 'string' || 
      typeof patch === 'number' || typeof patch === 'boolean' || Array.isArray(patch)) {
      if (json[jsonKey] !== patch) {
        json[jsonKey] = patch
        modified = true
      }
    } else {
      for (const [key, value] of Object.entries(patch)) {
        if (json[jsonKey][key] !== value) {
          json[jsonKey][key] = value
          modified = true
        }
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
