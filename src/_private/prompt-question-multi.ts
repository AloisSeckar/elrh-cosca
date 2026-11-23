import type { PromptUserMultiOptions } from '../types/functions.js'
import readline from 'node:readline'
import { styleText } from 'node:util'

/**
 * Prompts the user with a numbered list of options and returns the picked 1-based numbers sorted in ascending order.
 *
 * @param {PromptUserMultiOptions} opts - Prompt options including the non-empty `multiChoice` array.
 * @returns {Promise<number[]>} Sorted array of unique 1-based option numbers, or an empty array when no choice is entered.
 */
export async function promptQuestionMulti(opts: PromptUserMultiOptions): Promise<number[]> {
  const { question, multiChoice, input, output, linesBefore = 0, linesAfter = 0, color } = opts
  if (multiChoice.length === 0) {
    throw new Error('multiChoice must contain at least one option')
  }

  const out = output || process.stdout
  const formattedQuestion = color ? styleText(color, question, { stream: out as NodeJS.WriteStream }) : question

  if (linesBefore > 0) out.write('\n'.repeat(linesBefore))
  out.write(formattedQuestion + '\n')
  for (const [index, option] of multiChoice.entries()) {
    out.write(`  ${index + 1}) ${option}\n`)
  }

  const rl = readline.createInterface({
    input: input || process.stdin,
    output: out,
  })

  return new Promise((resolve) => {
    // free "rl" upon Ctrl+C
    rl.on('SIGINT', () => {
      rl.close()
    })

    const ask = () => {
      rl.question('\nEnter numbers separated by commas (empty for none): ', (answer) => {
        const numbers = answer.split(/[\s,]+/).filter(Boolean).map(Number)
        if (numbers.every(number => Number.isInteger(number) && number >= 1 && number <= multiChoice.length)) {
          rl.close()
          if (linesAfter > 0) out.write('\n'.repeat(linesAfter))
          resolve([...new Set(numbers)].sort((a, b) => a - b))
          return
        }
        out.write(`Invalid choice '${answer.trim()}'.\n`)
        ask()
      })
    }

    ask()
  })
}
