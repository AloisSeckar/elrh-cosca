import readline from 'node:readline'

/**
 * Prompts the user with a question and returns their response.
 * 
 * @param {string} question - Question to ask the user
 * @param {{ input?: NodeJS.ReadableStream; output?: NodeJS.WritableStream }} options - Optional setting of custom input/output stream
 * @returns {Promise<boolean>} - true if the user answered yes (`y`, `Y`, `yes`, `YES`), false otherwise
 */
export async function promptUser(
  question: string,
  options?: { input?: NodeJS.ReadableStream; output?: NodeJS.WritableStream }
): Promise<boolean> {
  const rl = readline.createInterface({
    input: options?.input || process.stdin,
    output: options?.output || process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(question + ' (y/N): ', (answer) => {
      rl.close()
      const normalizedAnswer = answer.trim().toLowerCase()
      resolve(/^y(es)?$/.test(normalizedAnswer))
    })

    // handle Ctrl+C
    rl.on('SIGINT', () => {
      rl.close()
      resolve(false)
    })
  })
}
