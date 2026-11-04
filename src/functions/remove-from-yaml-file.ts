import type { RemoveFromYamlFileOptions } from '../types/functions.js'
import { resolve } from 'node:path'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { promptUser } from '../terminal/prompt-user.js'
import { checkPath } from '../_private/check-path.js'
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
  const { targetFile, yamlKey, force = false, prompt = '', silent = false } = opts
  const shouldUpdate = force || await promptUser({ question: prompt || `This will delete '${yamlKey}' from '${targetFile}' file. Continue?` })
  if (shouldUpdate) {
    const check = checkPath(targetFile)
    if (!check.valid) {
      throw new Error(check.error)
    }

    const yamlFilePath = resolve(process.cwd(), targetFile)
    if (!existsSync(yamlFilePath)) {
      throw new Error(`No '${targetFile}' found — cannot delete its keys.`)
    }

    let doc
    try {
      doc = parseYamlDocument(readFileSync(yamlFilePath, 'utf8'))
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

    if (isYamlMap(parent) && deleteMapKey(parent, targetKey)) {
      writeFileSync(yamlFilePath, stringifyYamlDocument(doc), 'utf8')
      if (!silent) console.log(`'${targetFile}' file updated.`)
    } else {
      if (!silent) console.log(`'${targetFile}' file already up to date.`)
    }
  } else {
    if (!silent) console.log(`Updating '${targetFile}' skipped.`)
  }
}
