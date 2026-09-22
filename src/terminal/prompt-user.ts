import type { PromptUserOptions } from '../types/functions.js'
import readline from 'node:readline'

/**
 * Prompts the user with a question and returns their response.
 * 
 * @param {PromptUserOptions} opts - Options for this operation.
 * @param {string} opts.question - Question to ask the user
 * @param {NodeJS.ReadableStream} opts.input - Custom input stream (default: process.stdin).
 * @param {NodeJS.WritableStream} opts.output - Custom output stream (default: process.stdout).
 * @returns {Promise<boolean>} - true if the user answered yes (`y`, `Y`, `yes`, `YES`), false otherwise
 */
export async function promptUser(opts: PromptUserOptions): Promise<boolean> {
  const { question, input, output } = opts
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
