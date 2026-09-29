import type { UpdateYamlFileOptions } from '../types/functions.js'
import type { JsonValue } from '../types/json.js'
import { dirname, resolve } from 'node:path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { isDeepStrictEqual } from 'node:util'
import { type Document, type YAMLMap, isMap, isNode, isScalar, parseDocument } from 'yaml'
import { promptUser } from '../terminal/prompt-user.js'
import { checkPath } from '../_private/check-path.js'

// guards against prototype pollution via crafted key segments
const FORBIDDEN_KEYS = ['__proto__', 'constructor', 'prototype']

/**
 * Updates a YAML file by setting a key with new value(s). The key can be nested and can alter between primitives to objects and arrays as needed. Comments and formatting of untouched parts are preserved.
 * 
 * @param {UpdateYamlFileOptions} opts - Options for this operation.
 * @param {string} opts.targetFile - The path to the YAML file to update (relative to CWD).
 * @param {string} opts.yamlKey - The key in the YAML file to update (can be new or existing; may use dot notation for nested keys - missing or non-map intermediate levels are replaced with maps).
 * @param {JsonValue} opts.patch - The value for the specified key. Objects are shallow-merged into the existing value (a non-map existing value is replaced), other values (primitives, arrays, null) replace it.
 * @param {boolean} [opts.createMissing] - If true, the file is created when it does not exist, after confirmation unless `force` is set (default: false).
 * @param {boolean} [opts.force] - If true, skips all confirmation prompts (default: false).
 * @param {string} [opts.prompt] - Custom text of the initial confirmation question (default: built-in question).
 * @returns {Promise<void>} A promise that resolves when the operation is finished or skipped.
 * @throws Will throw an error if the path or the key is invalid, the file does not exist (and `createMissing` is not set), cannot be parsed as YAML or its root is not a map.
 */
export async function updateYamlFile(opts: UpdateYamlFileOptions): Promise<void> {
  const { targetFile, yamlKey, patch, createMissing = false, force = false, prompt = '' } = opts
  const shouldUpdate = force || await promptUser({ question: prompt || `This will update '${targetFile}' file. Continue?` })
  if (shouldUpdate) {
    const check = checkPath(targetFile)
    if (!check.valid) {
      throw new Error(check.error)
    }

    const keys = yamlKey.split('.')
    if (keys.some(key => key === '' || FORBIDDEN_KEYS.includes(key))) {
      throw new Error(`Invalid YAML key '${yamlKey}'.`)
    }

    const yamlFilePath = resolve(process.cwd(), targetFile)
    const created = !existsSync(yamlFilePath)
    if (created) {
      if (!createMissing) {
        throw new Error(`No '${targetFile}' found — cannot update its contents.`)
      }
      const shouldCreate = force || await promptUser({ question: `File '${targetFile}' does not exist. Create it?` })
      if (!shouldCreate) {
        console.log(`Creation of '${targetFile}' skipped.`)
        return
      }
    }

    const yamlRaw = created ? '' : readFileSync(yamlFilePath, 'utf8')
    const doc: Document = parseDocument(yamlRaw)
    if (doc.errors.length > 0) {
      throw new Error(`Could not parse '${targetFile}' — cannot update its contents.\n${doc.errors[0]}`)
    }

    let modified = created

    if (doc.contents === null) {
      doc.contents = doc.createNode({})
    }
    if (!isMap(doc.contents)) {
      throw new Error(`Root of '${targetFile}' is not a YAML map — cannot update its contents.`)
    }

    const targetKey = keys.pop()!
    let parent: YAMLMap = doc.contents
    for (const key of keys) {
      const nested: unknown = parent.get(key, true)
      if (isMap(nested)) {
        parent = nested
      } else {
        const map = doc.createNode({}) as YAMLMap
        parent.set(key, map)
        parent = map
        modified = true
      }
    }

    if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) {
      modified = setValue(doc, parent, targetKey, patch) || modified
    } else {
      let target: unknown = parent.get(targetKey, true)
      if (!isMap(target)) {
        // non-map values cannot be merged into, so they are replaced
        target = doc.createNode({})
        parent.set(targetKey, target)
        modified = true
      }
      for (const [key, value] of Object.entries(patch)) {
        modified = setValue(doc, target as YAMLMap, key, value) || modified
      }
    }

    if (modified) {
      if (created) {
        mkdirSync(dirname(yamlFilePath), { recursive: true })
      }
      writeFileSync(yamlFilePath, doc.toString(), 'utf8')
      console.log(`'${targetFile}' file ${created ? 'created' : 'updated'}.`)
    } else {
      console.log(`'${targetFile}' file already up to date.`)
    }
  } else {
    console.log(`Updating '${targetFile}' skipped.`)
  }
}

function setValue(doc: Document, map: YAMLMap, key: string, value: JsonValue): boolean {
  const current = map.get(key, true)
  if (map.has(key) && isDeepStrictEqual(isNode(current) ? current.toJSON() : current, value)) {
    return false
  }
  if (isScalar(current) && (value === null || typeof value !== 'object')) {
    // keeps comments attached to the existing scalar
    current.value = value
  } else {
    map.set(key, doc.createNode(value))
  }
  return true
}
