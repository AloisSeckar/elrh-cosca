import type { UpdateJsonFileOptions } from '../types/functions.js'
import { dirname, resolve } from 'node:path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { promptUser } from '../terminal/prompt-user.js'
import { checkPath } from '../_private/check-path.js'

// guards against prototype pollution via crafted key segments
const FORBIDDEN_KEYS = ['__proto__', 'constructor', 'prototype']

/**
 * Updates a JSON file by setting a key with new value(s). The key can be nested and can alter between primitives to objects and arrays as needed.
 * 
 * @param {UpdateJsonFileOptions} opts - Options for this operation.
 * @param {string} opts.targetFile - The path to the JSON file to update (relative to CWD).
 * @param {string} opts.jsonKey - The key in the JSON file to update (can be new or existing; may use dot notation for nested keys - missing or non-object intermediate levels are replaced with objects).
 * @param {JsonValue} opts.patch - The value for the specified key. Objects are shallow-merged into the existing value (a non-object existing value is replaced), other values (primitives, arrays, null) replace it.
 * @param {boolean} [opts.createMissing] - If true, the file is created when it does not exist, after confirmation unless `force` is set (default: false).
 * @param {boolean} [opts.force] - If true, skips all confirmation prompts (default: false).
 * @param {string} [opts.prompt] - Custom text of the initial confirmation question (default: built-in question).
 * @returns {Promise<void>} A promise that resolves when the operation is finished or skipped.
 * @throws Will throw an error if the path or the key is invalid, the file does not exist (and `createMissing` is not set) or cannot be parsed as JSON.
 */
export async function updateJsonFile(opts: UpdateJsonFileOptions): Promise<void> {
  const { targetFile, jsonKey, patch, createMissing = false, force = false, prompt = '' } = opts
  const shouldUpdate = force || await promptUser({ question: prompt || `This will update '${targetFile}' file. Continue?` })
  if (shouldUpdate) {
    const check = checkPath(targetFile)
    if (!check.valid) {
      throw new Error(check.error)
    }

    const keys = jsonKey.split('.')
    if (keys.some(key => key === '' || FORBIDDEN_KEYS.includes(key))) {
      throw new Error(`Invalid JSON key '${jsonKey}'.`)
    }
    
    const jsonFilePath = resolve(process.cwd(), targetFile)
    const created = !existsSync(jsonFilePath)
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

    const jsonRaw = created ? '{}' : readFileSync(jsonFilePath, 'utf8')
    let json
    try {
      json = JSON.parse(jsonRaw)
    } catch (err) {
      throw new Error(`Could not parse '${targetFile}' — cannot update its contents.\n${err}`)
    }

    let modified = created

    const targetKey = keys.pop()!
    let parent = json
    for (const key of keys) {
      const nested = parent[key]
      if (!isJsonObject(nested)) {
        parent[key] = {}
        modified = true
      }
      parent = parent[key]
    }

    if (patch === null || typeof patch === 'string' || 
      typeof patch === 'number' || typeof patch === 'boolean' || Array.isArray(patch)) {
      if (parent[targetKey] !== patch) {
        parent[targetKey] = patch
        modified = true
      }
    } else {
      if (!isJsonObject(parent[targetKey])) {
        // non-object values cannot be merged into, so they are replaced
        parent[targetKey] = {}
        modified = true
      }
      for (const [key, value] of Object.entries(patch)) {
        if (parent[targetKey][key] !== value) {
          parent[targetKey][key] = value
          modified = true
        }
      }
    }

    if (modified) {
      if (created) {
        mkdirSync(dirname(jsonFilePath), { recursive: true })
      }
      writeFileSync(jsonFilePath, JSON.stringify(json, null, 2) + '\n', 'utf8')
      console.log(`'${targetFile}' file ${created ? 'created' : 'updated'}.`)
    } else {
      console.log(`'${targetFile}' file already up to date.`)
    }
  } else {
    console.log(`Updating '${targetFile}' skipped.`)
  }
}

function isJsonObject(value: unknown): boolean {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
