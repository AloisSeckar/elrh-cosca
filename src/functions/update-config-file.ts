import type { UpdateConfigFileOptions } from '../types/functions.js'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { deepMergeObject } from '../_private/deep-merge-object.js'
import { promptUser } from '../terminal/prompt-user.js'
import { checkPath } from '../_private/check-path.js'

/**
 * Updates the config object exported from a JS/TS config file.
 *
 * The function:
 * - Reads and edits the file as code (no execution).
 * - Uses the default export or a single named export; the config may be a plain object or the first argument of a function call (e.g. `defineConfig({...})`).
 * - Deep-merges `newConfig` into the existing config, so `newConfig` takes precedence; arrays are merged as a unique union.
 * - Applies the merged result back onto the AST to preserve TS/ESM structure.
 *
 * @param {UpdateConfigFileOptions} opts - Options for this operation.
 * @param {string} opts.targetFile - The path to the config file to update (relative to CWD).
 * @param {Record<string | number | symbol, any>} opts.newConfig - The config to merge in (takes precedence).
 * @param {boolean} [opts.createMissing] - If true, the file is created (with `export default {}`) when it does not exist, after confirmation unless `force` is set (default: false).
 * @param {boolean} [opts.force] - If true, skips all confirmation prompts (default: false).
 * @param {string} [opts.prompt] - Custom text of the initial confirmation question (default: built-in question).
 * @returns {Promise<void>} A promise that resolves when the operation is finished or skipped.
 * @throws Will throw an error if the path is invalid, the file does not exist (and `createMissing` is not set), uses CommonJS `module.exports` or no suitable config export is found or it cannot be processed.
 */
export async function updateConfigFile(opts: UpdateConfigFileOptions): Promise<void> {
  const { targetFile, newConfig, createMissing = false, force = false, prompt = '' } = opts
  const shouldUpdate = force || await promptUser({ question: prompt || `This will update '${targetFile}' file. Continue?` })
  if (shouldUpdate) {
    const check = checkPath(targetFile)
    if (!check.valid) {
      throw new Error(check.error)
    }

    const configFilePath = resolve(process.cwd(), targetFile)
    const created = !existsSync(configFilePath)
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

    // lazy-loaded so the code is only parsed when needed
    const { loadFile, parseModule, generateCode } = await import('magicast')

    // load the file as a Magicast module (.ts/.js/.mjs)
    const module = created ? parseModule('export default {}\n') : await loadFile(configFilePath)
    
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
    if (created || oldSnapshot !== newSnapshot) {
      if (created) {
        mkdirSync(dirname(configFilePath), { recursive: true })
      }
      const { code } = generateCode(module)
      writeFileSync(configFilePath, code, 'utf8')
      console.log(`'${targetFile}' file ${created ? 'created' : 'updated'}.`)
    } else {
      console.log(`'${targetFile}' file already up to date.`)
    }
  } else {
    console.log(`Updating '${targetFile}' skipped.`)
  }
}
