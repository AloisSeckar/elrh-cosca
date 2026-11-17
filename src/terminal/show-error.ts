import { styleText } from 'node:util'
import type { ShowTextOptions } from '../types/functions.js'

/**
 * Prints error message into stderr followed by a newline and optional extra newlines.
 * 
 * @param {string | ShowTextOptions} opts - The message as a plain string, or an options object.
 * @param {string} opts.message - The error message text to display.
 * @param {number} [opts.linesBefore] - The number of newlines to print before the output (default: 0).
 * @param {number} [opts.linesAfter] - The number of extra newlines to print after the output (default: 0).
 * @param {NodeJS.WritableStream} [opts.output] - Custom output stream (default: process.stdout; process.stderr for `showError`).
 */
export function showError(opts: string | ShowTextOptions): void {
  const { message, linesBefore = 0, linesAfter = 0, output = process.stderr }: ShowTextOptions = typeof opts === 'string' ? { message: opts } : opts
  for (let i = 0; i < linesBefore; i++) {
    output.write('\n')
  }
  output.write(styleText('red', message, { stream: output as NodeJS.WriteStream }))
  output.write('\n')
  for (let i = 0; i < linesAfter; i++) {
    output.write('\n')
  }
}
