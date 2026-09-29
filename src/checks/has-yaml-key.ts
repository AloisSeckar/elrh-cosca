import type { HasYamlKeyOptions } from '../types/functions.js'
import { resolve } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import { isMap, parseDocument } from 'yaml'
import { checkPath } from '../_private/check-path.js'

/**
 * Checks if a YAML file contains specified key.
 * 
 * @param {HasYamlKeyOptions} opts - Options for this operation.
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

  const doc = parseDocument(readFileSync(yamlFilePath, 'utf8'))
  if (doc.errors.length > 0) {
    throw new Error(`Could not parse '${targetFile}' — cannot check its keys.\n${doc.errors[0]}`)
  }

  const keys = yamlKey.split('.')
  const targetKey = keys.pop()!
  let parent: unknown = doc.contents
  for (const key of keys) {
    if (!isMap(parent)) {
      return false
    }
    parent = parent.get(key, true)
  }

  return isMap(parent) && parent.has(targetKey)
}
