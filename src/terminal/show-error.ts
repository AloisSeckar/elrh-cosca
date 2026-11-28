import { log } from '@clack/prompts'
import type { ShowMessageOptions } from '../types/functions.js'
import { writeLog } from '../_private/terminal-helpers.js'

/**
 * Prints an error message to stderr using Clack's `log.error`.
 *
 * @param {string | ShowMessageOptions} opts - The message as a plain string, or an options object.
 * @param {string} opts.message - The error message text to display.
 * @param {Writable} [opts.output] - Custom output stream (default: process.stderr).
 * @param {InspectColor} [opts.color] - Optional color/style for the text, as accepted by `styleText` from `node:util` (default: red).
 */
export function showError(opts: string | ShowMessageOptions): void {
  writeLog(log.error, opts, { output: process.stderr, color: 'red' })
}
