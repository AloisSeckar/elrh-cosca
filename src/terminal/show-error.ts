/**
 * Prints error message into stderr with specified number of newlines after it.
 * 
 * @param {string} message - The error message text to display.
 * @param {number} linesAfter - The number of newlines to print after the message (default is 1).
 */
export function showError(message: string, linesAfter: number = 1): void {
  process.stderr.write(message)
  for (let i = 0; i < linesAfter; i++) {
    process.stderr.write('\n')
  }
}
