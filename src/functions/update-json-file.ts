import type { UpdateJsonFileOptions } from '../types/functions.js'
import { resolve } from 'node:path'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { promptUser } from '../terminal/prompt-user.js'
import { checkPath } from '../_private/check-path.js'

// so-far only allows adding into existing key at the top level of the JSON tree
// e.g. "scripts" or "pnpm" in package.json
// TODO allow recursive updates on any level (think about using defu)

/**
 * Updates a JSON file by modifying a specific key with new values.
 * 
 * @param {UpdateJsonFileOptions} opts - Options for this operation.
 * @param {string} opts.targetFile - The path to the JSON file to update (relative to CWD).
 * @param {string} opts.jsonKey - The key in the JSON file to update (can be new or existing).
 * @param {JsonValue} opts.patch - The new values to set for the specified key.
 * @param {boolean} opts.force - Whether to force the update without prompting.
 * @param {string} opts.prompt - Custom prompt message displayed in terminal.
 * @returns {Promise<void>} An empty promise that resolves when the file is updated.
 * @throws Will throw an error if the path is invalid, the file does not exist or cannot be parsed as JSON.
 */
export async function updateJsonFile(opts: UpdateJsonFileOptions): Promise<void> {
  const { targetFile, jsonKey, patch, force = false, prompt = '' } = opts
  const shouldUpdate = force || await promptUser({ question: prompt || `This will update '${targetFile}' file. Continue?` })
  if (shouldUpdate) {
    const check = checkPath(targetFile)
    if (!check.valid) {
      throw new Error(check.error)
    }
    
    const jsonFilePath = resolve(process.cwd(), targetFile)
    if (!existsSync(jsonFilePath)) {
      throw new Error(`No '${targetFile}' found in project root — cannot update its contents.`)
    }

    const jsonRaw = readFileSync(jsonFilePath, 'utf8')
    let json
    try {
      json = JSON.parse(jsonRaw)
    } catch (err) {
      throw new Error(`Could not parse '${targetFile}' — cannot update its contents.\n${err}`)
    }

    json[jsonKey] = json[jsonKey] || {}

    let modified = false


    if (patch === null || typeof patch === 'string' || 
      typeof patch === 'number' || typeof patch === 'boolean' || Array.isArray(patch)) {
      if (json[jsonKey] !== patch) {
        json[jsonKey] = patch
        modified = true
      }
    } else {
      for (const [key, value] of Object.entries(patch)) {
        if (json[jsonKey][key] !== value) {
          json[jsonKey][key] = value
          modified = true
        }
      }
    }

    if (modified) {
      writeFileSync(jsonFilePath, JSON.stringify(json, null, 2) + '\n', 'utf8')
      console.log(`'${targetFile}' file updated.`)
    } else {
      console.log(`'${targetFile}' file already up to date.`)
    }
  } else {
    console.log(`Updating '${targetFile}' skipped.`)
  }
}
