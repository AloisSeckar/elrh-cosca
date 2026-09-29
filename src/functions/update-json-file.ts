import type { UpdateJsonFileOptions } from '../types/functions.js'
import { dirname, resolve } from 'node:path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { promptUser } from '../terminal/prompt-user.js'
import { checkPath } from '../_private/check-path.js'

// so-far only allows adding into existing key at the top level of the JSON tree
// e.g. "scripts" or "pnpm" in package.json
// TODO allow recursive updates on any level (think about using defu)

/**
 * Updates a JSON file by setting a top-level key with new value(s).
 * 
 * @param {UpdateJsonFileOptions} opts - Options for this operation.
 * @param {string} opts.targetFile - The path to the JSON file to update (relative to CWD).
 * @param {string} opts.jsonKey - The top-level key in the JSON file to update (can be new or existing; dot notation is not supported).
 * @param {JsonValue} opts.patch - The value for the specified key. Objects are shallow-merged into the existing value (a non-object existing value is replaced), other values (primitives, arrays, null) replace it.
 * @param {boolean} [opts.createMissing] - If true, the file is created when it does not exist, after confirmation unless `force` is set (default: false).
 * @param {boolean} [opts.force] - If true, skips all confirmation prompts (default: false).
 * @param {string} [opts.prompt] - Custom text of the initial confirmation question (default: built-in question).
 * @returns {Promise<void>} A promise that resolves when the operation is finished or skipped.
 * @throws Will throw an error if the path is invalid, the file does not exist (and `createMissing` is not set) or cannot be parsed as JSON.
 */
export async function updateJsonFile(opts: UpdateJsonFileOptions): Promise<void> {
  const { targetFile, jsonKey, patch, createMissing = false, force = false, prompt = '' } = opts
  const shouldUpdate = force || await promptUser({ question: prompt || `This will update '${targetFile}' file. Continue?` })
  if (shouldUpdate) {
    const check = checkPath(targetFile)
    if (!check.valid) {
      throw new Error(check.error)
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

    if (patch === null || typeof patch === 'string' || 
      typeof patch === 'number' || typeof patch === 'boolean' || Array.isArray(patch)) {
      if (json[jsonKey] !== patch) {
        json[jsonKey] = patch
        modified = true
      }
    } else {
      const current = json[jsonKey]
      if (current === null || typeof current !== 'object' || Array.isArray(current)) {
        // non-object values cannot be merged into, so they are replaced
        json[jsonKey] = {}
        modified = true
      }
      for (const [key, value] of Object.entries(patch)) {
        if (json[jsonKey][key] !== value) {
          json[jsonKey][key] = value
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
