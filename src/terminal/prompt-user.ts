import readline from 'node:readline'

/**
 * Prompts the user with a question and returns their response.
 * 
 * @param {string} question - Question to ask the user
 * @returns {Promise<boolean>} - true if the user answered yes (`y`), false otherwise
 */
export async function promptUser(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(question + ' (y/N): ', (answer) => {
      rl.close()
      resolve(/^y(es)?$/i.test(answer.trim()))
    })
  })
}
