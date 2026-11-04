import type { HasYamlKeyOptions } from '../types/functions.js'
import { resolve } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import { checkPath } from '../_private/check-path.js'
import { getMapNode, hasMapKey, isYamlMap, parseYamlDocument } from '../_private/yaml.js'

/**
 * Checks if a YAML file contains specified key.
 * 
 * @param {string} opts.targetFile - The path to the YAML file to be checked (relative to CWD).
 * @param {string} opts.yamlKey - The key in the YAML file to be checked for existence (may use dot notation for nested keys).
 * @returns {boolean} True if the key exists in target file, false otherwise.
 * @throws Will throw an error if the path is invalid, file does not exist or cannot be parsed as YAML.
 */
export function hasYamlKey(opts: HasYamlKeyOptions): boolean {
  const { targetFile, yamlKey } = opts
  const check = checkPath(targetFile)
  if (!check.valid) {
    throw new Error(check.error)
  }

  const yamlFilePath = resolve(process.cwd(), targetFile)
  if (!existsSync(yamlFilePath)) {
    throw new Error(`No '${targetFile}' found — cannot check its keys.`)
  }

  let doc
  try {
    doc = parseYamlDocument(readFileSync(yamlFilePath, 'utf8'))
  } catch (err) {
    throw new Error(`Could not parse '${targetFile}' — cannot check its keys.\n${err}`)
  }

  const keys = yamlKey.split('.')
  const targetKey = keys.pop()!
  let parent: ReturnType<typeof getMapNode> | null = doc.contents
  for (const key of keys) {
    if (!isYamlMap(parent)) {
      return false
    }
    parent = getMapNode(parent, key)
  }

  return isYamlMap(parent) && hasMapKey(parent, targetKey)
}
