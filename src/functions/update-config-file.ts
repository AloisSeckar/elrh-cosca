import { existsSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadFile, generateCode } from 'magicast'
import { deepMergeObject } from '../_private/deep-merge-object.js'
import { promptUser } from '../terminal/prompt-user.js'

/**
 * Update the single object-literal config found in a file.
 *
 * The function:
 * - Reads and edits the file as code (no execution).
 * - Uses `defu(newConfig, existingConfig)` so `newConfig` takes precedence.
 * - Applies the merged result back onto the AST to preserve TS/ESM structure.
 *
 * @param {string} targetFile - Path to file, relative to project root (process.cwd()).
 * @param {object} newConfig - Config to merge in (takes precedence).
 * @returns {Promise<void>} An empty promise that resolves when the file is updated.
 * @throws Will throw an error if no config export is found or it cannot be processed.
 */
export async function updateConfigFile(
  targetFile: string, newConfig: Record<string | number | symbol, any>, 
  force: boolean = false, prompt: string = ''
): Promise<void> {
  const shouldUpdate = force || await promptUser(
    prompt || `This will update '${targetFile}' file. Continue?`,
  )
  if (shouldUpdate) {
    const configFilePath = resolve(process.cwd(), targetFile)
    if (!existsSync(configFilePath)) {
      throw new Error(`No '${targetFile}' found in project root — cannot update its contents.`)
    }

    // load the file as a Magicast module (.ts/.js/.mjs)
    const module = await loadFile(configFilePath)
    
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
      throw new Error(`It is currently not possible to handle CommonJS module.exports syntax of ${targetFile}`)
    }
    // config object is required
    if (!configExport) {
      throw new Error(`No suitable config export found in ${targetFile}`)
    }

    // config object might be wrapped inside a function call or be a plain object itself
    const oldConfig = configExport.$type === 'function-call' ? configExport.$args?.[0] : configExport 
    if (!oldConfig || typeof oldConfig !== 'object') {
      throw new Error(`Could not access config object in ${targetFile}`)
    }

    // track changes (save before)
    const oldSnapshot = JSON.stringify(oldConfig)

    // defu-like merge (note: arguments order swapped here)
    deepMergeObject(oldConfig, newConfig)

    // track changes (get after)
    const newSnapshot = JSON.stringify(oldConfig)

    // if config was changed write the result back into the source file
    if (oldSnapshot !== newSnapshot) {
      const { code } = generateCode(module)
      writeFileSync(configFilePath, code, 'utf8')
      console.log(`'${targetFile}' file updated.`)
    } else {
      console.log(`'${targetFile}' file already up to date.`)
    }
  } else {
    console.log(`Updating '${targetFile}' skipped.`)
  }
}
