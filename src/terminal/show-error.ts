// prints message into stderr with specified number of newlines after it (default is 1)
export function showError(message: string, linesAfter: number = 1): void {
  process.stderr.write(message)
  for (let i = 0; i < linesAfter; i++) {
    process.stderr.write('\n')
  }
}
