import type { UpdateJsonFileOptions } from '../types/functions.js'
import type { DataValue } from '../types/data.js'
import { isDeepStrictEqual } from 'node:util'
import {
  confirmAction, prepareTargetFile, PROTOTYPE_POLLUTION_KEYS, writeUpdatedFile,
} from '../_private/file-helpers.js'
import type { JsoncArray, JsoncDocument, JsoncObject } from '../_private/jsonc.js'
import {
  createJsoncNode, getObjectNode, isJsoncArray, isJsoncObject, isJsoncPrimitive,
  jsoncToValue, parseJsoncDocument, setObjectNode, stringifyJsoncDocument,
} from '../_private/jsonc.js'
import { parseKey } from '../_private/parse-key.js'

/**
 * Updates a JSON/JSONC file by setting a key with new value(s). The key can be nested and can alter between primitives to objects and arrays as needed. Existing comments are preserved.
 * 
 * @param {string} opts.targetPath - The path to the file or directory to work with (relative to CWD).
 * @param {string} opts.jsonKey - The key in the JSON file to update (can be new or existing; may use dot notation for nested keys, escape a literal dot as `\.` and a literal backslash as `\\` - missing or non-object intermediate levels are replaced with objects).
 * @param {DataValue} opts.patch - The value for the specified key. Objects are shallow-merged into the existing value (a non-object existing value is replaced), arrays are appended to the existing value by default (duplicates are skipped, a non-array existing value becomes the first item), other values (primitives, null) replace it.
 * @param {boolean} [opts.createMissing] - If true, the file is created when it does not exist, after confirmation unless `force` is set (default: false).
 * @param {boolean} [opts.overwriteArrays] - If true, an array patch replaces the existing value instead of appending (default: false).
 * @param {boolean} [opts.force] - If true, skips all confirmation prompts (default: false).
 * @param {string} [opts.prompt] - Custom text of the initial confirmation question (default: built-in question).
 * @param {boolean} [opts.silent] - If true, suppresses all console log output (default: false).
 * @returns {Promise<void>} A promise that resolves when the operation is finished or skipped.
 * @throws Will throw an error if the path or the key is invalid, the file does not exist (and `createMissing` is not set), cannot be parsed as JSON/JSONC or its root is not an object.
 */
export async function updateJsonFile(opts: UpdateJsonFileOptions): Promise<void> {
  const { targetPath, jsonKey, patch, overwriteArrays = false, silent = false } = opts
  if (!await confirmAction(opts, `This will update '${targetPath}' file. Continue?`, `Updating '${targetPath}' skipped.`)) {
    return
  }

  const keys = parseKey(jsonKey)
  if (keys.some(key => key === '' || PROTOTYPE_POLLUTION_KEYS.has(key))) {
    throw new Error(`Invalid JSON key '${jsonKey}'.`)
  }
  if (isPlainObject(patch) && Object.keys(patch).some(key => PROTOTYPE_POLLUTION_KEYS.has(key))) {
    throw new Error(`Invalid JSON key in patch of '${jsonKey}'.`)
  }

  const target = await prepareTargetFile(targetPath, opts)
  if (!target) {
    return
  }

  const jsonRaw = target.content ?? '{}'
  let doc: JsoncDocument
  try {
    doc = parseJsoncDocument(jsonRaw)
  } catch (err) {
    throw new Error(`Could not parse '${targetPath}' — cannot update its contents.\n${err}`)
  }

  if (!isJsoncObject(doc.root)) {
    throw new Error(`Root of '${targetPath}' is not a JSON object — cannot update its contents.`)
  }

  let modified = target.created

  const targetKey = keys.pop()!
  let parent: JsoncObject = doc.root
  for (const key of keys) {
    const nested = getObjectNode(parent, key)
    if (isJsoncObject(nested)) {
      parent = nested
    } else {
      const obj = createJsoncNode({}) as JsoncObject
      setObjectNode(parent, key, obj)
      parent = obj
      modified = true
    }
  }

  if (!isPlainObject(patch)) {
    modified = setValue(parent, targetKey, patch, overwriteArrays) || modified
  } else {
    let targetNode = getObjectNode(parent, targetKey)
    if (!isJsoncObject(targetNode)) {
      // non-object values cannot be merged into, so they are replaced
      targetNode = createJsoncNode({}) as JsoncObject
      setObjectNode(parent, targetKey, targetNode)
      modified = true
    }
    for (const [key, value] of Object.entries(patch)) {
      modified = setValue(targetNode, key, value, overwriteArrays) || modified
    }
  }

  writeUpdatedFile(targetPath, target.fullPath, modified ? stringifyJsoncDocument(doc) : '', modified, target.created, silent)
}

function setValue(obj: JsoncObject, key: string, value: DataValue, overwriteArrays: boolean): boolean {
  const current = getObjectNode(obj, key)
  if (!overwriteArrays && Array.isArray(value) && current !== undefined && !(isJsoncPrimitive(current) && current.value === null)) {
    const items: unknown[] = isJsoncArray(current) ? (jsoncToValue(current) as unknown[]) : [jsoncToValue(current)]
    const added: DataValue[] = []
    for (const item of value) {
      if (!items.some(existing => isDeepStrictEqual(existing, item))) {
        items.push(item)
        added.push(item)
      }
    }
    if (added.length === 0) {
      return false
    }
    let arr: JsoncArray
    if (isJsoncArray(current)) {
      arr = current
    } else {
      arr = { kind: 'array', items: [current] }
      setObjectNode(obj, key, arr)
    }
    for (const item of added) {
      arr.items.push(createJsoncNode(item))
    }
    return true
  }
  if (current !== undefined && isDeepStrictEqual(jsoncToValue(current), value)) {
    return false
  }
  setObjectNode(obj, key, createJsoncNode(value))
  return true
}

function isPlainObject(value: unknown): value is Record<string, DataValue> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
