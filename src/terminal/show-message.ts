/**
 * Prints message into stdout with specified number of newlines after it.
 * 
 * @param {string} message - The message text to display.
 * @param {number} linesAfter - The number of newlines to print after the message (default is 1).
 */
export function showMessage(message: string, linesAfter: number = 1): void {
  process.stdout.write(message)
  for (let i = 0; i < linesAfter; i++) {
    process.stdout.write('\n')
  }
}
