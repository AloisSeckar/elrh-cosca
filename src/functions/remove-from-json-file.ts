import type { RemoveFromJsonFileOptions } from '../types/functions.js'
import { confirmAction, readTargetFile, writeUpdatedFile } from '../_private/file-helpers.js'
import {
  deleteObjectKey, getObjectNode, isJsoncObject,
  parseJsoncDocument, stringifyJsoncDocument,
} from '../_private/jsonc.js'
import { parseKey } from '../_private/parse-key.js'

/**
 * Updates a JSON/JSONC file by deleting a specified key. Existing comments on untouched keys are preserved.
 * 
 * @param {string} opts.targetPath - The path to the file or directory to work with (relative to CWD).
 * @param {string} opts.jsonKey - The key in the JSON file to be deleted (may use dot notation for nested keys; escape a literal dot as `\.` and a literal backslash as `\\`).
 * @param {boolean} [opts.force] - If true, skips all confirmation prompts (default: false).
 * @param {string} [opts.prompt] - Custom text of the initial confirmation question (default: built-in question).
 * @param {boolean} [opts.silent] - If true, suppresses all console log output (default: false).
 * @returns {Promise<void>} A promise that resolves when the operation is finished or skipped.
 * @throws Will throw an error if the path is invalid, the file does not exist or cannot be parsed as JSON/JSONC.
 */
export async function removeFromJsonFile(opts: RemoveFromJsonFileOptions): Promise<void> {
  const { targetPath, jsonKey, silent = false } = opts
  if (!await confirmAction(opts, `This will delete '${jsonKey}' from '${targetPath}' file. Continue?`, `Updating '${targetPath}' skipped.`)) {
    return
  }

  const { fullPath, content } = readTargetFile(targetPath, 'delete its keys')
  let doc
  try {
    doc = parseJsoncDocument(content)
  } catch (err) {
    throw new Error(`Could not parse '${targetPath}' — cannot delete its keys.\n${err}`)
  }

  const keys = parseKey(jsonKey)
  const targetKey = keys.pop()!
  let parent: ReturnType<typeof getObjectNode> = doc.root
  for (const key of keys) {
    parent = isJsoncObject(parent) ? getObjectNode(parent, key) : undefined
  }

  const modified = isJsoncObject(parent) && deleteObjectKey(parent, targetKey)
  writeUpdatedFile(targetPath, fullPath, modified ? stringifyJsoncDocument(doc) : '', modified, false, silent)
}