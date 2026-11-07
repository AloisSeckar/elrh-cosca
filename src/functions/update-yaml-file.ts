import type { UpdateYamlFileOptions } from '../types/functions.js'
import type { DataValue } from '../types/data.js'
import { isDeepStrictEqual } from 'node:util'
import {
  confirmAction, prepareTargetFile, PROTOTYPE_POLLUTION_KEYS, writeUpdatedFile,
} from '../_private/file-helpers.js'
import type { YamlDocument, YamlMap, YamlSeq } from '../_private/yaml.js'
import {
  createYamlNode, getMapNode, isYamlMap, isYamlScalar, isYamlSeq,
  parseYamlDocument, setMapNode, stringifyYamlDocument, yamlNodeToJson,
} from '../_private/yaml.js'

/**
 * Updates a YAML file by setting a key with new value(s). The key can be nested and can alter between primitives to objects and arrays as needed. Comments and formatting of untouched parts are preserved.
 * 
 * @param {string} opts.targetPath - The path to the file or directory to work with (relative to CWD).
 * @param {string} opts.yamlKey - The key in the YAML file to update (can be new or existing; may use dot notation for nested keys - missing or non-map intermediate levels are replaced with maps).
 * @param {DataValue} opts.patch - The value for the specified key. Objects are shallow-merged into the existing value (a non-map existing value is replaced), arrays are appended to the existing value by default (duplicates are skipped, a non-sequence existing value becomes the first item), other values (primitives, null) replace it.
 * @param {boolean} [opts.createMissing] - If true, the file is created when it does not exist, after confirmation unless `force` is set (default: false).
 * @param {boolean} [opts.overwriteArrays] - If true, an array patch replaces the existing value instead of appending (default: false).
 * @param {boolean} [opts.force] - If true, skips all confirmation prompts (default: false).
 * @param {string} [opts.prompt] - Custom text of the initial confirmation question (default: built-in question).
 * @param {boolean} [opts.silent] - If true, suppresses all console log output (default: false).
 * @returns {Promise<void>} A promise that resolves when the operation is finished or skipped.
 * @throws Will throw an error if the path or the key is invalid, the file does not exist (and `createMissing` is not set), cannot be parsed as YAML or its root is not a map.
 */
export async function updateYamlFile(opts: UpdateYamlFileOptions): Promise<void> {
  const { targetPath, yamlKey, patch, overwriteArrays = false, silent = false } = opts
  if (!await confirmAction(opts, `This will update '${targetPath}' file. Continue?`, `Updating '${targetPath}' skipped.`)) {
    return
  }

  const keys = yamlKey.split('.')
  if (keys.some(key => key === '' || PROTOTYPE_POLLUTION_KEYS.has(key))) {
    throw new Error(`Invalid YAML key '${yamlKey}'.`)
  }
  if (patch !== null && typeof patch === 'object' && !Array.isArray(patch) && Object.keys(patch).some(key => PROTOTYPE_POLLUTION_KEYS.has(key))) {
    throw new Error(`Invalid YAML key in patch of '${yamlKey}'.`)
  }

  const target = await prepareTargetFile(targetPath, opts)
  if (!target) {
    return
  }

  const yamlRaw = target.content ?? ''
  let doc: YamlDocument
  try {
    doc = parseYamlDocument(yamlRaw)
  } catch (err) {
    throw new Error(`Could not parse '${targetPath}' — cannot update its contents.\n${err}`)
  }

  let modified = target.created

  if (doc.contents === null) {
    doc.contents = createYamlNode({})
  }
  if (!isYamlMap(doc.contents)) {
    throw new Error(`Root of '${targetPath}' is not a YAML map — cannot update its contents.`)
  }

  const targetKey = keys.pop()!
  let parent: YamlMap = doc.contents
  for (const key of keys) {
    const nested = getMapNode(parent, key)
    if (isYamlMap(nested)) {
      parent = nested
    } else {
      const map = createYamlNode({}) as YamlMap
      setMapNode(parent, key, map)
      parent = map
      modified = true
    }
  }

  if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) {
    modified = setValue(parent, targetKey, patch, overwriteArrays) || modified
  } else {
    let targetNode = getMapNode(parent, targetKey)
    if (!isYamlMap(targetNode)) {
      // non-map values cannot be merged into, so they are replaced
      targetNode = createYamlNode({}) as YamlMap
      setMapNode(parent, targetKey, targetNode)
      modified = true
    }
    for (const [key, value] of Object.entries(patch)) {
      modified = setValue(targetNode, key, value, overwriteArrays) || modified
    }
  }

  writeUpdatedFile(targetPath, target.fullPath, modified ? stringifyYamlDocument(doc) : '', modified, target.created, silent)
}

function setValue(map: YamlMap, key: string, value: DataValue, overwriteArrays: boolean): boolean {
  const current = getMapNode(map, key)
  if (!overwriteArrays && Array.isArray(value) && current !== undefined && !(isYamlScalar(current) && current.value === null)) {
    const items: unknown[] = isYamlSeq(current) ? (yamlNodeToJson(current) as unknown[]) : [yamlNodeToJson(current)]
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
    let seq: YamlSeq
    if (isYamlSeq(current)) {
      seq = current
    } else {
      // existing node is moved into the new sequence to keep its comments
      seq = { kind: 'seq', items: [current] }
      setMapNode(map, key, seq)
    }
    for (const item of added) {
      seq.items.push(createYamlNode(item))
    }
    return true
  }
  if (current !== undefined && isDeepStrictEqual(yamlNodeToJson(current), value)) {
    return false
  }
  if (isYamlScalar(current) && (value === null || typeof value !== 'object')) {
    // keeps comments attached to the existing scalar
    current.value = value
    current.raw = undefined
  } else {
    setMapNode(map, key, createYamlNode(value))
  }
  return true
}
