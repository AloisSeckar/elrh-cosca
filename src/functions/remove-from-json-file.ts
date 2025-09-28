import { resolve } from 'node:path'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { promptUser } from '../terminal/prompt-user.js'
import type { JsonObject } from '../types/json.js'

/**
 * Updates a JSON file by deleting a specified key.
 * 
 * @param {string} targetFile - The path to the JSON file to update (relative to CWD).
 * @param {string} jsonKey - The key in the JSON file to be deleted (may use dot notation for nested keys).
 * @param {boolean} force - Whether to force the update without prompting.
 * @param {string} prompt - Custom prompt message displayed in terminal.
 * @returns {Promise<void>} An empty promise that resolves when the file is updated.
 * @throws Will throw an error if the file does not exist or cannot be parsed as JSON.
 */
export async function removeFromJsonFile(
  targetFile: string, jsonKey: string,
  force: boolean = false, prompt: string = ''
): Promise<void> {
  const shouldUpdate = force || await promptUser(
    prompt || `This will delete '${jsonKey}' from '${targetFile}' file. Continue?`,
  )
  if (shouldUpdate) {
    const jsonFilePath = resolve(process.cwd(), targetFile)
    if (!existsSync(jsonFilePath)) {
      throw new Error(`No '${targetFile}' found in project root — cannot delete its keys.`)
    }

    const jsonRaw = readFileSync(jsonFilePath, 'utf8')
    let json
    try {
      json = JSON.parse(jsonRaw)
    } catch (err) {
      throw new Error(`Could not parse '${targetFile}' — cannot delete its keys.\n${err}`)
    }

    const oldJson = JSON.stringify(json, null, 2)
    json = removeKeyIfExists(json, jsonKey)
    const newJson = JSON.stringify(json, null, 2)

    if (oldJson !== newJson) {
      writeFileSync(jsonFilePath, newJson + '\n', 'utf8')
      console.log(`'${targetFile}' file updated.`)
    } else {
      console.log(`'${targetFile}' file already up to date.`)
    }
  } else {
    console.log(`Updating '${targetFile}' skipped.`)
  }
}

// recursive function to remove possibly nested key if exists in given JSON
// the key may use dot notation to indicate nesting, e.g. "a.b.c"
function removeKeyIfExists(json: JsonObject, jsonKey: string): JsonObject {
    const keys = jsonKey.split('.')

    if (keys.length === 1) {
        // try delete the bottom-most key if exists
        if (json.hasOwnProperty(jsonKey)) {
            delete json[jsonKey]
        }
    } else {
        // dive +1 deeper if nested object exists under first part of the composite key
        // must be an object, not a null, primitive or an array
        if (json.hasOwnProperty(keys[0]) ) {
            const nestedValue = json[keys[0]]
            if (nestedValue !== null && typeof nestedValue === 'object' && !Array.isArray(nestedValue)) {
                json[keys[0]] = removeKeyIfExists(nestedValue as JsonObject, keys.slice(1).join('.'))
            }
        }
    }

    return json
}