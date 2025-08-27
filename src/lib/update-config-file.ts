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
    
    // evaluate config object
    // 1. try default export first
    let configExport = (module.exports as any)?.default
    // 2. check for single named export
    if (!configExport) {
      const exportKeys = Object.keys(module.exports)
      if (exportKeys.length === 1) {
        configExport = (module.exports as any)[exportKeys[0]]
      }
    }
    // 3. check for CommonJS module.exports
    // TODO currently not available
    if (!configExport && typeof module.exports === 'object' && module.exports !== null) {
      // this is how to recognize we are in CommonJS syntax file
      // however plain `configExport = module.exports` doesn't allow to access
      // the actual contents of the config object (newConfig is merged in the file,
      // but outside of the module.exports key)
      // because of the proxied nature of `module.exports` it is difficult to reason
      // with its structure and guess how to reference it (if it is even possible)
      // to solve this, traversing via `module.$ast` would probably be required
      // but it is not very straightforward because of the complex structure and
      // conditioned TypeScript definitions...
      // for now I put further efforts on hold - CONTRIBUTIONS WELCOME!
      throw new Error(`It is currently not possible to handle CommonJS module.exports syntax of ${pathToFile}`)
    }
    console.log(configExport)
    if (!configExport) {
      throw new Error(`No suitable config export found in ${pathToFile}`)
    }

    // config object might be wrapped inside a function call or be a plain object itself
    const oldConfig = configExport.$type === 'function-call' ? configExport.$args?.[0] : configExport 
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
