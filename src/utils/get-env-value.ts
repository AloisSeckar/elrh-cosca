import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Retrieves the value of an environment variable from a .env file.
 * 
 * @param {string} key - The name of the environment variable to retrieve.
 * @param {string} envFilePath - The path to the .env file (default is the .env file in the project root).
 * @returns {string | undefined} - The value of the environment variable, or undefined if not found.
 */
export function getEnvValue(
  key: string, envFilePath: string = resolve(process.cwd(), '.env')
): string | undefined {
  if (!existsSync(envFilePath)) {
    return undefined
  }

  const fileContent = readFileSync(envFilePath, 'utf-8')

  for (const line of fileContent.split(/\r?\n/)) {
    const trimmed = line.trim()

    // skip comments
    if (!trimmed || trimmed.startsWith('#')) continue

    // skip empty / invalid lines
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue

    const k = trimmed.substring(0, idx).trim()
    const v = trimmed.substring(idx + 1).trim()

    if (k === key) {
      // remove surrounding quotes
      return v.replace(/^['"]|['"]$/g, '')
    }
  }

  return undefined
}