import type { RemoveFromJsonFileOptions } from '../types/functions.js'
import type { DataObject } from '../types/data.js'
import { confirmAction, readTargetFile, writeUpdatedFile } from '../_private/file-helpers.js'

/**
 * Updates a JSON file by deleting a specified key.
 * 
 * @param {string} opts.targetPath - The path to the file or directory to work with (relative to CWD).
 * @param {string} opts.jsonKey - The key in the JSON file to be deleted (may use dot notation for nested keys).
 * @param {boolean} [opts.force] - If true, skips all confirmation prompts (default: false).
 * @param {string} [opts.prompt] - Custom text of the initial confirmation question (default: built-in question).
 * @param {boolean} [opts.silent] - If true, suppresses all console log output (default: false).
 * @returns {Promise<void>} A promise that resolves when the operation is finished or skipped.
 * @throws Will throw an error if the path is invalid, the file does not exist or cannot be parsed as JSON.
 */
export async function removeFromJsonFile(opts: RemoveFromJsonFileOptions): Promise<void> {
  const { targetPath, jsonKey, silent = false } = opts
  if (!await confirmAction(opts, `This will delete '${jsonKey}' from '${targetPath}' file. Continue?`, `Updating '${targetPath}' skipped.`)) {
    return
  }

  const { fullPath, content } = readTargetFile(targetPath, 'delete its keys')
  let json
  try {
    json = JSON.parse(content)
  } catch (err) {
    throw new Error(`Could not parse '${targetPath}' — cannot delete its keys.\n${err}`)
  }

  const oldJson = JSON.stringify(json, null, 2)
  json = removeKeyIfExists(json, jsonKey)
  const newJson = JSON.stringify(json, null, 2)

  writeUpdatedFile(targetPath, fullPath, newJson + '\n', oldJson !== newJson, false, silent)
}

// recursive function to remove possibly nested key if exists in given JSON
// the key may use dot notation to indicate nesting, e.g. "a.b.c"
function removeKeyIfExists(json: DataObject, jsonKey: string): DataObject {
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
                json[keys[0]] = removeKeyIfExists(nestedValue as DataObject, keys.slice(1).join('.'))
            }
        }
    }

    return json
}