import type { RemoveFromYamlFileOptions } from '../types/functions.js'
import { confirmAction, readTargetFile, writeUpdatedFile } from '../_private/file-helpers.js'
import {
  deleteMapKey, getMapNode, isYamlMap,
  parseYamlDocument, stringifyYamlDocument,
} from '../_private/yaml.js'

/**
 * Updates a YAML file by deleting a specified key. Comments and formatting of untouched parts are preserved.
 * 
 * @param {string} opts.targetFile - The path to the YAML file to update (relative to CWD).
 * @param {string} opts.yamlKey - The key in the YAML file to be deleted (may use dot notation for nested keys).
 * @param {boolean} [opts.force] - If true, skips all confirmation prompts (default: false).
 * @param {string} [opts.prompt] - Custom text of the initial confirmation question (default: built-in question).
 * @param {boolean} [opts.silent] - If true, suppresses all console log output (default: false).
 * @returns {Promise<void>} A promise that resolves when the operation is finished or skipped.
 * @throws Will throw an error if the path is invalid, the file does not exist or cannot be parsed as YAML.
 */
export async function removeFromYamlFile(opts: RemoveFromYamlFileOptions): Promise<void> {
  const { targetFile, yamlKey, silent = false } = opts
  if (!await confirmAction(opts, `This will delete '${yamlKey}' from '${targetFile}' file. Continue?`, `Updating '${targetFile}' skipped.`)) {
    return
  }

  const { fullPath, content } = readTargetFile(targetFile, 'delete its keys')
  let doc
  try {
    doc = parseYamlDocument(content)
  } catch (err) {
    throw new Error(`Could not parse '${targetFile}' — cannot delete its keys.\n${err}`)
  }

  const keys = yamlKey.split('.')
  const targetKey = keys.pop()!
  let parent: ReturnType<typeof getMapNode> | null = doc.contents
  for (const key of keys) {
    parent = isYamlMap(parent) ? getMapNode(parent, key) : undefined
  }

  const firstPair = isYamlMap(parent) ? parent.items[0] : undefined
  if (parent === doc.contents && firstPair?.key === targetKey && firstPair.commentBefore) {
    // comment above the first root key is usually a file header, so it must survive the key removal
    doc.commentBefore = firstPair.commentBefore
  }

  const modified = isYamlMap(parent) && deleteMapKey(parent, targetKey)
  writeUpdatedFile(targetFile, fullPath, modified ? stringifyYamlDocument(doc) : '', modified, false, silent)
}
