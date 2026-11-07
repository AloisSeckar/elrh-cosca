import type { HasJsonKeyOptions } from '../types/functions.js'
import type { DataObject } from '../types/data.js'
import { readTargetFile } from '../_private/file-helpers.js'

/**
 * Checks if a JSON file contains specified key.
 * 
 * @param {string} opts.targetPath - The path to the file or directory to work with (relative to CWD).
 * @param {string} opts.jsonKey - The key in the JSON file to be checked for existence (may use dot notation for nested keys).
 * @returns {boolean} True if the key exists in target file, false otherwise.
 * @throws Will throw an error if the path is invalid, file does not exist or cannot be parsed as JSON.
 */
export function hasJsonKey(opts: HasJsonKeyOptions): boolean {
  const { targetPath, jsonKey } = opts
  const { content } = readTargetFile(targetPath, 'check its keys')
  
  let json
  try {
    json = JSON.parse(content)
  } catch (err) {
    throw new Error(`Could not parse '${targetPath}' — cannot check its keys.\n${err}`)
  }

  return keyExists(json, jsonKey)
}

// recursive function to check possibly nested key if exists in given JSON
// the key may use dot notation to indicate nesting, e.g. "a.b.c"
function keyExists(json: DataObject, jsonKey: string): boolean {
    // null, primitive or array root has no keys
    if (json === null || typeof json !== 'object' || Array.isArray(json)) {
        return false
    }

    const keys = jsonKey.split('.')

    if (keys.length === 1) {
        // check the bottom-most key if exists
        return Object.prototype.hasOwnProperty.call(json, jsonKey)
    } else {
        // dive +1 deeper if nested object exists under first part of the composite key
        // must be an object, not a null, primitive or an array
        if (Object.prototype.hasOwnProperty.call(json, keys[0])) {
            const nestedValue = json[keys[0]]
            if (nestedValue !== null && typeof nestedValue === 'object' && !Array.isArray(nestedValue)) {
                return keyExists(nestedValue as DataObject, keys.slice(1).join('.'))
            }
        }
    }

    // key doesn't exist
    return false
}
