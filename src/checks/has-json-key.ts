import { resolve } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import type { JsonObject } from '../types/json.js'
import { checkPath } from '../_private/check-path.js'

/**
 * Checks if a JSON file contains specified key.
 * 
 * @param {string} targetFile - The path to the JSON file to be checked (relative to CWD).
 * @param {string} jsonKey - The key in the JSON file to be checked for existence (may use dot notation for nested keys).
 * @returns {boolean} True if the key exists in target file, false otherwise.
 * @throws Will throw an error if the file does not exist or cannot be parsed as JSON.
 */
export function hasJsonKey(
  targetFile: string, jsonKey: string
): boolean {
  const check = checkPath(targetFile)
  if (!check.valid) {
    throw new Error(check.error)
  }

  const jsonFilePath = resolve(process.cwd(), targetFile)
  if (!existsSync(jsonFilePath)) {
    throw new Error(`No '${targetFile}' found in project root — cannot check its keys.`)
  }
  
  const jsonRaw = readFileSync(jsonFilePath, 'utf8')
  let json
  try {
    json = JSON.parse(jsonRaw)
  } catch (err) {
    throw new Error(`Could not parse '${targetFile}' — cannot check its keys.\n${err}`)
  }

  return keyExists(json, jsonKey)
}

// recursive function to check possibly nested key if exists in given JSON
// the key may use dot notation to indicate nesting, e.g. "a.b.c"
function keyExists(json: JsonObject, jsonKey: string): boolean {
    const keys = jsonKey.split('.')

    if (keys.length === 1) {
        // check the bottom-most key if exists
        return json.hasOwnProperty(jsonKey)
    } else {
        // dive +1 deeper if nested object exists under first part of the composite key
        // must be an object, not a null, primitive or an array
        if (json.hasOwnProperty(keys[0]) ) {
            const nestedValue = json[keys[0]]
            if (nestedValue !== null && typeof nestedValue === 'object' && !Array.isArray(nestedValue)) {
                return keyExists(nestedValue as JsonObject, keys.slice(1).join('.'))
            }
        }
    }

    // key doesn't exist
    return false
}
