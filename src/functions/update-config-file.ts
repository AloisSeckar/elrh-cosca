import type { UpdateConfigFileOptions } from '../types/functions.js'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { mergeConfig } from '../_private/merge-config.js'
import { promptUser } from '../terminal/prompt-user.js'
import { checkPath } from '../_private/check-path.js'

/**
 * Updates the config object exported from a JS/TS config file.
 *
 * The function:
 * - Reads and edits the file as code (no execution).
 * - Uses `export default`, a single `export const`/`let`/`var` named export, or CommonJS `module.exports`; the config may be a plain object or the first argument of a function call (e.g. `defineConfig({...})`).
 * - Deep-merges `newConfig` into the existing config, so `newConfig` takes precedence; arrays are merged as a unique union.
 * - Preserves comments and formatting of untouched parts of the file.
 *
 * @param {string} opts.targetFile - The path to the config file to update (relative to CWD).
 * @param {Record<string | number | symbol, any>} opts.newConfig - The config to merge in (takes precedence).
 * @param {boolean} [opts.createMissing] - If true, the file is created (with `export default {}`) when it does not exist, after confirmation unless `force` is set (default: false).
 * @param {boolean} [opts.force] - If true, skips all confirmation prompts (default: false).
 * @param {string} [opts.prompt] - Custom text of the initial confirmation question (default: built-in question).
 * @param {boolean} [opts.silent] - If true, suppresses all console log output (default: false).
 * @returns {Promise<void>} A promise that resolves when the operation is finished or skipped.
 * @throws Will throw an error if the path or `newConfig` is invalid, the file does not exist (and `createMissing` is not set), no suitable config export is found or it cannot be processed.
 */
export async function updateConfigFile(opts: UpdateConfigFileOptions): Promise<void> {
  const { targetFile, newConfig, createMissing = false, force = false, prompt = '', silent = false } = opts
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
        if (!silent) console.log(`Creation of '${targetFile}' skipped.`)
        return
      }
    }

    const raw = created ? 'export default {}\n' : readFileSync(configFilePath, 'utf8')
    const { code, modified } = mergeConfig(raw, newConfig, targetFile)

    if (created || modified) {
      if (created) {
        mkdirSync(dirname(configFilePath), { recursive: true })
      }
      writeFileSync(configFilePath, code, 'utf8')
      if (!silent) console.log(`'${targetFile}' file ${created ? 'created' : 'updated'}.`)
    } else {
      if (!silent) console.log(`'${targetFile}' file already up to date.`)
    }
  } else {
    if (!silent) console.log(`Updating '${targetFile}' skipped.`)
  }
}
