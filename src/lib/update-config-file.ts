import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadFile, generateCode } from 'magicast'
import { deepMergeObject } from '../utils/better-deep-merge'
import { promptUser } from './prompt-user.js'

/**
 * Update the single object-literal config found in a file.
 *
 * The function:
 * - Reads and edits the file as code (no execution).
 * - Uses `defu(newConfig, existingConfig)` so `newConfig` takes precedence.
 * - Applies the merged result back onto the AST to preserve TS/ESM structure.
 *
 * @param {string} pathToFile - Path to file, relative to project root (process.cwd()).
 * @param {object} newConfig - Config to merge in (takes precedence).
 * @returns {Promise<void>}
 */
export async function updateConfigFile(
  pathToFile: string, newConfig: Record<string | number | symbol, any>, force: boolean = false
): Promise<void> {
  const shouldUpdate = force || await promptUser(
    `This will update '${pathToFile}' file. Continue?`,
  )
  if (shouldUpdate) {
    const absPath = resolve(process.cwd(), pathToFile)

     // load the file as a Magicast module (.ts/.js/.mjs)
    const module = await loadFile(absPath)
    
    // default export must be present
    const defaultExport = (module.exports as any)?.default
    if (!defaultExport) {
      throw new Error(`No default export found in ${pathToFile}`)
    }

    // config object might be wrapped inside a function call or be a plain object itself
    const oldConfig = defaultExport.$type === 'function-call' ? defaultExport.$args?.[0] : defaultExport
    if (!oldConfig || typeof oldConfig !== 'object') {
      throw new Error(`Could not access config object in ${pathToFile}`)
    }

    // defu-like merge (note: arguments order swapped here)
    deepMergeObject(oldConfig, newConfig)

    // write the result back into the source file
    const { code } = generateCode(module)
    writeFileSync(absPath, code, 'utf8')
  }
}
