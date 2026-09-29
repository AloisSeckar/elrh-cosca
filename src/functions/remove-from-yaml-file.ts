import type { RemoveFromYamlFileOptions } from '../types/functions.js'
import { resolve } from 'node:path'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { isMap, isScalar, parseDocument } from 'yaml'
import { promptUser } from '../terminal/prompt-user.js'
import { checkPath } from '../_private/check-path.js'

/**
 * Updates a YAML file by deleting a specified key. Comments and formatting of untouched parts are preserved.
 * 
 * @param {RemoveFromYamlFileOptions} opts - Options for this operation.
 * @param {string} opts.targetFile - The path to the YAML file to update (relative to CWD).
 * @param {string} opts.yamlKey - The key in the YAML file to be deleted (may use dot notation for nested keys).
 * @param {boolean} [opts.force] - If true, skips all confirmation prompts (default: false).
 * @param {string} [opts.prompt] - Custom text of the initial confirmation question (default: built-in question).
 * @returns {Promise<void>} A promise that resolves when the operation is finished or skipped.
 * @throws Will throw an error if the path is invalid, the file does not exist or cannot be parsed as YAML.
 */
export async function removeFromYamlFile(opts: RemoveFromYamlFileOptions): Promise<void> {
  const { targetFile, yamlKey, force = false, prompt = '' } = opts
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

    const doc = parseDocument(readFileSync(yamlFilePath, 'utf8'))
    if (doc.errors.length > 0) {
      throw new Error(`Could not parse '${targetFile}' — cannot delete its keys.\n${doc.errors[0]}`)
    }

    const keys = yamlKey.split('.')
    const targetKey = keys.pop()!
    let parent: unknown = doc.contents
    for (const key of keys) {
      parent = isMap(parent) ? parent.get(key, true) : undefined
    }

    const firstKey = isMap(parent) ? parent.items[0]?.key : undefined
    if (parent === doc.contents && isScalar(firstKey) && firstKey.value === targetKey && firstKey.commentBefore) {
      // comment above the first root key is usually a file header, so it must survive the key removal
      doc.commentBefore = [doc.commentBefore, firstKey.commentBefore].filter(Boolean).join('\n')
    }

    if (isMap(parent) && parent.delete(targetKey)) {
      if (parent.items.length === 0) {
        // would be otherwise rendered as a dangling comment above `{}`
        parent.commentBefore = undefined
      }
      writeFileSync(yamlFilePath, doc.toString(), 'utf8')
      console.log(`'${targetFile}' file updated.`)
    } else {
      console.log(`'${targetFile}' file already up to date.`)
    }
  } else {
    console.log(`Updating '${targetFile}' skipped.`)
  }
}
