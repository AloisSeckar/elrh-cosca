import type { UpdateJsonFileOptions } from '../types/functions.js'
import type { DataValue } from '../types/data.js'
import { isDeepStrictEqual } from 'node:util'
import {
  confirmAction, prepareTargetFile, PROTOTYPE_POLLUTION_KEYS, writeUpdatedFile,
} from '../_private/file-helpers.js'

/**
 * Updates a JSON file by setting a key with new value(s). The key can be nested and can alter between primitives to objects and arrays as needed.
 * 
 * @param {string} opts.targetFile - The path to the JSON file to update (relative to CWD).
 * @param {string} opts.jsonKey - The key in the JSON file to update (can be new or existing; may use dot notation for nested keys - missing or non-object intermediate levels are replaced with objects).
 * @param {DataValue} opts.patch - The value for the specified key. Objects are shallow-merged into the existing value (a non-object existing value is replaced), arrays are appended to the existing value by default (duplicates are skipped, a non-array existing value becomes the first item), other values (primitives, null) replace it.
 * @param {boolean} [opts.createMissing] - If true, the file is created when it does not exist, after confirmation unless `force` is set (default: false).
 * @param {boolean} [opts.overwriteArrays] - If true, an array patch replaces the existing value instead of appending (default: false).
 * @param {boolean} [opts.force] - If true, skips all confirmation prompts (default: false).
 * @param {string} [opts.prompt] - Custom text of the initial confirmation question (default: built-in question).
 * @param {boolean} [opts.silent] - If true, suppresses all console log output (default: false).
 * @returns {Promise<void>} A promise that resolves when the operation is finished or skipped.
 * @throws Will throw an error if the path or the key is invalid, the file does not exist (and `createMissing` is not set) or cannot be parsed as JSON.
 */
export async function updateJsonFile(opts: UpdateJsonFileOptions): Promise<void> {
  const { targetFile, jsonKey, patch, overwriteArrays = false, silent = false } = opts
  if (!await confirmAction(opts, `This will update '${targetFile}' file. Continue?`, `Updating '${targetFile}' skipped.`)) {
    return
  }

  const keys = jsonKey.split('.')
  if (keys.some(key => key === '' || PROTOTYPE_POLLUTION_KEYS.has(key))) {
    throw new Error(`Invalid JSON key '${jsonKey}'.`)
  }

  const target = await prepareTargetFile(targetFile, opts)
  if (!target) {
    return
  }

  const jsonRaw = target.content ?? '{}'
  let json
  try {
    json = JSON.parse(jsonRaw)
  } catch (err) {
    throw new Error(`Could not parse '${targetFile}' — cannot update its contents.\n${err}`)
  }

  let modified = target.created

  const targetKey = keys.pop()!
  let parent = json
  for (const key of keys) {
    const nested = parent[key]
    if (!isJsonObject(nested)) {
      parent[key] = {}
      modified = true
    }
    parent = parent[key]
  }

  if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) {
    modified = setValue(parent, targetKey, patch, overwriteArrays) || modified
  } else {
    if (!isJsonObject(parent[targetKey])) {
      // non-object values cannot be merged into, so they are replaced
      parent[targetKey] = {}
      modified = true
    }
    for (const [key, value] of Object.entries(patch)) {
      modified = setValue(parent[targetKey], key, value, overwriteArrays) || modified
    }
  }

  writeUpdatedFile(targetFile, target.fullPath, JSON.stringify(json, null, 2) + '\n', modified, target.created, silent)
}

function setValue(obj: Record<string, unknown>, key: string, value: DataValue, overwriteArrays: boolean): boolean {
  const exists = Object.prototype.hasOwnProperty.call(obj, key)
  const current = obj[key]
  if (!overwriteArrays && Array.isArray(value) && exists && current !== null) {
    const items = Array.isArray(current) ? current : [current]
    let added = false
    for (const item of value) {
      if (!items.some(existing => isDeepStrictEqual(existing, item))) {
        items.push(item)
        added = true
      }
    }
    if (added) {
      obj[key] = items
    }
    return added
  }
  if (exists && isDeepStrictEqual(current, value)) {
    return false
  }
  obj[key] = value
  return true
}

function isJsonObject(value: unknown): boolean {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
