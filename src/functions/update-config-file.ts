import type { UpdateConfigFileOptions } from '../types/functions.js'
import { mergeConfig } from '../_private/merge-config.js'
import { confirmAction, prepareTargetFile, writeUpdatedFile } from '../_private/file-helpers.js'

/**
 * Updates the config object exported from a JS/TS config file.
 *
 * The function:
 * - Reads and edits the file as code (no execution).
 * - Uses `export default`, a single `export const`/`let`/`var` named export, or CommonJS `module.exports`; the config may be a plain object or the first argument of a function call (e.g. `defineConfig({...})`).
 * - Deep-merges `newConfig` into the existing config, so `newConfig` takes precedence; arrays are merged as a unique union.
 * - Preserves comments and formatting of untouched parts of the file.
 *
 * @param {string} opts.targetPath - The path to the file or directory to work with (relative to CWD).
 * @param {Record<string | number | symbol, any>} opts.newConfig - The config to merge in (takes precedence).
 * @param {boolean} [opts.createMissing] - If true, the file is created (with `export default {}`) when it does not exist, after confirmation unless `force` is set (default: false).
 * @param {boolean} [opts.force] - If true, skips all confirmation prompts (default: false).
 * @param {string} [opts.prompt] - Custom text of the initial confirmation question (default: built-in question).
 * @param {boolean} [opts.silent] - If true, suppresses all console log output (default: false).
 * @returns {Promise<void>} A promise that resolves when the operation is finished or skipped.
 * @throws Will throw an error if the path or `newConfig` is invalid, the file does not exist (and `createMissing` is not set), no suitable config export is found or it cannot be processed.
 */
export async function updateConfigFile(opts: UpdateConfigFileOptions): Promise<void> {
  const { targetPath, newConfig, silent = false } = opts
  if (!await confirmAction(opts, `This will update '${targetPath}' file. Continue?`, `Updating '${targetPath}' skipped.`)) {
    return
  }

  const target = await prepareTargetFile(targetPath, opts)
  if (!target) {
    return
  }

  const raw = target.content ?? 'export default {}\n'
  const { code, modified } = mergeConfig(raw, newConfig, targetPath)

  writeUpdatedFile(targetPath, target.fullPath, code, target.created || modified, target.created, silent)
}
