import type { PromptUserOptions } from '../types/functions.js'
import readline from 'node:readline'
import { styleText } from 'node:util'

/**
 * Prompts the user with a yes/no question (` (y/N): ` is appended) and returns their response.
 *
 * @param {PromptUserOptions} opts - Prompt options.
 * @returns {Promise<boolean>} True if the user answered yes (`y` or `yes`, case-insensitive), false otherwise.
 */
export async function promptQuestionPolar(opts: PromptUserOptions): Promise<boolean> {
  const { question, input, output, linesBefore = 0, linesAfter = 0, color } = opts
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
