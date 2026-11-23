import type { HasJsonKeyOptions } from '../types/functions.js'
import { readTargetFile } from '../_private/file-helpers.js'
import { getObjectNode, isJsoncObject, parseJsoncDocument } from '../_private/jsonc.js'
import type { JsoncNode } from '../_private/jsonc.js'
import { parseKey } from '../_private/parse-key.js'

/**
 * Checks if a JSON/JSONC file contains specified key.
 * 
 * @param {string} opts.targetPath - The path to the file or directory to work with (relative to CWD).
 * @param {string} opts.jsonKey - The key in the JSON file to be checked for existence (may use dot notation for nested keys; escape a literal dot as `\.` and a literal backslash as `\\`).
 * @returns {boolean} True if the key exists in target file, false otherwise.
 * @throws Will throw an error if the path is invalid, file does not exist or cannot be parsed as JSON/JSONC.
 */
export function hasJsonKey(opts: HasJsonKeyOptions): boolean {
  const { targetPath, jsonKey } = opts
  const { content } = readTargetFile(targetPath, 'check its keys')
  
  let doc
  try {
    doc = parseJsoncDocument(content)
  } catch (err) {
    throw new Error(`Could not parse '${targetPath}' — cannot check its keys.\n${err}`)
  }

  return keyExists(doc.root, parseKey(jsonKey))
}

// checks if a possibly nested key exists in the given JSONC node
function keyExists(node: JsoncNode | undefined, keys: string[]): boolean {
  let current: JsoncNode | undefined = node
  for (const key of keys) {
    if (!isJsoncObject(current)) {
      return false
    }
    current = getObjectNode(current, key)
    if (current === undefined) {
      return false
    }
  }
  return true
}
