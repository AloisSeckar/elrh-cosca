import { log } from '@clack/prompts'
import type { ShowMessageOptions } from '../types/functions.js'
import { writeLog } from '../_private/terminal-helpers.js'

/**
 * Prints a message to stdout using Clack's `log.message`.
 *
 * @param {string | ShowMessageOptions} opts - The message as a plain string, or an options object.
 * @param {string} opts.message - The message text to display.
 * @param {Writable} [opts.output] - Custom output stream (default: process.stdout).
 * @param {InspectColor} [opts.color] - Optional color/style for the text, as accepted by `styleText` from `node:util` (default: no color).
 */
export function showMessage(opts: string | ShowMessageOptions): void {
  writeLog(log.message, opts)
}
