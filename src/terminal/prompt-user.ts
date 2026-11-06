import type { PromptUserOptions } from '../types/functions.js'
import readline from 'node:readline'

/**
 * Prompts the user with a yes/no question (` (y/N): ` is appended) and returns their response.
 * 
 * @param {string | PromptUserOptions} opts - The question as a plain string, or an options object.
 * @param {string} opts.question - The question to ask the user.
 * @param {NodeJS.ReadableStream} [opts.input] - Custom input stream (default: process.stdin).
 * @param {NodeJS.WritableStream} [opts.output] - Custom output stream (default: process.stdout).
 * @returns {Promise<boolean>} True if the user answered yes (`y` or `yes`, case-insensitive), false otherwise.
 */
export async function promptUser(opts: string | PromptUserOptions): Promise<boolean> {
  const { question, input, output }: PromptUserOptions = typeof opts === 'string' ? { question: opts } : opts
  const rl = readline.createInterface({
    input: input || process.stdin,
    output: output || process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(question + ' (y/N): ', (answer) => {
      rl.close()
      const normalizedAnswer = answer.trim().toLowerCase()
      resolve(/^y(es)?$/.test(normalizedAnswer))
    })

    // free "rl" upon Ctrl+C
    rl.on('SIGINT', () => {
      rl.close()
    })
  })
}
