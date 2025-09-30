import { resolve } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import { checkPath } from '../_private/check-path.js'

/**
 * Checks if a text file contains specified row.
 * 
 * @param {string} targetFile - The path to the text file to be checked (relative to CWD).
 * @param {string} row - The text row to be checked for existence.
 * @returns {boolean} True if the row exists in target file, false otherwise. Row must be matched completely, but surrounding whitespaces are ignored.
 * @throws Will throw an error if the path is invalid or the file does not exist.
 */
export function hasText(
    targetFile: string, row: string
): boolean {
    const check = checkPath(targetFile)
    if (!check.valid) {
        throw new Error(check.error)
    }

    const textFilePath = resolve(process.cwd(), targetFile)
    if (!existsSync(textFilePath)) {
        throw new Error(`No '${targetFile}' found in project root — cannot check its contents.`)
    }

    const textRaw = readFileSync(textFilePath, 'utf8')
    const lines = textRaw.split(/\r?\n/).map(line => line.trim())

    return lines.includes(row.trim())
}
