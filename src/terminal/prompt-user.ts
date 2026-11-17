import type { PromptUserOptions } from '../types/functions.js'
import readline from 'node:readline'
import { styleText } from 'node:util'

/**
 * Prompts the user with a yes/no question (` (y/N): ` is appended) and returns their response.
 * 
 * @param {string | PromptUserOptions} opts - The question as a plain string, or an options object.
 * @param {string} opts.question - The question to ask the user.
 * @param {number} [opts.linesBefore] - The number of newlines to print before the output (default: 0).
 * @param {number} [opts.linesAfter] - The number of extra newlines to print after the output (default: 0).
 * @param {NodeJS.ReadableStream} [opts.input] - Custom input stream (default: process.stdin).
 * @param {NodeJS.WritableStream} [opts.output] - Custom output stream (default: process.stdout; process.stderr for `showError`).
 * @param {InspectColor} [opts.color] - The color/style of the text, as accepted by `styleText` from `node:util` (default: no color).
 * @returns {Promise<boolean>} True if the user answered yes (`y` or `yes`, case-insensitive), false otherwise.
 */
export async function promptUser(opts: string | PromptUserOptions): Promise<boolean> {
  const { question, input, output, linesBefore = 0, linesAfter = 0, color }: PromptUserOptions = typeof opts === 'string' ? { question: opts } : opts
  const out = output || process.stdout
  const prompt = question + ' (y/N): '
  const rl = readline.createInterface({
    input: input || process.stdin,
    output: out,
  })

  if (linesBefore > 0) out.write('\n'.repeat(linesBefore))

  return new Promise((resolve) => {
    rl.question(color ? styleText(color, prompt, { stream: out as NodeJS.WriteStream }) : prompt, (answer) => {
      rl.close()
      if (linesAfter > 0) out.write('\n'.repeat(linesAfter))
      const normalizedAnswer = answer.trim().toLowerCase()
      resolve(/^y(es)?$/.test(normalizedAnswer))
    })

    // free "rl" upon Ctrl+C
    rl.on('SIGINT', () => {
      rl.close()
    })
  })
}
