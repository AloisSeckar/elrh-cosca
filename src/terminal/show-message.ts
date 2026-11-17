import { styleText } from 'node:util'
import type { ShowMessageOptions } from '../types/functions.js'

/**
 * Prints message into stdout followed by a newline and optional extra newlines.
 * 
 * @param {string | ShowMessageOptions} opts - The message as a plain string, or an options object.
 * @param {string} opts.message - The message text to display.
 * @param {number} [opts.linesBefore] - The number of newlines to print before the output (default: 0).
 * @param {number} [opts.linesAfter] - The number of extra newlines to print after the output (default: 0).
 * @param {NodeJS.WritableStream} [opts.output] - Custom output stream (default: process.stdout; process.stderr for `showError`).
 * @param {InspectColor} [opts.color] - The color/style of the text, as accepted by `styleText` from `node:util` (default: no color).
 */
export function showMessage(opts: string | ShowMessageOptions): void {
  const { message, linesBefore = 0, linesAfter = 0, output = process.stdout, color }: ShowMessageOptions = typeof opts === 'string' ? { message: opts } : opts
  for (let i = 0; i < linesBefore; i++) {
    output.write('\n')
  }
  output.write(color ? styleText(color, message, { stream: output as NodeJS.WriteStream }) : message)
  output.write('\n')
  for (let i = 0; i < linesAfter; i++) {
    output.write('\n')
  }
}
