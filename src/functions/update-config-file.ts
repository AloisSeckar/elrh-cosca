import type { UpdateConfigFileOptions } from '../types/functions.js'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { loadFile, parseModule, generateCode } from 'magicast'
import { deepMergeObject } from '../_private/deep-merge-object.js'
import { promptUser } from '../terminal/prompt-user.js'
import { checkPath } from '../_private/check-path.js'

/**
 * Update the single object-literal config found in a file.
 *
 * The function:
 * - Reads and edits the file as code (no execution).
 * - Uses `defu(newConfig, existingConfig)` so `newConfig` takes precedence.
 * - Applies the merged result back onto the AST to preserve TS/ESM structure.
 *
 * @param {UpdateConfigFileOptions} opts - Options for this operation.
 * @param {string} opts.targetFile - Path to file, relative to project root (process.cwd()).
 * @param {object} opts.newConfig - Config to merge in (takes precedence).
 * @param {boolean} opts.createMissing - If true, the file will be created (with `export default {}`) if it does not exist (after confirmation unless `force` is set).
 * @param {boolean} opts.force - Whether to force the update without prompting.
 * @param {string} opts.prompt - Custom prompt message displayed in terminal.
 * @returns {Promise<void>} An empty promise that resolves when the file is updated.
 * @throws Will throw an error the path is invalid, the file doesn't exist (and `createMissing` is not set) or no config export is found or it cannot be processed.
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
