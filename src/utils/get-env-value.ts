import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

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